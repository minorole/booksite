Admin Chat Client Utilities

Purpose
- Small, focused helpers used by the Admin AI chat UI to stream responses and safely buffer assistant text.

Files
- sse-transport.ts
  - export async function streamOrchestrated({ messages, uiLanguage, signal, onEvent, onRequestId, url? }): Promise<void>
    - Sends a POST to `/api/admin/ai-chat/stream/orchestrated` (or `url`) and parses SSE chunks.
    - Calls `onEvent(SSEEvent)` for each parsed event and `onRequestId(id)` when the request id is known.
    - Handles common SSE boundaries (`\n\n`, `\r\n\r\n`, `\r\r`). Resolves when the stream ends.
  - export function splitSSEBlocks(input: string): string[]
    - Test helper to split a combined SSE payload into blocks. Used in unit tests.

- assistant-buffer.ts
  - export function createAssistantBuffer()
    - Returns `{ push(delta), value(), length(), clear() }` for accumulating `assistant_delta` text.
    - Useful to finalize assistant content on `assistant_done`, even if intermediate UI updates were missed.

Event contract
- The client expects UI-consumed SSE events defined in `src/lib/admin/types/events.ts`:
  - `assistant_delta`, `assistant_done`, `handoff`, `tool_start`, `tool_result`, `tool_append`, `error`.
  - Every event may include `request_id` for correlation.

Environment toggles
- Client console SSE traces (default: ON)
  - Disable with `NEXT_PUBLIC_ADMIN_AI_TRACE_DISABLED=1` (or `NEXT_PUBLIC_ADMIN_AI_TRACE=0`).
- Server logs (route + orchestrator, default: ON)
  - Disable with `ADMIN_AI_TRACE_DISABLED=1`.

Tests
- Unit tests for the transport live in `src/lib/admin/chat/client/__tests__/sse-transport.test.ts`.
- Run all tests: `npm run test`.

Notes
- These helpers are UI-agnostic and can be reused by other chat views.
- The chat hook `src/components/admin/ai-chat/hooks/useChatSession.ts` composes these utilities and owns React state updates.

