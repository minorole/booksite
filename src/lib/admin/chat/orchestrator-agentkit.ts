import { Runner } from '@openai/agents-core';
import { setDefaultOpenAIClient, setOpenAIAPI } from '@openai/agents';
import { OpenAIProvider } from '@openai/agents-openai';
import type { Message } from '@/lib/admin/types';
import { createAgentRegistry } from '@/lib/admin/agents';
import {
  normalizeRunItemToSSEEvents,
  normalizeAgentUpdatedToSSEEvents,
} from '@/lib/admin/chat/normalize-agent-events';
import type { AgentContext } from '@/lib/admin/agents/tools';
import { ADMIN_AGENT_MAX_TURNS_DEFAULT } from '@/lib/admin/constants';
import { getModel } from '@/lib/openai/models';
import { logAdminAction } from '@/lib/db/admin';
import type { UILanguage } from '@/lib/admin/i18n';
import {
  adminAiLogsEnabled,
  adminAiSensitiveEnabled,
  debugLogsEnabled,
} from '@/lib/observability/toggle';
import { log } from '@/lib/logging';
import { getAdminClient } from '@/lib/openai/client';
import { toAgentInput } from '@/lib/admin/chat/to-agent-input';
import { logRawModelEventCompact, type RawModelLogState } from '@/lib/admin/chat/logging';

// Configure Agents SDK to use our OpenAI client and Responses API mode
try {
  setDefaultOpenAIClient(getAdminClient('text') as unknown as any);
  // Use Responses API for Agents
  setOpenAIAPI('responses');
} catch {}

type SSEWriter = (event: Record<string, unknown>) => void;

