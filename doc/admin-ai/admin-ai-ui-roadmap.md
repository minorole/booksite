# Admin AI — UI Roadmap (Two‑Pane, Typed Events, Rich Panels)

Purpose
- Provide a single source of truth for Admin AI UI work: milestones, status, acceptance, and code anchors.
- Keep backend references minimal and only where UI integration depends on them (events, request IDs, uploads).

Goals (UI‑centric)
- Two‑pane workspace: chat (left) + persistent result panels (right).
- Typed, versioned events consumed by UI; request_id shown in UI and used for traceability.
- Rich, actionable panels for duplicates/search/create‑update/orders.
- No visible confirm modal; confirmation is enforced server‑side via tool parameters.
- Bilingual UI (EN/ZH) with consistent strings.
- E2E coverage for streaming + render correctness.

Status At A Glance
- Current phase: Implementation — two‑pane + store shipped; result panels and i18n shipped; server‑enforced confirmation shipped.
- Risks/notes:
  - Event shape versioning: UI now consumes unwrapped domain payloads in `tool_result` (see Option B in integration notes).
  - Keep chat responsive while rendering rich panels (virtualization optional later).

Milestones

1) Two‑Pane Layout + Results Store + Typed Events
- Status: done
- Scope:
  - Add right‑pane `ResultsPanel` rendered alongside chat.
  - Introduce client store to hold the latest tool result and current panel type.
  - UI consumes typed SSE events (v1) and includes `request_id` in display.
- Acceptance:
  - A `tool_result` updates the right pane without relying on scrolling history.
  - Each streamed event in UI carries `request_id`; UI exposes a small copy/peek control.
- Code anchors:
  - Chat container: src/components/admin/ai-chat/chat-interface.tsx:1
  - Stream handler (UI): src/components/admin/ai-chat/hooks/useChatSession.ts:42
  - Event emission (server, reference only): src/lib/admin/chat/orchestrator-agentkit.ts:104,122,146
  - Stream route (reference only): src/app/api/admin/ai-chat/stream/orchestrated/route.ts:24
- New files:
  - src/components/admin/ai-chat/state/useResultsStore.ts (client store)
  - src/components/admin/ai-chat/results/ResultsPanel.tsx (pane switch)
  - src/lib/admin/types/events.ts (UI union for v1 events)

2) Rich Domain Panels (Replace Summary Blocks)
- Status: done (initial set)
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
  - Implemented deep‑link “Open in editor” from duplicates to manual editor.

3) Confirmation (Server‑Enforced, No Visible Modal)
- Status: done
- Scope:
  - Mutating tools (create/update book, update order) require `confirmed: true` in tool parameters; tools fail fast otherwise.
  - Agents include `confirmed: true` only after explicit admin confirmation in chat.
- Acceptance:
  - No state‑changing tool executes unless `confirmed: true` is present; UI shows no modal confirmations.
- Code anchors:
  - Tool schemas/guards: src/lib/admin/agents/tools.ts:60–86, 99–126, 171–193
  - Agent instructions: src/lib/admin/agents/inventory.ts:6–11, src/lib/admin/agents/orders.ts:6–11

4) i18n in Result Panels
- Status: done
- Scope:
  - Wrap panel strings with existing bilingual/i18n patterns used in admin pages.
- Acceptance:
  - All result panel labels render in the current UI language.
- Code anchors:
  - ResultsPane + cards: src/components/admin/ai-chat/results/ResultsPanel.tsx, src/components/admin/ai-chat/results/cards/*

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
- Status: done (initial)
- Scope:
  - Display `request_id` from events in a subtle UI element and copyable control; optionally link to logs when available.
- Acceptance:
  - Given a run, the UI shows a request_id that matches server logs.
- Code anchors:
  - Stream handling (UI): src/components/admin/ai-chat/hooks/useChatSession.ts:51
  - Headers + panel copy: src/components/admin/ai-chat/chat-interface.tsx, src/components/admin/ai-chat/results/ResultsPanel.tsx

Tasks (tracked at high level)
- Two‑pane + store + typed events consumer — status: done
- DuplicateMatchesCard — status: done
- SearchResultsList — status: done
- BookSummaryCard — status: done
- OrderUpdateCard — status: done
- Server‑enforced confirmation — status: done
- i18n pass on result panels — status: done
- Orders page scaffold — status: planned
- E2E streaming + panels test — status: planned
- Observability (request_id in UI) — status: done (initial)

References
- ADR 0004 (Admin AI Simplification): doc/adr/0004-admin-ai-simplification-responses-structured-outputs.md
- Integration notes (AgentKit + structured outputs): doc/admin-ai/agentkit-integration-notes.md
- Features (Admin AI): doc/admin-ai/features.md

Changelog
- 2025‑10‑16: Initial roadmap created (UI focus; no links added to AGENTS.md).
- 2025‑10‑17: Adopted server‑enforced confirmation (no visible modal). Implemented Option B event contract (unwrapped domain payloads). Shipped i18n on result panels and deep‑link to editor.
