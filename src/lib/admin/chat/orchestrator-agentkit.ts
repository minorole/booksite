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
import { adminAiLogsEnabled, adminAiSensitiveEnabled } from '@/lib/observability/toggle'
import { getAdminClient } from '@/lib/openai/client'

// Configure Agents SDK to use our OpenAI client and API mode
try {
  setDefaultOpenAIClient(getAdminClient() as unknown as any)
  // Default to Responses API for Agents; allow explicit opt-out via OPENAI_USE_RESPONSES=0
  const apiMode = process.env.OPENAI_USE_RESPONSES === '0' ? 'chat_completions' : 'responses'
  setOpenAIAPI(apiMode as 'responses' | 'chat_completions')
} catch {}

type SSEWriter = (event: Record<string, unknown>) => void

function toAgentInput(messages: Message[], uiLanguage: UILanguage | undefined): AgentInputItem[] {
  const items: AgentInputItem[] = []
  // System prelude: mirror user's last-message language when possible; fall back to UI language
  // We don't limit languages; the model can respond in any language.
  const fallbackName = uiLanguage === 'zh' ? 'Chinese' : 'English'
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
  const input = toAgentInput(messages, params.uiLanguage)

  const model = getModel('text')
  const traceMeta: Record<string, string> = {
    route: '/api/admin/ai-chat/stream/orchestrated',
    userEmail,
    uiLanguage: params.uiLanguage || 'en',
  }
  if (params.requestId) traceMeta.request_id = params.requestId
  const runner = new Runner({
    modelProvider: provider,
    model,
    workflowName: 'Admin AI Chat',
    traceMetadata: traceMeta,
    // Default to redacting sensitive data unless explicitly enabled via env
    traceIncludeSensitiveData: adminAiSensitiveEnabled(),
  })
  const stream = await runner.run(startAgent as unknown as Parameters<typeof runner.run>[0], input, {
    stream: true,
    context,
    maxTurns,
  })

  try {
    // Local state to suppress duplicate handoff events if the Agents SDK
    // emits multiple agent_updated events for the same target agent.
    let lastHandoffTo: string | undefined
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
          // Audit logs based on normalized events
          if (ne.type === 'tool_start') {
            try {
              await logAdminAction({ action: 'FUNCTION_CALL', admin_email: userEmail, metadata: { name: ne.name, args: ne.args, call_id: ne.id } })
            } catch (e) {
              console.error('logAdminAction failed (FUNCTION_CALL)', e)
            }
          } else if (ne.type === 'tool_result') {
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
  } finally {
    write({ type: 'assistant_done' })
  }
}
