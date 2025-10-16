# Admin AI — UI Roadmap (Two‑Pane, Typed Events, Rich Panels)

Purpose
- Provide a single source of truth for Admin AI UI work: milestones, status, acceptance, and code anchors.
- Keep backend references minimal and only where UI integration depends on them (events, request IDs, uploads).

Goals (UI‑centric)
- Two‑pane workspace: chat (left) + persistent result panels (right).
- Typed, versioned events consumed by UI; request_id shown in UI and used for traceability.
- Rich, actionable panels for duplicates/search/create‑update/orders.
- Strong confirm‑before‑apply UX for state‑changing actions.
- Bilingual UI (EN/ZH) with consistent strings.
- E2E coverage for streaming + render correctness.

Status At A Glance
- Current phase: Planning → Implementation kickoff (two‑pane + store).
- Risks/notes:
  - Event shape versioning to be coordinated with server before UI consumption.
  - Keep chat responsive while rendering rich panels (virtualization optional later).

Milestones

1) Two‑Pane Layout + Results Store + Typed Events
- Status: planned
- Scope:
  - Add right‑pane `ResultsPanel` rendered alongside chat.
  - Introduce client store to hold the latest tool result and current panel type.
  - UI consumes typed SSE events (v1) and includes `request_id` in display.
- Acceptance:
  - A `tool_result` updates the right pane without relying on scrolling history.
  - Each streamed event in UI carries `request_id`; UI exposes a small copy/peek control.
- Code anchors:
  - Chat container: src/components/admin/ai-chat/chat-interface.tsx:1
  - Stream handler (UI): src/components/admin/ai-chat/hooks/useChatSession.ts:51
  - Event emission (server, reference only): src/lib/admin/chat/orchestrator-agentkit.ts:100,121,141
  - Stream route (reference only): src/app/api/admin/ai-chat/stream/orchestrated/route.ts:24
- New files:
  - src/components/admin/ai-chat/state/useResultsStore.ts (client store)
  - src/components/admin/ai-chat/results/ResultsPanel.tsx (pane switch)
  - src/lib/admin/types/events.ts (UI union for v1 events)

2) Rich Domain Panels (Replace Summary Blocks)
- Status: planned
- Scope:
  - Duplicates: grid with cover thumbs, similarity bars, confidence, actions.
  - Search: list/table with cover/title/qty/tags/category, quick refine actions.
  - Create/Update: summary card (title(s), category chip, qty, tags, cover) with deep‑link to editor.
  - Order Update: status badge, tracking display with copy.
- Acceptance:
  - Each tool result renders a dedicated panel in right pane with at least one action (e.g., “Open in editor”).
- Code anchors (current summary locations):
  - Duplicates summary: src/components/admin/ai-chat/MessageContent.tsx:127
  - Search summary: src/components/admin/ai-chat/MessageContent.tsx:143
  - Create/Update summary: src/components/admin/ai-chat/MessageContent.tsx:157
  - Order update summary: src/components/admin/ai-chat/MessageContent.tsx:167
- New files:
  - src/components/admin/ai-chat/results/DuplicateMatchesCard.tsx
  - src/components/admin/ai-chat/results/SearchResultsList.tsx
  - src/components/admin/ai-chat/results/BookSummaryCard.tsx
  - src/components/admin/ai-chat/results/OrderUpdateCard.tsx

3) Confirm‑Before‑Apply UX
- Status: planned
- Scope:
  - Add a generic `ConfirmActionDialog` invoked before applying create/update/order.
  - Detect pending state‑changing proposals from the assistant (“I will …”), or gate when `tool_start` for these tools appears.
- Acceptance:
  - No state‑changing tool executes without a visible confirm step during the session.
- Code anchors:
  - Agent instructions (reference text): src/lib/admin/agents/inventory.ts:7, src/lib/admin/agents/orders.ts:7
  - Tool names to gate: src/lib/admin/agents/tools.ts:86,111,178
- New file:
  - src/components/admin/ai-chat/results/ConfirmActionDialog.tsx

4) i18n in Result Panels
- Status: planned
- Scope:
  - Wrap panel strings with existing bilingual/i18n patterns used in admin pages.
- Acceptance:
  - All result panel labels render in the current UI language.
- Code anchors:
  - Bilingual usage pattern (reference): src/app/[locale]/admin/ai-chat/page.tsx:6
  - Current English strings (to replace or wrap): src/components/admin/ai-chat/MessageContent.tsx:110,127,143,157,167

5) Orders Admin Page (UI)
- Status: planned
- Scope:
  - Scaffold `/${locale}/admin/orders` page: search by ID/status/query and a detail drawer.
  - Wire actions to existing orders tool or API routes.
- Acceptance:
  - Orders are browsable and editable outside of chat.
- Code anchors:
  - Navbar now hides Orders link (can re‑enable later): src/components/admin/admin-navbar.tsx:19
- New file:
  - src/app/[locale]/admin/orders/page.tsx

6) Image Preview Enhancements (UI)
- Status: planned
- Scope:
  - Side‑by‑side zoomable preview when duplicates panel shows a candidate (reuse existing image dialog for full‑screen).
- Acceptance:
  - Users can compare uploaded image vs candidate cover without leaving chat.
- Code anchors:
  - Current image dialog: src/components/admin/ai-chat/chat-interface.tsx:47

7) E2E UI Tests (Streaming + Panels)
- Status: planned
- Scope:
  - Playwright tests to mock stream and assert right‑pane updates for each panel type.
- Acceptance:
  - CI confirms: receiving `tool_result` renders the correct panel with expected labels/actions.
- New tests:
  - test/e2e/admin-ai/stream-and-panels.spec.ts (structure TBD)

8) Observability (UI Hooks)
- Status: planned
- Scope:
  - Display `request_id` from events in a subtle UI element and copyable control; optionally link to logs when available.
- Acceptance:
  - Given a run, the UI shows a request_id that matches server logs.
- Code anchors:
  - Stream handling (UI): src/components/admin/ai-chat/hooks/useChatSession.ts:51

Tasks (tracked at high level)
- Two‑pane + store + typed events consumer — owner: ___ — status: planned
- DuplicateMatchesCard — owner: ___ — status: planned
- SearchResultsList — owner: ___ — status: planned
- BookSummaryCard — owner: ___ — status: planned
- OrderUpdateCard — owner: ___ — status: planned
- ConfirmActionDialog — owner: ___ — status: planned
- i18n pass on result panels — owner: ___ — status: planned
- Orders page scaffold — owner: ___ — status: planned
- E2E streaming + panels test — owner: ___ — status: planned
- Observability (request_id in UI) — owner: ___ — status: planned

References
- ADR 0004 (Admin AI Simplification): doc/adr/0004-admin-ai-simplification-responses-structured-outputs.md
- Integration notes (AgentKit + structured outputs): doc/admin-ai/agentkit-integration-notes.md
- Features (Admin AI): doc/admin-ai/features.md

Changelog
- 2025‑10‑16: Initial roadmap created (UI focus; no links added to AGENTS.md).
