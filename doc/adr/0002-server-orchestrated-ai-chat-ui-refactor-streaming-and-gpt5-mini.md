# ADR 0002: Server‑Orchestrated AI Chat, UI Refactor, Streaming, and GPT‑5 Mini Default

Status: Accepted
Date: 2025-10-13

Update (2025-10-17)

- Visible confirmation UI surfaces were removed in favor of server‑enforced confirmation. Mutating tools now require `confirmed: true` parameters; agents include this only after explicit admin confirmation in chat. No confirm/edit dialogs are rendered in the UI.
- Event contract refined: `tool_result.result` now emits unwrapped domain `data` (when present); `tool_append` keeps the full envelope JSON for chat summaries.
- UI renders rich, bilingual result cards inline in the chat (duplicates/search/create/update/order), and duplicates deep‑link opens the manual editor. Earlier iterations used a right‑pane; we now use a single‑stream layout.

Context
The admin chat interface at `src/components/admin/ai-chat/chat-interface.tsx` had grown to ~739 lines and mixed UI concerns with network orchestration and tool execution. The client executed tool calls by invoking `/api/admin/function-call`, then re‑invoked `/api/admin/ai-chat`, making the flow brittle and hard to test. The repo’s Primary Objectives call for “Server‑centric APIs” and logic in `src/app/api/**/route.ts`, protected by auth. In addition, the model lineup is evolving; we want an easy switch to `gpt-5-mini` without refactoring the app, and we want a better text‑chat UX via streaming.

Decision

1. Move tool orchestration to the server and keep the client thin. 2) Refactor the large chat UI into focused components and hooks. 3) Add a streaming route for text chat. 4) Default OpenAI model to `gpt-5-mini` for both text and vision. 5) Centralize UI i18n messages. 6) Use the Responses API as the standard path for text and vision, while preserving the existing public helper shapes.

Changes

- Server orchestration
  - New `src/lib/admin/chat/orchestrator.ts` that:
    - Converts incoming messages to OpenAI format.
    - Calls OpenAI, detects `tool_calls`, executes them server‑side via `@/lib/admin/function-handlers`, appends a `tool` message with JSON result, and loops until no tools remain or max steps reached.
    - Ensures `image_url` for `analyze_book_cover` is correctly injected.
  - `src/app/api/admin/ai-chat/route.ts` now delegates to the orchestrator and returns `{ messages: Message[] }` deltas (assistant and tool outputs to append). Auth/rate-limit behavior preserved.

- Streaming (text UX)
- New `src/app/api/admin/ai-chat/stream/orchestrated/route.ts` that streams assistant content via SSE using the same OpenAI wrapper utilities; it does not execute tools (content‑only path for responsiveness).
  - Client hook consumes SSE and progressively builds the assistant message.

- UI refactor (thin client, no tool execution)
  - `src/components/admin/ai-chat/chat-interface.tsx` rewritten as a small container that composes:
    - `MessageList`, `MessageContent`, `ChatInput`, `ErrorBanner`, `LoadingIndicator`.
    - (Superseded) `EditAnalysisDialog` for manual field corrections — removed in favor of chat‑based confirmation + server enforcement.
  - New components:
    - `src/components/admin/ai-chat/MessageList.tsx`
    - `src/components/admin/ai-chat/MessageContent.tsx`
    - `src/components/admin/ai-chat/ChatInput.tsx`
    - `src/components/admin/ai-chat/ErrorBanner.tsx`
    - `src/components/admin/ai-chat/LoadingIndicator.tsx`
    - (Superseded) `src/components/admin/ai-chat/AnalysisConfirmation.tsx` — removed
    - (Superseded) `src/components/admin/ai-chat/EditAnalysisDialog.tsx` — removed
  - New hooks:
    - `src/components/admin/ai-chat/hooks/useChatSession.ts` (text streaming, image/confirm orchestration via server route, AbortController handling)
    - `src/components/admin/ai-chat/hooks/useImageUpload.ts` (wraps `/api/upload` and maps errors)

