import { user as msgUser, assistant as msgAssistant, system as msgSystem, Runner } from '@openai/agents-core'
import type { AgentInputItem } from '@openai/agents-core'
import { OpenAIProvider } from '@openai/agents-openai'
import type { Message } from '@/lib/admin/types'
import { createAgentRegistry } from '@/lib/admin/agents'
import type { AgentContext } from '@/lib/admin/agents/tools'
import { getModel } from '@/lib/openai/models'
import { logAdminAction } from '@/lib/db/admin'
import type { UILanguage } from '@/lib/admin/i18n'

type SSEWriter = (event: Record<string, unknown>) => void

function toAgentInput(messages: Message[], uiLanguage: UILanguage | undefined): AgentInputItem[] {
  const items: AgentInputItem[] = []
  // Prepend a small, controlled system prelude to mirror UI language and extraction hints
  const lang = uiLanguage === 'zh' ? 'Chinese' : 'English'
  items.push(
    msgSystem(
      `UI language: ${uiLanguage || 'en'}. Reply in ${lang}. When extracting text from images or content, preserve original language/script and do not translate user-provided content.`
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
          if (c.type === 'text') content.push({ type: 'input_text', text: c.text })
          else if (c.type === 'image_url' && c.image_url?.url)
            content.push({ type: 'input_image', image: c.image_url.url })
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
  const envMax = Number.parseInt(process.env.AGENT_MAX_TURNS || '')
  const maxTurns = Number.isFinite(envMax) ? envMax : (params.maxTurns ?? 12)

  const provider = new OpenAIProvider()
  const registry = createAgentRegistry()
  const startAgent = registry.router

  const context: AgentContext = { userEmail, uiLanguage: params.uiLanguage }
  const input = toAgentInput(messages, params.uiLanguage)

  const model = getModel('text')
  const runner = new Runner({ modelProvider: provider, model })
  const stream = await runner.run(startAgent as unknown as Parameters<typeof runner.run>[0], input, {
    stream: true,
    context,
    maxTurns,
  })

  try {
    for await (const evt of stream as AsyncIterable<unknown>) {
      // Agent change
      const e = evt as { type?: string; agent?: { name?: string } }
      if (e.type === 'agent_updated_stream_event') {
        const agent = e.agent
        write({ type: 'handoff', to: agent?.name })
        continue
      }

      if (e.type === 'run_item_stream_event') {
        const ev = evt as { name?: string; item?: { rawItem?: unknown } }
        const name = ev.name as string
        const item = ev.item
        if (name === 'message_output_created') {
          const content = (item as { rawItem?: { content?: unknown } } | undefined)?.rawItem?.content as unknown
          if (Array.isArray(content)) {
            for (const seg of content) {
              const s = seg as { type?: string; text?: string }
              if (s?.type === 'output_text' && typeof s.text === 'string') {
                write({ type: 'assistant_delta', content: s.text })
              }
            }
          }
        } else if (name === 'tool_called') {
          const call = (item as { rawItem?: unknown } | undefined)?.rawItem as { type?: string; callId?: string; id?: string; name?: string; arguments?: unknown } | undefined
          if (call?.type === 'function_call') {
            write({ type: 'tool_start', id: call.callId || call.id, name: call.name, args: call.arguments, startedAt: new Date().toISOString() })
            // Audit log: function call
            try {
              await logAdminAction({ action: 'FUNCTION_CALL', admin_email: userEmail, metadata: { name: call.name, args: call.arguments, call_id: call.callId || call.id } })
            } catch {}
          }
        } else if (name === 'tool_output') {
          const out = (item as { rawItem?: unknown } | undefined)?.rawItem as { type?: string; output?: unknown; callId?: string; name?: string } | undefined
          if (out?.type === 'function_call_result') {
            let payload: unknown = null
            const output = out.output as { type?: string; text?: string; json?: unknown } | unknown
            if (typeof output === 'object' && output && 'type' in output) {
              const o = output as { type?: string; text?: string; json?: unknown }
              if (o.type === 'text') payload = o.text
              else if (o.type === 'json') payload = o.json
              else payload = output
            } else if (output && typeof output === 'object') {
              payload = output
            } else {
              payload = '[binary]'
            }
            write({ type: 'tool_result', id: out.callId, name: out.name, success: true, result: payload, finishedAt: new Date().toISOString() })
            // Audit log: function success
            try {
              await logAdminAction({ action: 'FUNCTION_SUCCESS', admin_email: userEmail, metadata: { name: out.name, call_id: out.callId, result: typeof payload === 'string' ? payload : '[json]' } })
            } catch {}
            // Also append a synthetic tool message for the UI with JSON string content when applicable
            const contentStr = typeof payload === 'string' ? payload : JSON.stringify(payload)
            write({ type: 'tool_append', message: { role: 'tool', name: out.name, tool_call_id: out.callId, content: contentStr } })
          }
        }
      }
    }
  } finally {
    write({ type: 'assistant_done' })
  }
}
