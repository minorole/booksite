// Normalization helpers to adapt OpenAI Agents SDK stream items
// into our stable SSE event contract consumed by the admin UI.

export type NormalizedEvent =
  | { type: 'assistant_delta'; content: string }
  | { type: 'assistant_done' }
  | { type: 'handoff'; to?: string }
  | { type: 'tool_start'; id: string; name: string; args?: unknown; startedAt: string }
  | {
      type: 'tool_result';
      id: string;
      name: string;
      success: boolean;
      result: unknown;
      finishedAt: string;
    }
  | {
      type: 'tool_append';
      message: { role: 'tool'; name?: string; tool_call_id?: string; content: string };
    };

// Only surface results for our first-party domain tools. Ignore internal routing
// or SDK-internal function calls to prevent noisy transcript messages.
import { getDomainToolNames } from '@/lib/admin/agents/tools';

function isObject(x: unknown): x is Record<string, unknown> {
  return typeof x === 'object' && x !== null;
}

function isString(x: unknown): x is string {
  return typeof x === 'string';
}

// Extract assistant text pieces from a variety of Agent SDK shapes.
// Shapes observed in practice:
// - { content: [{ type: 'output_text', text: '...' }, { type: 'output_text', text: '...' }] }
// - { type: 'output_text.delta', delta: '...' }
// - { type: 'output_text', text: '...' }
// - { delta: { type: 'output_text.delta', delta: '...' } }
export function extractAssistantTextDeltas(raw: unknown): string[] {
  const pieces: string[] = [];
  const add = (v: unknown) => {
    if (typeof v === 'string' && v) pieces.push(v);
  };

  if (!isObject(raw)) return pieces;

  // Fast paths for the most common shapes
  if (Array.isArray((raw as any).content)) {
    for (const seg of (raw as any).content as unknown[]) {
      if (!isObject(seg)) continue;
      const t = (seg as any).type;
      if (isString(t) && t.includes('output_text')) {
        add((seg as any).text ?? (seg as any).delta ?? (seg as any).textDelta);
      }
    }
  }
  if (isString((raw as any).type) && (raw as any).type.includes('output_text')) {
    add((raw as any).delta ?? (raw as any).text ?? (raw as any).textDelta);
  }
  if (isObject((raw as any).delta)) {
    const d = (raw as any).delta;
    if (isString((d as any).type) && (d as any).type.includes('output_text')) {
      add((d as any).delta ?? (d as any).text ?? (d as any).textDelta);
    }
  }

  if (pieces.length > 0) return pieces;

  // Long-term resilience: perform a conservative deep scan to find
  // any nodes that look like output_text or output_text.delta segments.
  const MAX_NODES = 5000;
  let visited = 0;
  // Use a queue (BFS) to preserve left-to-right order found in arrays
  const queue: unknown[] = [raw];
  while (queue.length > 0 && visited < MAX_NODES) {
    const cur = queue.shift();
    visited++;
    if (!cur || typeof cur !== 'object') continue;
    const obj = cur as Record<string, unknown>;

    // If this node advertises an output_text type, try to read text-like fields
    const t = obj.type;
    if (isString(t) && t.includes('output_text')) {
      add((obj as any).delta ?? (obj as any).text ?? (obj as any).textDelta);
    }

    // Traverse children (arrays and objects). We intentionally traverse broadly
    // but only collect when `type` matches, to avoid false positives.
    for (const v of Object.values(obj)) {
      if (!v) continue;
      if (Array.isArray(v)) {
        for (const it of v) queue.push(it);
      } else if (typeof v === 'object') {
        queue.push(v);
      }
    }
  }

  return pieces;
}

// Normalize any non-tool run item event to assistant_delta events.
// Expects an input with shape: { name?: string; raw?: unknown }
export function normalizeRunItemToAssistantEvents(input: {
  name?: string;
  raw?: unknown;
}): NormalizedEvent[] {
  const { name, raw } = input;
  // We only handle assistant text for non-tool events here.
  if (name === 'tool_called' || name === 'tool_output') return [];
  const deltas = extractAssistantTextDeltas(raw);
  return deltas.map((content) => ({ type: 'assistant_delta', content }));
}

// Fully normalize any run_item_stream_event to our SSE events, including tool events.
export function normalizeRunItemToSSEEvents(input: {
  name?: string;
  raw?: unknown;
}): NormalizedEvent[] {
  const { name, raw } = input;
  if (name === 'tool_called') {
    const call = raw as any as {
      type?: string;
      callId?: string;
      id?: string;
      name?: string;
      arguments?: unknown;
    };
    if (call && call.type === 'function_call') {
      // Filter: only emit tool_start for known domain tools
      if (!call.name || !getDomainToolNames().has(call.name)) return [];
      return [
        {
          type: 'tool_start',
          id: (call.callId || call.id) as string,
          name: call.name as string,
          args: call.arguments,
          startedAt: new Date().toISOString(),
        },
      ];
    }
    return [];
  }
  if (name === 'tool_output') {
    const out = raw as any as { type?: string; output?: unknown; callId?: string; name?: string };
    if (out?.type === 'function_call_result') {
      // Filter: only emit results for known domain tools
      if (!out.name || !getDomainToolNames().has(out.name)) return [];
      let payload: unknown = null;
      const output = out.output as { type?: string; text?: string; json?: unknown } | unknown;
      if (typeof output === 'object' && output && 'type' in (output as any)) {
        const o = output as { type?: string; text?: string; json?: unknown };
        if (o.type === 'text') payload = o.text;
        else if (o.type === 'json') payload = o.json;
        else payload = output;
      } else if (output && typeof output === 'object') {
        payload = output;
      } else {
        payload = '[binary]';
      }

      const isObject = typeof payload === 'object' && payload !== null;
      const envelope = isObject ? (payload as Record<string, unknown>) : null;
      const unwrapped = envelope && 'data' in envelope ? (envelope.data as unknown) : payload;
      const successFlag =
        envelope && typeof envelope.success === 'boolean' ? (envelope.success as boolean) : true;

      const events: NormalizedEvent[] = [
        {
          type: 'tool_result',
          id: out.callId as string,
          name: out.name as string,
          success: successFlag,
          result: unwrapped,
          finishedAt: new Date().toISOString(),
        },
      ];
      // Also append a synthetic tool message for the chat transcript
      const contentStr =
        typeof payload === 'string' ? (payload as string) : JSON.stringify(payload);
      events.push({
        type: 'tool_append',
        message: {
          role: 'tool',
          name: out.name as string,
          tool_call_id: out.callId as string,
          content: contentStr,
        },
      });
      return events;
    }
    return [];
  }
  // Fallback: assistant text
  return normalizeRunItemToAssistantEvents(input);
}

// Normalize agent_updated_stream_event to a handoff SSE event.
export function normalizeAgentUpdatedToSSEEvents(input: {
  agent?: { name?: string } | null | undefined;
}): NormalizedEvent[] {
  const name = input?.agent?.name;
  return [{ type: 'handoff', to: name }];
}
