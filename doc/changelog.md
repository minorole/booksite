# AMTBCF Changelog

This log captures repo-wide AMTBCF changes across admin surfaces, shared services, and public-facing features. Entries appear in reverse chronological order, cite workspace-relative references for traceability, and label the affected area in brackets (e.g., `[Admin]`, `[Infra]`, `[Docs]`).

## 2025-10-18
### Added
- [Admin] Request-scoped tracing and logs across the Admin AI flow; server logs include request lifecycle breadcrumbs and client logs trace SSE events (default ON; disable via env). References: `src/app/api/admin/ai-chat/stream/orchestrated/route.ts`, `src/lib/admin/chat/orchestrator-agentkit.ts`, `src/lib/observability/toggle.ts`, `src/components/admin/ai-chat/hooks/useChatSession.ts`.
- [Admin] Streaming client utilities for the Admin AI UI: transport and assistant buffering helpers with unit tests. References: `src/lib/admin/chat/client/sse-transport.ts`, `src/lib/admin/chat/client/assistant-buffer.ts`, `src/lib/admin/chat/client/__tests__/sse-transport.test.ts`.
- [Docs] Minimal README for the chat client helpers. Reference: `src/lib/admin/chat/client/README.md`.

### Changed
- [Admin] Auto-language reply behavior: agent mirrors the user's last message language; falls back to UI language when unclear (no language limits). Reference: `src/lib/admin/chat/orchestrator-agentkit.ts`.
- [Admin] Tracing IDs: rely on Agents SDK-generated `trace_…` ids and attach server `request_id` via `traceMetadata` to avoid exporter 400s. Reference: `src/lib/admin/chat/orchestrator-agentkit.ts`.
- [Admin] Refactored `useChatSession` to delegate SSE parsing and buffering to the new helpers; preserved public API. Reference: `src/components/admin/ai-chat/hooks/useChatSession.ts`.

### Fixed
- [Admin] Intermittent empty assistant message bubble due to streaming race; added robust buffering and finalization to guarantee rendering on `assistant_done`. Reference: `src/components/admin/ai-chat/hooks/useChatSession.ts`.

### Cleanup
- [Cleanup] Removed unused `StrictLanguagePreference` and internalized `analyzeResults` in duplicates service; retained a minimal `getToolsForAgent` shim for test compatibility. References: `src/lib/admin/types/context.ts`, `src/lib/admin/services/duplicates.ts`, `src/lib/admin/agents/tools.ts`.

### Env toggles (observability)
- Server logs (route + orchestrator): `ADMIN_AI_TRACE_DISABLED=1` to disable.
- Client console SSE traces: `NEXT_PUBLIC_ADMIN_AI_TRACE_DISABLED=1` (or `NEXT_PUBLIC_ADMIN_AI_TRACE=0`) to disable.
- Include sensitive data in traces: `ADMIN_AI_TRACE_SENSITIVE=1` to include (redacted by default).

### Additional
- [Admin] Router agent config deduplicated and instantiated once via `Agent.create` using shared config to avoid drift. References: `src/lib/admin/agents/router.ts`, `src/lib/admin/agents/index.ts`.
- [Admin] Agents SDK wired to project OpenAI client and API mode; default to Responses API (`OPENAI_USE_RESPONSES=0` to use Chat Completions). Reference: `src/lib/admin/chat/orchestrator-agentkit.ts`.
- [Admin] Inventory enabled hosted `web_search` tool for narrow disambiguation (publisher/edition). Reference: `src/lib/admin/agents/inventory.ts`.
- [Admin] Chat transcript now reuses results cards (duplicates/search/book/order) for a single source of truth. Reference: `src/components/admin/ai-chat/MessageContent.tsx`.
- [Admin] Duplicate transform unified via `toDuplicateMatch` helper. Reference: `src/lib/admin/services/duplicates.ts`.
- [OpenAI] Responses API typing simplified; direct `client.responses.create` with synthetic ChatCompletion; removed brittle usage mapping. Reference: `src/lib/openai/responses.ts`.
- [OpenAI] Separate vision default model fallback (`VISION_DEFAULT`). References: `src/lib/openai.ts`, `src/lib/openai/models.ts`.
- [Docs] Clarified legacy Assistants-era API directory is intentionally unused with README. Reference: `src/app/api/admin/function-call/README.md`.
- [Cleanup] Removed unused `Image` import in `DuplicateMatchesCard`. Reference: `src/components/admin/ai-chat/results/cards/DuplicateMatchesCard.tsx`.

Validation: `npm run check:ci` passed (lint, typecheck, tests, build).

## 2025-10-17
### Changed
- [Admin] Enforced server-side confirmation for inventory and order mutations invoked by Admin AI tools to block unconfirmed writes (`src/lib/admin/agents/tools.ts:117`, `src/lib/admin/agents/tools.ts:149`, `src/lib/admin/agents/tools.ts:222`).
### Added
- [Admin] Localized agent results and exposed request identifiers for observability in the Admin AI chat interface (`src/components/admin/ai-chat/results/ResultsPanel.tsx:17`, `src/components/admin/ai-chat/chat-interface.tsx:52`).
- [Admin] Linked duplicate detection cards directly to the manual editor for rapid follow-up (`src/components/admin/ai-chat/results/cards/DuplicateMatchesCard.tsx:44`).

## 2025-10-16
### Added
- [Docs] Documented the Admin AI UI roadmap to coordinate panel and observability workstreams (`doc/admin-ai/admin-ai-ui-roadmap.md:130`).

## 2025-10-19

### Fixed
- [Agents] Replace Zod `.url()` with centralized Agents‑safe `HttpUrl` to avoid JSON Schema `format: 'uri'` in tool parameters.
  - Added: `src/lib/schema/http-url.ts`
  - Updated: `src/lib/admin/agents/tools.ts` parameters:
    - `analyze_book_cover.parameters.image_url`
    - `analyze_item_photo.parameters.image_url`
    - `check_duplicates.parameters.cover_image`
    - `create_book.parameters.cover_image`
    - `update_book.parameters.cover_image`

### Docs
- [Admin AI] Mark inventory tool schema URI issue as Fixed and reference the `HttpUrl` helper (`doc/admin-ai/inventory-tool-schema-uri-format.md`).
- Clarify low-stock warnings as planned (`doc/admin-ai/features.md`).

### Build
- Lint, typecheck, and Next.js build passed locally.
