import { user as msgUser, assistant as msgAssistant, system as msgSystem, Runner } from '@openai/agents-core'
import { setDefaultOpenAIClient, setOpenAIAPI } from '@openai/agents'
import type { AgentInputItem } from '@openai/agents-core'
import { OpenAIProvider } from '@openai/agents-openai'
import type { Message } from '@/lib/admin/types'
import { createAgentRegistry } from '@/lib/admin/agents'
import { normalizeRunItemToSSEEvents, normalizeAgentUpdatedToSSEEvents } from '@/lib/admin/chat/normalize-agent-events'
import type { AgentContext } from '@/lib/admin/agents/tools'
import { ADMIN_AGENT_MAX_TURNS_DEFAULT } from '@/lib/admin/constants'
import { getModel } from '@/lib/openai/models'
import { logAdminAction } from '@/lib/db/admin'
import type { UILanguage } from '@/lib/admin/i18n'
import { adminAiLogsEnabled, adminAiSensitiveEnabled, adminAiVisionToolFallbackEnabled } from '@/lib/observability/toggle'
import { getAdminClient } from '@/lib/openai/client'

// Configure Agents SDK to use our OpenAI client and Responses API mode
try {
  setDefaultOpenAIClient(getAdminClient() as unknown as any)
  // Use Responses API for Agents
  setOpenAIAPI('responses')
} catch {}

type SSEWriter = (event: Record<string, unknown>) => void

function toAgentInput(
  messages: Message[],
  uiLanguage: UILanguage | undefined,
  extraSystemPrelude?: string
): AgentInputItem[] {
  const items: AgentInputItem[] = []
  // System prelude: mirror user's last-message language when possible; fall back to UI language
  // We don't limit languages; the model can respond in any language.
  const fallbackName = uiLanguage === 'zh' ? 'Chinese' : 'English'
  // Optional stricter prelude goes first to take precedence when present
  if (extraSystemPrelude && extraSystemPrelude.trim().length > 0) {
    items.push(msgSystem(extraSystemPrelude))
  }
  items.push(
    msgSystem(
      `When replying, mirror the language of the user's most recent message. If the language is unclear or there is no prior user text, default to ${fallbackName}. Preserve user-provided language/script when quoting content; do not translate quoted user text.`
    )
  )
  for (const m of messages) {
    if (m.role === 'system' && typeof m.content === 'string') {
      // Demote user-provided system prompts to input text to reduce injection risk
      items.push(msgUser(`[system-note-from-user] ${m.content}`))
      continue
    }
    if (m.role === 'assistant') {
      if (typeof m.content === 'string') {
        items.push(msgAssistant(m.content))
      }
      continue
    }
    if (m.role === 'user') {
      if (typeof m.content === 'string') {
        items.push(msgUser(m.content))
      } else if (Array.isArray(m.content)) {
        const content: Array<Record<string, unknown>> = []
        for (const c of m.content) {
          if (c.type === 'text') {
            content.push({ type: 'input_text', text: c.text })
          } else if (c.type === 'image_url' && c.image_url?.url) {
            const url = c.image_url.url
            // Provide both the image itself and an explicit text copy of the URL
            // so tools that require an `image_url` string can be called reliably.
            content.push({ type: 'input_image', image: url })
            content.push({ type: 'input_text', text: `image_url: ${url}` })
          }
        }
        if (content.length > 0) items.push(msgUser(content as unknown as Parameters<typeof msgUser>[0]))
      }
      continue
    }
    if (m.role === 'tool') {
      // Provide previous tool results as summarized user input for continuity across requests
      // Limit size to avoid context bloat
      const name = m.name || 'tool'
      let contentStr = ''
      if (typeof m.content === 'string') {
        const raw = m.content as string
        try {
          const obj = JSON.parse(raw)
          contentStr = JSON.stringify(obj).slice(0, 2000)
        } catch {
          contentStr = raw.slice(0, 2000)
        }
      }
      if (contentStr) {
        items.push(msgUser(`[previous ${name} result]: ${contentStr}`))
      }
      continue
    }
  }
  return items
}

