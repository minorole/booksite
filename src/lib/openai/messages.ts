import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions'
import type { Message } from '@/lib/admin/types'

export function toOpenAIMessage(message: Message): ChatCompletionMessageParam {
  if (Array.isArray(message.content)) {
    return {
      role: message.role,
      content: message.content.map((c) =>
        c.type === 'text'
          ? { type: 'text', text: c.text }
          : c.type === 'image_url' && c.image_url
          ? { type: 'image_url', image_url: { url: c.image_url.url } }
          : (c as any)
      ),
      ...(message.name && { name: message.name }),
      ...(message.tool_call_id && { tool_call_id: message.tool_call_id }),
    } as ChatCompletionMessageParam
  }

  if (message.role === 'tool') {
    return {
      role: 'tool',
      content: (message.content || '') as string,
      ...(message.tool_call_id && { tool_call_id: message.tool_call_id }),
      ...(message.name && { name: message.name }),
    } as ChatCompletionMessageParam
  }

  return {
    role: message.role,
    content: (message.content || '') as string,
    ...(message.name && { name: message.name }),
    ...(message.tool_call_id && { tool_call_id: message.tool_call_id }),
  } as ChatCompletionMessageParam
}

export function toOpenAIMessages(messages: Message[]): ChatCompletionMessageParam[] {
  return messages.map(toOpenAIMessage)
}