- i18n centralization
  - New `src/lib/admin/i18n.ts` with shared error/loading messages and helpers (removes duplication formerly embedded in the component).

- OpenAI model defaults and Responses API
  - `src/lib/openai.ts`:
    - Added `OPENAI_CONFIG.MODELS.GPT5_MINI` and set it as the default model for both `createChatCompletion` and `createVisionChatCompletion`.
    - `createChatCompletion` now supports `stream: true` and returns a ReadableStream when streaming.
    - Responses API is the standard path; we synthesize Chat Completions‑shaped objects for compatibility where needed.

API Invariants

- All server‑side business logic remains authenticated and under `src/app/api/**/route.ts` and `src/lib/admin/services/**`.
- Tool handlers and definitions remain the single source of truth: `src/lib/admin/function-definitions.ts` and `src/lib/admin/function-handlers.ts`.
- The chat route return shape is intentionally changed from `{ message }` to `{ messages }` to return a delta array. The only in‑repo consumer (the admin chat UI) was updated accordingly.
- `/api/admin/ai-chat/stream/orchestrated` is a new route for assistant text streaming only (no tool execution).

Alternatives Considered

- Keep client‑side tool execution: rejected to align with “Server‑centric APIs”, reduce round‑trips, and improve testability.
- Preserve `{ message }` response shape: rejected to avoid a second client round‑trip when tool outputs plus final assistant content are needed.
- Responses API everywhere: adopted for text and vision helpers and Agents; Chat Completions fallback removed to reduce drift.

Verification

- Build: App compiles; unrelated ESLint config and SSR dynamic server warnings exist elsewhere and were not introduced by this change.
  - `npm run build` shows compile success, then ESLint config error (missing `next/typescript` extend) and SSR warnings on other pages using `cookies`/`request.url`.
- Manual flows (requires admin auth and envs set):
  - Text chat: type a prompt on `/admin/ai-chat` → assistant content streams in; no tools are executed on the streaming path.
  - Image flow: upload valid image → tool result shows natural analysis; Confirm/Edit triggers structured analysis; tool results and final assistant message are appended from the main orchestrated route.
  - Errors: invalid upload displays a banner, “New Conversation” resets state and aborts in‑flight requests.

Consequences

- Pros:
  - Clear separation of concerns: server orchestrates, client renders.
  - Fewer round‑trips and simpler UI state; no client knowledge of tool names.
  - Streaming UX for text chats; quicker feedback for admins.
  - Central i18n; easier future model swaps (gpt‑5‑mini default).
- Cons:
  - Breaking change in chat route shape (`{ messages }`), mitigated by updating the sole in‑repo consumer.
  - Some added code surface (new files) to support modular UI and hooks.
  - Streaming route intentionally skips tools; complex flows still use the non‑streaming orchestrated route.

Security / Auth

- Both chat routes (`/api/admin/ai-chat` and `/api/admin/ai-chat/stream`) are admin‑gated via `assertAdmin()`.
- Upload remains admin‑gated with rate limiting and concurrency control.

Rollback

- Restore previous `src/app/api/admin/ai-chat/route.ts` behavior and remove `src/lib/admin/chat/orchestrator.ts`.
- Revert the UI to the single‑file component, or rewire the container to call `/api/admin/function-call` directly on tool calls.
- Switch `OPENAI_CONFIG.MODELS` back to previous defaults in `src/lib/openai.ts`.

Follow‑ups

- Responses API parity: migrate tools/streaming to Responses API behind `src/lib/openai.ts` without changing public helpers.
- Model overrides via env: add `OPENAI_TEXT_MODEL` and `OPENAI_VISION_MODEL` envs and route selection accordingly.
- Streaming of tool steps: add an orchestrated streaming endpoint that emits both content deltas and tool step events.
- Tests: add unit tests for the orchestrator loop (mock OpenAI/tool handlers) and MessageContent rendering.
