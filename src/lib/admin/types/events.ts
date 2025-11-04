// UI-consumed SSE event types (versioned)

export type SSEEventBase = {
  version?: '1';
  request_id?: string;
};

export type HandoffEvent = SSEEventBase & {
  type: 'handoff';
  to: string | undefined;
};

export type AssistantDeltaEvent = SSEEventBase & {
  type: 'assistant_delta';
  content: string;
};

export type AssistantDoneEvent = SSEEventBase & {
  type: 'assistant_done';
};

export type ToolStartEvent = SSEEventBase & {
  type: 'tool_start';
  id: string;
  name: string;
  args?: unknown;
  startedAt: string;
};

export type ToolResultEvent = SSEEventBase & {
  type: 'tool_result';
  id: string;
  name: string;
  success: boolean;
  result: unknown;
  finishedAt: string;
};

export type ToolAppendEvent = SSEEventBase & {
  type: 'tool_append';
  message: { role: 'tool'; name?: string; tool_call_id?: string; content: string };
};

export type ErrorEvent = SSEEventBase & {
  type: 'error';
  message: string;
};

export type SSEEvent =
  | HandoffEvent
  | AssistantDeltaEvent
  | AssistantDoneEvent
  | ToolStartEvent
  | ToolResultEvent
  | ToolAppendEvent
  | ErrorEvent;

// Runtime type guards and parser for SSE events (v1)
function isObj(x: unknown): x is Record<string, unknown> {
  return typeof x === 'object' && x !== null;
}

function isString(x: unknown): x is string {
  return typeof x === 'string';
}

function hasVersionOk(x: Record<string, unknown>): boolean {
  if (!('version' in x)) return true;
  const v = x.version;
  return v === '1';
}

export function isSSEEvent(x: unknown): x is SSEEvent {
  if (!isObj(x)) return false;
  if (!hasVersionOk(x)) return false;
  const t = x.type;
  if (!isString(t)) return false;
  switch (t) {
    case 'handoff':
      return 'to' in x && (isString((x as any).to) || (x as any).to === undefined);
    case 'assistant_delta':
      return isString((x as any).content);
    case 'assistant_done':
      return true;
    case 'tool_start':
      return isString((x as any).id) && isString((x as any).name) && isString((x as any).startedAt);
    case 'tool_result':
      return (
        isString((x as any).id) &&
        isString((x as any).name) &&
        typeof (x as any).success === 'boolean' &&
        'result' in x &&
        isString((x as any).finishedAt)
      );
    case 'tool_append':
      return (
        isObj((x as any).message) &&
        (x as any).message.role === 'tool' &&
        isString((x as any).message.content)
      );
    case 'error':
      return isString((x as any).message);
    default:
      return false;
  }
}

export function parseSSEEvent(input: unknown): SSEEvent | null {
  try {
    // Accept already-parsed objects or JSON strings
    const obj = typeof input === 'string' ? (JSON.parse(input) as unknown) : input;
    if (isSSEEvent(obj)) return obj;
    return null;
  } catch {
    return null;
  }
}
