// Chat and tool message types for admin UI and orchestrators

export type MessageRole = 'user' | 'system' | 'assistant' | 'tool'

export type ToolCall = {
  id: string
  function: {
    name: string
    arguments: string
  }
  type: 'function'
}

export type MessageContent = {
  type: 'image_url' | 'text'
  image_url?: { url: string }
  text?: string
}

export type Message = {
  role: MessageRole
  content: string | MessageContent[] | null
  name?: string
  tool_call_id?: string
  tool_calls?: ToolCall[]
}

