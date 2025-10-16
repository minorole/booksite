// UI-consumed SSE event types (versioned)

export type SSEEventBase = {
  version?: '1'
  request_id?: string
}

export type HandoffEvent = SSEEventBase & {
  type: 'handoff'
  to: string | undefined
}

export type AssistantDeltaEvent = SSEEventBase & {
  type: 'assistant_delta'
  content: string
}

export type AssistantDoneEvent = SSEEventBase & {
  type: 'assistant_done'
}

export type ToolStartEvent = SSEEventBase & {
  type: 'tool_start'
  id: string
  name: string
  args?: unknown
  startedAt: string
}

export type ToolResultEvent = SSEEventBase & {
  type: 'tool_result'
  id: string
  name: string
  success: boolean
  result: unknown
  finishedAt: string
}

export type ToolAppendEvent = SSEEventBase & {
  type: 'tool_append'
  message: { role: 'tool'; name?: string; tool_call_id?: string; content: string }
}

export type ErrorEvent = SSEEventBase & {
  type: 'error'
  message: string
}

export type SSEEvent =
  | HandoffEvent
  | AssistantDeltaEvent
  | AssistantDoneEvent
  | ToolStartEvent
  | ToolResultEvent
  | ToolAppendEvent
  | ErrorEvent

