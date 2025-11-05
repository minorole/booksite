import { z } from 'zod';

// Canonical SSE event contract consumed by the Admin UI
// Mirrors NormalizedEvent union in normalize-agent-events.ts
export const AssistantDelta = z.object({
  type: z.literal('assistant_delta'),
  content: z.string(),
});

export const AssistantDone = z.object({
  type: z.literal('assistant_done'),
});

export const Handoff = z.object({
  type: z.literal('handoff'),
  to: z.string().optional(),
});

export const ToolStart = z.object({
  type: z.literal('tool_start'),
  id: z.string(),
  name: z.string(),
  args: z.unknown().optional(),
  startedAt: z.string(),
});

export const ToolResult = z.object({
  type: z.literal('tool_result'),
  id: z.string(),
  name: z.string(),
  success: z.boolean(),
  result: z.unknown(),
  finishedAt: z.string(),
});

export const ToolAppend = z.object({
  type: z.literal('tool_append'),
  message: z.object({
    role: z.literal('tool'),
    name: z.string().optional(),
    tool_call_id: z.string().optional(),
    content: z.string(),
  }),
});

export const SSEEvent = z.discriminatedUnion('type', [
  AssistantDelta,
  AssistantDone,
  Handoff,
  ToolStart,
  ToolResult,
  ToolAppend,
]);

export type SSEEvent = z.infer<typeof SSEEvent>;

// Route-level error envelope used by SSE stream on failure
export const RouteErrorEvent = z.object({
  version: z.literal('1'),
  request_id: z.string(),
  type: z.literal('error'),
  message: z.string(),
  tool: z.string().optional(),
  path: z.string().optional(),
});

export type RouteErrorEvent = z.infer<typeof RouteErrorEvent>;
