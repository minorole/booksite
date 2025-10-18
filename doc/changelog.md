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

## 2025-10-17
### Changed
- [Admin] Enforced server-side confirmation for inventory and order mutations invoked by Admin AI tools to block unconfirmed writes (`src/lib/admin/agents/tools.ts:117`, `src/lib/admin/agents/tools.ts:149`, `src/lib/admin/agents/tools.ts:222`).
### Added
- [Admin] Localized agent results and exposed request identifiers for observability in the Admin AI chat interface (`src/components/admin/ai-chat/results/ResultsPanel.tsx:17`, `src/components/admin/ai-chat/chat-interface.tsx:52`).
- [Admin] Linked duplicate detection cards directly to the manual editor for rapid follow-up (`src/components/admin/ai-chat/results/cards/DuplicateMatchesCard.tsx:44`).

## 2025-10-16
### Added
- [Docs] Documented the Admin AI UI roadmap to coordinate panel and observability workstreams (`doc/admin-ai/admin-ai-ui-roadmap.md:130`).