export async function runChatWithAgentsStream(params: {
  messages: Message[]
  userEmail: string
  write: SSEWriter
  maxTurns?: number
  uiLanguage?: UILanguage
  requestId?: string
}): Promise<void> {
  const { messages, userEmail, write } = params
  const raw = process.env.AGENT_MAX_TURNS?.trim()
  const envMax = raw ? Number.parseInt(raw, 10) : NaN
  const maxTurns = Number.isFinite(envMax) && envMax > 0
    ? envMax
    : (params.maxTurns ?? ADMIN_AGENT_MAX_TURNS_DEFAULT)

  const provider = new OpenAIProvider()
  const registry = createAgentRegistry()
  const startAgent = registry.router

  const context: AgentContext = { userEmail, uiLanguage: params.uiLanguage }

  // Detect if the user provided any image input in this conversation turn
  const hasImage = Array.isArray(messages)
    && messages.some((m) => Array.isArray(m.content) && (m.content as any[]).some((c) => c && typeof c === 'object' && (c as any).type === 'image_url' && (c as any).image_url?.url))

  const model = getModel('text')
  const traceMeta: Record<string, string> = {
    route: '/api/admin/ai-chat/stream/orchestrated',
    userEmail,
    uiLanguage: params.uiLanguage || 'en',
  }
  if (params.requestId) traceMeta.request_id = params.requestId
  // Helper to run the agent once, with an optional stricter prelude
  const runOnce = async (extraPrelude?: string): Promise<{ ranDomainTool: boolean }> => {
    const runner = new Runner({
      modelProvider: provider,
      model,
      workflowName: 'Admin AI Chat',
      traceMetadata: traceMeta,
      // Default to redacting sensitive data unless explicitly enabled via env
      traceIncludeSensitiveData: adminAiSensitiveEnabled(),
    })
    const input = toAgentInput(messages, params.uiLanguage, extraPrelude)
    const stream = await runner.run(startAgent as unknown as Parameters<typeof runner.run>[0], input, {
      stream: true,
      context,
      maxTurns,
    })

    // Local state to suppress duplicate handoff events if the Agents SDK
    // emits multiple agent_updated events for the same target agent.
    let lastHandoffTo: string | undefined
    let ranDomainTool = false
    for await (const evt of stream as AsyncIterable<unknown>) {
      // Agent change
      const e = evt as { type?: string; agent?: { name?: string } }
      if (e.type === 'agent_updated_stream_event') {
        if (adminAiLogsEnabled()) {
          try { console.log('[AdminAI orchestrator] agent_updated', { to: e.agent?.name, req: params.requestId?.slice(0, 8) }) } catch {}
        }
        const current = e.agent?.name
        // Deduplicate: skip emitting a handoff if the target agent did not change
        if (current && current === lastHandoffTo) {
          continue
        }
        // Ignore handoff events without a concrete target name
        if (!current) continue
        lastHandoffTo = current
        const events = normalizeAgentUpdatedToSSEEvents({ agent: e.agent })
        for (const ne of events) write(ne as Record<string, unknown>)
        continue
      }

      if (e.type === 'run_item_stream_event') {
        const ev = evt as { name?: string; item?: { rawItem?: unknown } }
        const name = ev.name as string
        const item = ev.item
        const raw = (item as { rawItem?: unknown } | undefined)?.rawItem
        if (adminAiLogsEnabled()) {
          try { console.log('[AdminAI orchestrator] run_item', { name, req: params.requestId?.slice(0, 8) }) } catch {}
        }
        const events = normalizeRunItemToSSEEvents({ name, raw })
        // Optional diagnostics: if the SDK reports a message_* event but
        // no assistant text was extracted, log a compact shape preview.
        if (
          process.env.DEBUG_LOGS === '1' &&
          typeof name === 'string' && name.startsWith('message_') &&
          !events.some((e: any) => e && e.type === 'assistant_delta')
        ) {
          try {
            const summarize = (x: unknown): Record<string, unknown> => {
              if (!x || typeof x !== 'object') return { type: typeof x }
              const o = x as Record<string, unknown>
              const keys = Object.keys(o)
              const types: Record<string, string> = {}
              for (const k of keys.slice(0, 10)) {
                const v = o[k]
                const vt = typeof v === 'object' ? (Array.isArray(v) ? 'array' : 'object') : typeof v
                types[k] = vt
              }
              // Surface nested `.type` fields one level deep for hints
              const nestedTypes: Array<string> = []
              for (const k of keys.slice(0, 10)) {
                const v = o[k] as any
                if (v && typeof v === 'object') {
                  const t = (v as any).type
                  if (typeof t === 'string') nestedTypes.push(`${k}.type=${t}`)
                }
              }
              return { keys: keys.slice(0, 10), types, nestedTypes }
            }
            console.log('[AdminAI orchestrator] no_text_after_message_event', {
              name,
              shape: summarize(raw),
              req: params.requestId?.slice(0, 8),
            })
          } catch {}
        }
        for (const ne of events) {
          write(ne as Record<string, unknown>)
          // Track domain tool usage and audit logs
          if (ne.type === 'tool_start') {
            ranDomainTool = true
            try {
              await logAdminAction({ action: 'FUNCTION_CALL', admin_email: userEmail, metadata: { name: ne.name, args: ne.args, call_id: ne.id } })
            } catch (e) {
              console.error('logAdminAction failed (FUNCTION_CALL)', e)
            }
          } else if (ne.type === 'tool_result') {
            ranDomainTool = true
            try {
              await logAdminAction({ action: 'FUNCTION_SUCCESS', admin_email: userEmail, metadata: { name: ne.name, call_id: ne.id, result: typeof ne.result === 'string' ? ne.result : '[json]' } })
            } catch (e) {
              console.error('logAdminAction failed (FUNCTION_SUCCESS)', e)
            }
          } else if (ne.type === 'assistant_delta') {
            if (adminAiLogsEnabled()) {
              try {
                const txt = (ne as unknown as { content?: string }).content || ''
                console.log('[AdminAI orchestrator] assistant_delta', { req: params.requestId?.slice(0, 8), len: txt.length, preview: txt.slice(0, 80) })
              } catch {}
            }
          }
        }
      }
      // Optional diagnostics for unexpected events
      else {
        if (process.env.DEBUG_LOGS === '1') {
          try {
            console.log('[AdminAI orchestrator] Unhandled agent stream event', e?.type ?? '(unknown)', evt)
          } catch {}
        }
      }
    }
    return { ranDomainTool }
  }

  try {
    // First pass
    const first = await runOnce()
    // Fallback: if this is a vision-style query (has image) but no domain tools ran,
    // re-run once with a strict tool-first prelude.
    if (adminAiVisionToolFallbackEnabled() && hasImage && !first.ranDomainTool) {
      if (adminAiLogsEnabled()) {
        try { console.log('[AdminAI orchestrator] fallback_rerun', { req: params.requestId?.slice(0, 8) }) } catch {}
      }
      const strictPrelude = [
        'Tool-first execution required for images.',
        'When an image or an "image_url:" text is present about a book, you MUST:',
        '1) Call analyze_book_cover with stage="initial" using the most recent image_url;',
        '2) Then call analyze_book_cover with stage="structured" with concise confirmed_info;',
        '3) Then call check_duplicates with extracted fields and cover_image;',
        'Only after these tool calls complete, produce a brief assistant message. Do not skip tools.',
      ].join(' ')
      await runOnce(strictPrelude)
    }
  } finally {
    write({ type: 'assistant_done' })
  }
}