export async function runChatWithAgentsStream(params: {
  messages: Message[];
  userEmail: string;
  write: SSEWriter;
  maxTurns?: number;
  uiLanguage?: UILanguage;
  requestId?: string;
  onMetrics?: (m: { turns?: number; toolCalls?: number; handoffs?: number }) => void;
}): Promise<void> {
  const { messages, userEmail, write } = params;
  const raw = process.env.AGENT_MAX_TURNS?.trim();
  const envMax = raw ? Number.parseInt(raw, 10) : NaN;
  const maxTurns =
    Number.isFinite(envMax) && envMax > 0
      ? envMax
      : (params.maxTurns ?? ADMIN_AGENT_MAX_TURNS_DEFAULT);

  const provider = new OpenAIProvider();
  const registry = createAgentRegistry();
  const startAgent = registry.router;

  const context: AgentContext = { userEmail, uiLanguage: params.uiLanguage };

  // Detect if the user provided any image input in this conversation turn
  const hasImage =
    Array.isArray(messages) &&
    messages.some(
      (m) =>
        Array.isArray(m.content) &&
        (m.content as any[]).some(
          (c) =>
            c &&
            typeof c === 'object' &&
            (c as any).type === 'image_url' &&
            (c as any).image_url?.url,
        ),
    );

  const model = getModel('text');
  // Aggregate run metrics (approximate): number of processed items, tool calls, and handoffs
  let turns = 0;
  let toolCalls = 0;
  let handoffs = 0;
  const report = () => {
    try {
      params.onMetrics?.({ turns, toolCalls, handoffs });
    } catch {}
  };
  const traceMeta: Record<string, string> = {
    route: '/api/admin/ai-chat/stream/orchestrated',
    userEmail,
    uiLanguage: params.uiLanguage || 'en',
  };
  if (params.requestId) traceMeta.request_id = params.requestId;
  // Helper to run the agent once, with an optional stricter prelude
  const runOnce = async (extraPrelude?: string): Promise<{ ranDomainTool: boolean }> => {
    const runner = new Runner({
      modelProvider: provider,
      model,
      workflowName: 'Admin AI Chat',
      traceMetadata: traceMeta,
      // Include sensitive data in traces by default; can be disabled via env
      traceIncludeSensitiveData: adminAiSensitiveEnabled(),
    });
    const input = toAgentInput(messages, params.uiLanguage, extraPrelude);
    const stream = await runner.run(
      startAgent as unknown as Parameters<typeof runner.run>[0],
      input,
      {
        stream: true,
        context,
        maxTurns,
      },
    );

    // Local state to suppress duplicate handoff events if the Agents SDK
    // emits multiple agent_updated events for the same target agent.
    let lastHandoffTo: string | undefined;
    let ranDomainTool = false;
    // Compact raw model logging state
    const rawState: RawModelLogState = {
      argBytes: new Map(),
      seen: new Set(),
      toolNames: new Map(),
    };
    // Aggregate assistant text logs: preview once, total char count across the run
    let assistantLoggedFirstPreview = false;
    let assistantFirstPreview = '';
    let assistantChars = 0;
    // Track tool durations between start/result
    const toolStartAt = new Map<string, number>();
    for await (const evt of stream as AsyncIterable<unknown>) {
      // Agent change
      const e = evt as { type?: string; agent?: { name?: string } };
      if (e.type === 'agent_updated_stream_event') {
        if (adminAiLogsEnabled()) {
          try { log.info('admin_ai_orchestrator', 'agent_updated', { to: e.agent?.name }) } catch {}
        }
        const current = e.agent?.name;
        // Deduplicate: skip emitting a handoff if the target agent did not change
        if (current && current === lastHandoffTo) {
          continue;
        }
        // Ignore handoff events without a concrete target name
        if (!current) continue;
        lastHandoffTo = current;
        handoffs += 1;
        report();
        const events = normalizeAgentUpdatedToSSEEvents({ agent: e.agent });
        for (const ne of events) write(ne as Record<string, unknown>);
        continue;
      }

      if (e.type === 'run_item_stream_event') {
        turns += 1;
        report();
        const ev = evt as { name?: string; item?: { rawItem?: unknown } };
        const name = ev.name as string;
        const item = ev.item;
        const raw = (item as { rawItem?: unknown } | undefined)?.rawItem;
        if (adminAiLogsEnabled()) {
          try { log.info('admin_ai_orchestrator', 'run_item', { name }) } catch {}
        }
        const events = normalizeRunItemToSSEEvents({ name, raw });
        // Optional diagnostics: if the SDK reports a message_* event but
        // no assistant text was extracted, log a compact shape preview.
        if (
          debugLogsEnabled() &&
          typeof name === 'string' &&
          name.startsWith('message_') &&
          !events.some((e: any) => e && e.type === 'assistant_delta')
        ) {
          try {
            const summarize = (x: unknown): Record<string, unknown> => {
              if (!x || typeof x !== 'object') return { type: typeof x };
              const o = x as Record<string, unknown>;
              const keys = Object.keys(o);
              const types: Record<string, string> = {};
              for (const k of keys.slice(0, 10)) {
                const v = o[k];
                const vt =
                  typeof v === 'object' ? (Array.isArray(v) ? 'array' : 'object') : typeof v;
                types[k] = vt;
              }
              const nestedTypes: Array<string> = [];
              for (const k of keys.slice(0, 10)) {
                const v = o[k] as any;
                if (v && typeof v === 'object') {
                  const t = (v as any).type;
                  if (typeof t === 'string') nestedTypes.push(`${k}.type=${t}`);
                }
              }
              return { keys: keys.slice(0, 10), types, nestedTypes };
            };
            log.debug('admin_ai_orchestrator', 'no_text_after_message_event', {
              name,
              shape: summarize(raw),
            });
          } catch {}
        }
        for (const ne of events) {
          write(ne as Record<string, unknown>);
          // Track domain tool usage and audit logs
          if (ne.type === 'tool_start') {
            ranDomainTool = true;
            toolCalls += 1;
            report();
            const argsBytes = (() => {
              try {
                return JSON.stringify(ne.args ?? {}).length;
              } catch {
                return 0;
              }
            })();
            try {
              toolStartAt.set(ne.id, Date.now());
            } catch {}
            if (adminAiLogsEnabled()) {
              try { log.info('admin_ai_orchestrator', 'tool_start', { name: ne.name, id: ne.id, argsBytes }) } catch {}
            }
            try {
              await logAdminAction({
                action: 'FUNCTION_CALL',
                admin_email: userEmail,
                metadata: { name: ne.name, args: ne.args, call_id: ne.id },
              });
            } catch (e) {
              console.error('logAdminAction failed (FUNCTION_CALL)', e);
            }
          } else if (ne.type === 'tool_result') {
            ranDomainTool = true;
            const started = toolStartAt.get(ne.id);
            const durationMs =
              typeof started === 'number' ? Math.max(0, Date.now() - started) : undefined;
            if (adminAiLogsEnabled()) {
              try { log.info('admin_ai_orchestrator', 'tool_result', { name: ne.name, id: ne.id, success: ne.success, durationMs }) } catch {}
            }
            try {
              await logAdminAction({
                action: 'FUNCTION_SUCCESS',
                admin_email: userEmail,
                metadata: {
                  name: ne.name,
                  call_id: ne.id,
                  result: typeof ne.result === 'string' ? ne.result : '[json]',
                },
              });
            } catch (e) {
              console.error('logAdminAction failed (FUNCTION_SUCCESS)', e);
            }
          } else if (ne.type === 'assistant_delta') {
            if (adminAiLogsEnabled()) {
              try {
                const txt = (ne as unknown as { content?: string }).content || '';
                // Aggregate chars and log a single early preview
                if (!assistantLoggedFirstPreview && txt) {
                  assistantFirstPreview = txt.slice(0, 80);
                  log.info('admin_ai_orchestrator', 'assistant_preview', { len: txt.length, preview: assistantFirstPreview });
                  assistantLoggedFirstPreview = true;
                }
                assistantChars += txt.length;
              } catch {}
            }
          }
        }
      }
      // Optional diagnostics for unexpected events
      else {
        // Compact, structured logging for raw model events; avoid full dumps
        if ((evt as any)?.type === 'raw_model_stream_event') {
          logRawModelEventCompact(evt, params.requestId, rawState);
        } else if (adminAiLogsEnabled()) {
          const t = (e?.type as string | undefined) || '(unknown)';
          log.debug('admin_ai_orchestrator', 'event', { type: t });
        }
      }
    }
    // Emit a single summary for assistant text collected during this run
    if (adminAiLogsEnabled()) {
      try {
        if (assistantChars > 0) {
          log.info('admin_ai_orchestrator', 'assistant_text_collected', {
            totalChars: assistantChars,
            preview: assistantFirstPreview,
          });
        }
      } catch {}
    }
    return { ranDomainTool };
  };

  // Single pass only (no fallback rerun). Success emits completion; errors handled by route.
  // First pass
  await runOnce();
  // Count this completed run as one turn and report
  turns += 1;
  report();
  // Success: emit completion only on success
  write({ type: 'assistant_done' });
}
