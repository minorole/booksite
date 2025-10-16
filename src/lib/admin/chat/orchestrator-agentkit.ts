import { user as msgUser, assistant as msgAssistant, system as msgSystem, Runner } from '@openai/agents-core'
import type { AgentInputItem } from '@openai/agents-core'
import { OpenAIProvider } from '@openai/agents-openai'
import type { Message } from '@/lib/admin/types'
import { createAgentRegistry } from '@/lib/admin/agents'
import type { AgentContext } from '@/lib/admin/agents/tools'
import { getModel } from '@/lib/openai/models'
import { logAdminAction } from '@/lib/db/admin'

type SSEWriter = (event: any) => void

function toAgentInput(messages: Message[]): AgentInputItem[] {
  const items: AgentInputItem[] = []
  for (const m of messages) {
    if (m.role === 'system' && typeof m.content === 'string') {
      // We generally rely on agent instructions; include user-provided system for completeness
      items.push(msgSystem(m.content))
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
        const content: any[] = []
        for (const c of m.content) {
          if (c.type === 'text') content.push({ type: 'input_text', text: c.text })
          else if (c.type === 'image_url' && c.image_url?.url)
            content.push({ type: 'input_image', image: c.image_url.url })
        }
        if (content.length > 0) items.push(msgUser(content))
      }
      continue
    }
    // ignore 'tool' role; AgentKit will record tools internally
  }
  return items
}

export async function runChatWithAgentsStream(params: {
  messages: Message[]
  userEmail: string
  write: SSEWriter
  maxTurns?: number
}): Promise<void> {
  const { messages, userEmail, write, maxTurns = 5 } = params

  const provider = new OpenAIProvider()
  const registry = createAgentRegistry()
  const startAgent = registry.router

  const context: AgentContext = { userEmail }
  const input = toAgentInput(messages)

  const model = getModel('text')
  const runner = new Runner({ modelProvider: provider, model })
  const stream = await runner.run(startAgent as any, input, {
    stream: true,
    context,
    maxTurns,
  })

  try {
    for await (const evt of stream) {
      // Agent change
      if ((evt as any).type === 'agent_updated_stream_event') {
        const agent = (evt as any).agent
        write({ type: 'handoff', to: agent?.name })
        continue
      }

      if ((evt as any).type === 'run_item_stream_event') {
        const name = (evt as any).name as string
        const item = (evt as any).item
        if (name === 'message_output_created') {
          const content = item?.rawItem?.content
          if (Array.isArray(content)) {
            for (const seg of content) {
              if (seg?.type === 'output_text' && typeof seg.text === 'string') {
                write({ type: 'assistant_delta', content: seg.text })
              }
            }
          }
        } else if (name === 'tool_called') {
          const call = item?.rawItem
          if (call?.type === 'function_call') {
            write({ type: 'tool_start', id: call.callId || call.id, name: call.name, args: call.arguments, startedAt: new Date().toISOString() })
            // Audit log: function call
            try {
              await logAdminAction({ action: 'FUNCTION_CALL', admin_email: userEmail, metadata: { name: call.name, args: call.arguments, call_id: call.callId || call.id } })
            } catch {}
          }
        } else if (name === 'tool_output') {
          const out = item?.rawItem
          if (out?.type === 'function_call_result') {
            let payload: any = null
            if (out.output?.type === 'text') {
              payload = out.output.text
            } else if (out.output?.type === 'json') {
              payload = out.output.json
            } else if (out.output && typeof out.output === 'object') {
              // Fallback: attempt to serialize unknown structured payloads
              payload = out.output
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
