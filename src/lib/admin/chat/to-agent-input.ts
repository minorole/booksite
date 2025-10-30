import { user as msgUser, assistant as msgAssistant, system as msgSystem } from '@openai/agents-core'
import type { AgentInputItem } from '@openai/agents-core'
import type { Message } from '@/lib/admin/types'
import { ALLOWED_BOOK_FIELDS, UNSUPPORTED_FIELD_EXAMPLES } from '@/lib/admin/agents/constraints'

export function toAgentInput(
  messages: Message[],
  uiLanguage: import('@/lib/admin/i18n').UILanguage | undefined,
  extraSystemPrelude?: string
): AgentInputItem[] {
  const items: AgentInputItem[] = []
  const fallbackName = uiLanguage === 'zh' ? 'Chinese' : 'English'
  if (extraSystemPrelude && extraSystemPrelude.trim().length > 0) {
    items.push(msgSystem(extraSystemPrelude))
  }
  items.push(
    msgSystem(
      `When replying, mirror the language of the user's most recent message. If the language is unclear or there is no prior user text, default to ${fallbackName}. Preserve user-provided language/script when quoting content; do not translate quoted user text.`
    )
  )
  items.push(
    msgSystem(
      `When creating or updating listings, use only these fields: ${ALLOWED_BOOK_FIELDS.join(', ')}. Do not ask for or propose unsupported fields (e.g., ${UNSUPPORTED_FIELD_EXAMPLES.join(', ')}).`
    )
  )
  for (const m of messages) {
    if (m.role === 'system' && typeof m.content === 'string') {
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
            content.push({ type: 'input_image', image: url })
            content.push({ type: 'input_text', text: `image_url: ${url}` })
          }
        }
        if (content.length > 0) items.push(msgUser(content as unknown as Parameters<typeof msgUser>[0]))
      }
      continue
    }
    if (m.role === 'tool') {
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

