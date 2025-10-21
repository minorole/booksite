# Changelog

All notable changes to this project will be documented in this file.

## Unreleased

### Changed
- refactor(openai): migrate both text and vision to the Responses API (`client.responses.create`) with a centralized helper that converts chat-style messages (text + images) to Responses input and maps JSON schema output to `text.format`. Eliminates usage of Chat Completions in our wrappers.

### Fixed
- fix(vision): resolve `400 Unsupported parameter: 'max_tokens'` on `gpt-5-mini` by using Responses `max_output_tokens` via the centralized path. Vision tools now return structured JSON without error.
- fix(vision): resolve `400 Unsupported parameter: 'temperature'` on `gpt-5-mini` image runs by omitting `temperature` for vision calls and guarding `temperature` in the Responses wrapper when any `input_image` is present.
  - Files: `src/lib/openai/vision.ts:39`, `src/lib/openai/responses.ts:118`.

## 2025-10-21
### Fixed
- [Super Admin • Users API] 500 on `GET /api/users` when DB RPCs return varchar vs text. Casted RPC return columns to `text` and normalized `total_count` parsing.
  - Files: `supabase/migrations/0010_fix_user_list_types.sql`, `src/app/api/users/route.ts:39`.
- [Users API] Auth context not forwarded to admin RPCs. Switched to route-scoped Supabase client so `auth.uid()` is present under RLS.
  - Files: `src/app/api/users/route.ts:1,24`, `src/app/api/users/role/route.ts:1,37`.
- [Orders API • History] 500 on `GET /api/orders/user` due to ambiguous join. Explicitly selected the snapshot relation and switched to route client.
  - File: `src/lib/db/orders.ts:44`.

### Added
- [Addresses • API] New endpoints to manage a user’s address (RLS-protected):
  - `GET /api/addresses` — returns the current (active) address.
  - `POST /api/addresses` — upserts the current address (update in place or insert if none).
  - `PUT /api/addresses/[id]` — updates only the user’s active address by id.
  - Files: `src/app/api/addresses/route.ts`, `src/app/api/addresses/[id]/route.ts`.
- [Addresses • UI] “My Addresses” page with a single editable form for the current address; added menu link.
  - Files: `src/app/[locale]/users/addresses/page.tsx`, `src/components/auth/user-menu.tsx`.
- [Orders • Snapshots] Introduced immutable per-order address snapshots to preserve history.
  - Tables/links: `public.order_shipping_addresses`, `orders.order_shipping_address_id`.
  - Migrations: `supabase/migrations/0011_order_address_snapshot.sql`, `0012_replace_place_order_snapshot.sql`, `0013_backfill_order_address_snapshots.sql`.

### Changed
- [Orders • place_order] Hardened and disambiguated the SQL function:
  - Validates address ownership; snapshots address; uses non-conflicting param names `p_user_id`, `p_shipping_address_id`.
  - Migration: `supabase/migrations/0017_fix_place_order_and_seed.sql`.
- [Addresses • Data Model] Enforced “one current address per user” while retaining order history:
  - Added `shipping_addresses.is_archived` and a partial unique index to allow exactly one active address per user; archived rows keep FKs for legacy refs.
  - Migration: `supabase/migrations/0018_single_active_address.sql`.
- [Orders • History Reader] Switched reader to snapshot source and explicit FK selector; uses route-scoped client.
  - File: `src/lib/db/orders.ts`.

### Notes
- Seed migrations that proved unreliable via CLI were removed in favor of the consolidated fix+seed in `0017`.
  - Removed files (staged earlier, then deleted): `0014_seed_test_orders_junpeng_me_com.sql`, `0015_seed_orders_for_super_admin.sql`, `0016_seed_super_admin_function.sql`.

### Fixed
- [Admin AI Chat] Remove the large outer outline around the input area.
  - Dropped container border/shadow on the sticky bar so no outer rectangle renders.
    - File: `src/components/admin/ai-chat/ChatInput.tsx:42`.
  - Made the textarea borderless with a subtle inner shadow (Option A) and removed all focus rings/offsets on this control.
    - File: `src/components/admin/ai-chat/ChatInput.tsx:61`.
### Changed
- [UI • Focus] Eliminate outer focus halo globally by removing ring offsets and relying on a border highlight; keep accessibility.
  - Updated shared `FOCUS_RING` to `ring-0 ring-offset-0` with `border-ring` fallback.
    - File: `src/lib/ui.ts:12`.
  - Normalized components that used ring offsets: buttons, select trigger, toast action/close, dialog close; homepage textarea no longer adds a ring.
    - Files: `src/components/ui/button.tsx:8`, `src/components/ui/select.tsx:22`, `src/components/ui/toast.tsx:65,80`, `src/components/ui/dialog.tsx:47`, `src/app/[locale]/HomeClient.tsx:83`.
- [Admin AI Chat] Prevent any container-level outline: wrapper now explicitly disables `focus-within` rings/offsets and borders.
  - File: `src/components/admin/ai-chat/ChatInput.tsx:45`.
- [Admin AI Chat • Theme] Apply Catppuccin Latte text to message content (not only bubbles).
  - Scoped `theme-catppuccin` and `text-foreground` at the chat root.
    - File: `src/components/admin/ai-chat/chat-interface.tsx:173`.
  - Force Latte foreground on user/assistant message text wrapper; tool/system remain muted.
    - File: `src/components/admin/ai-chat/MessageList.tsx:61,66`.
### Added
- [Admin AI Chat • Rich text] Optional auto-styling of assistant messages using Catppuccin palette (feature‑flagged).
  - New renderer `RichTextAuto` supports lead paragraph, bullet lists, label — description lines, links, and **bold**.
    - File: `src/components/admin/ai-chat/RichTextAuto.tsx`.
  - Palette variables and utilities (`text-ctp-*`) added for Latte/Mocha.
    - File: `src/app/globals.css`.
  - Flag `ADMIN_AI_RICH_ASSISTANT_TEXT` (default: ON).
    - File: `src/lib/admin/constants.ts`.
  - Wired for assistant messages only (array text items and plain text).
    - File: `src/components/admin/ai-chat/MessageContent.tsx`.
### Added
- [Super Admin] SQL guardrails for role updates via `update_user_role_secure`: admin-only; only SUPER_ADMIN can touch/assign SUPER_ADMIN; prevent self-demotion; prevent demoting the last SUPER_ADMIN. Reference: `supabase/migrations/0006_user_mgmt_hardening.sql`.
- [Super Admin] Paginated users listing RPC with server-side search and `total_count` via window function. Reference: `supabase/migrations/0007_user_list_totalcount.sql`.
- [Super Admin] One-time backfill to ensure every `auth.users` has a `public.profiles` row (defaults to `USER`). Reference: `supabase/migrations/0008_backfill_profiles.sql`.
- [API] Rate limit policy for `PUT /api/users/role`. Reference: `src/lib/security/limits.ts`.
- [API] Audit logging for role changes with `UPDATE_USER_ROLE` action. References: `src/lib/db/enums.ts`, `src/app/api/users/role/route.ts`.
- [Tests] Minimal API tests for role update route behaviors (403/400/404/200). References: `test/api/users.role.test.ts`, `vite.config.ts`.
### Changed
- [API] `PUT /api/users/role` now delegates to the secure SQL RPC, maps known SQL errors to HTTP statuses, rate-limits requests, and logs admin actions. Reference: `src/app/api/users/role/route.ts`.
- [API] `GET /api/users` now supports `q`, `limit`, `offset`, and returns `{ users, total }`, preferring the new paginated RPC with a safe fallback to legacy `list_users`. Reference: `src/app/api/users/route.ts`.
- [Super Admin UI] User Management panel now uses server-side search + pagination, adds a rows-per-page selector and pager, confirms SUPER_ADMIN grants/demotions, disables only self-row, and uses functional state updates. Reference: `src/components/super-admin/super-admin-panel.tsx`.
- [Auth] Unified `Role` typing by importing from the single source `@/lib/db/enums`. Reference: `src/lib/auth.ts`.

## 2025-10-20
### Changed
- [Admin UI] Apply Catppuccin text tokens to Admin AI chat so message and UI text auto-inherit Catppuccin colors without component changes; added dark-mode (Mocha) variant. Scoped to the chat container to avoid side effects elsewhere. References: `src/app/globals.css`, `src/app/[locale]/admin/ai-chat/page.tsx`.

## 2025-10-19
### Changed
- [Admin UI] Switched Admin AI to a single-stream chat: removed right-pane ResultsPanel and the client results store. Inline cards remain the single source of truth. References: `src/components/admin/ai-chat/chat-interface.tsx`, removed `src/components/admin/ai-chat/results/ResultsPanel.tsx`, removed `src/components/admin/ai-chat/state/useResultsStore.tsx`.
- [Admin UI] Removed the inline image "expand" overlay icon to reduce visual noise; click the image itself to zoom. Reference: `src/components/admin/ai-chat/MessageContent.tsx`.
### Fixed
- [Agents] Replace Zod `.url()` with centralized Agents-safe `HttpUrl` to avoid JSON Schema `format: 'uri'` in tool parameters.
  - Added: `src/lib/schema/http-url.ts`
  - Updated: `src/lib/admin/agents/tools.ts` parameters:
    - `analyze_book_cover.parameters.image_url`
    - `analyze_item_photo.parameters.image_url`
    - `check_duplicates.parameters.cover_image`
    - `create_book.parameters.cover_image`
    - `update_book.parameters.cover_image`
### Changed
- [Admin AI] Mark inventory tool schema URI issue as Fixed and reference the `HttpUrl` helper (`doc/admin-ai/inventory-tool-schema-uri-format.md`).
- Clarify low-stock warnings as planned (`doc/admin-ai/features.md`).
- [Admin UI] Roadmap updated to single-stream chat; removed panel references and updated anchors to inline cards (`doc/admin-ai/admin-ai-ui-roadmap.md`).
- [Admin UI] E2E manual test updated to reference inline cards and MessageContent mapping (`doc/admin-ai/e2e-manual-test.md`).
- [ADR] Updated ADR-0002 to note single-stream inline cards replacing the right-pane (`doc/adr/0002-server-orchestrated-ai-chat-ui-refactor-streaming-and-gpt5-mini.md`).
### Removed
- [Cleanup] Removed locale-less admin wrappers in favor of middleware + localized routes. References: `src/app/admin/page.tsx`, `src/app/admin/ai-chat/page.tsx`, `src/app/admin/manual/page.tsx`, `src/app/super-admin/page.tsx`.
- [Infra] Pruned unused env getters for direct Postgres URLs (`DATABASE_URL`, `DIRECT_URL`) to reduce drift; retained `OPENAI_API_KEY_USER` and Upstash getters. Reference: `src/lib/config/env.ts`.
- [Cleanup] Removed unused enum arrays (`ORDER_STATUSES`, `ADMIN_ACTIONS`); union types remain the single source of truth. Reference: `src/lib/db/enums.ts`.
- [Admin UI] Moved result card components from `src/components/admin/ai-chat/results/cards/*` to `src/components/admin/ai-chat/cards/*` and updated imports; removed remaining panel/store code and mentions.

## 2025-10-18
### Added
- [Admin] Request-scoped tracing and logs across the Admin AI flow; server logs include request lifecycle breadcrumbs and client logs trace SSE events (default ON; disable via env). References: `src/app/api/admin/ai-chat/stream/orchestrated/route.ts`, `src/lib/admin/chat/orchestrator-agentkit.ts`, `src/lib/observability/toggle.ts`, `src/components/admin/ai-chat/hooks/useChatSession.ts`.
- [Admin] Streaming client utilities for the Admin AI UI: transport and assistant buffering helpers with unit tests. References: `src/lib/admin/chat/client/sse-transport.ts`, `src/lib/admin/chat/client/assistant-buffer.ts`, `test/unit/sse-transport.test.ts`.
- [Docs] Minimal README for the chat client helpers. Reference: `src/lib/admin/chat/client/README.md`.
### Changed
- [Admin] Auto-language reply behavior: agent mirrors the user's last message language; falls back to UI language when unclear (no language limits). Reference: `src/lib/admin/chat/orchestrator-agentkit.ts`.
- [Admin] Tracing IDs: rely on Agents SDK-generated `trace_…` ids and attach server `request_id` via `traceMetadata` to avoid exporter 400s. Reference: `src/lib/admin/chat/orchestrator-agentkit.ts`.
- [Admin] Refactored `useChatSession` to delegate SSE parsing and buffering to the new helpers; preserved public API. Reference: `src/components/admin/ai-chat/hooks/useChatSession.ts`.
### Fixed
- [Admin] Intermittent empty assistant message bubble due to streaming race; added robust buffering and finalization to guarantee rendering on `assistant_done`. Reference: `src/components/admin/ai-chat/hooks/useChatSession.ts`.
### Removed
- [Cleanup] Removed unused `StrictLanguagePreference` and internalized `analyzeResults` in duplicates service; retained a minimal `getToolsForAgent` shim for test compatibility. References: `src/lib/admin/types/context.ts`, `src/lib/admin/services/duplicates.ts`, `src/lib/admin/agents/tools.ts`.
- [Cleanup] Removed unused `Image` import in `DuplicateMatchesCard`. Reference: `src/components/admin/ai-chat/results/cards/DuplicateMatchesCard.tsx`.
### Changed
- [Admin] Router agent config deduplicated and instantiated once via `Agent.create` using shared config to avoid drift. References: `src/lib/admin/agents/router.ts`, `src/lib/admin/agents/index.ts`.
- [Admin] Agents SDK wired to project OpenAI client and API mode; default to Responses API (`OPENAI_USE_RESPONSES=0` to use Chat Completions). Reference: `src/lib/admin/chat/orchestrator-agentkit.ts`.
- [Admin] Inventory enabled hosted `web_search` tool for narrow disambiguation (publisher/edition). Reference: `src/lib/admin/agents/inventory.ts`.
- [Admin] Chat transcript now reuses results cards (duplicates/search/book/order) for a single source of truth. Reference: `src/components/admin/ai-chat/MessageContent.tsx`.
- [Admin] Duplicate transform unified via `toDuplicateMatch` helper. Reference: `src/lib/admin/services/duplicates.ts`.
- [OpenAI] Responses API typing simplified; direct `client.responses.create` with synthetic ChatCompletion; removed brittle usage mapping. Reference: `src/lib/openai/responses.ts`.
- [OpenAI] Separate vision default model fallback (`VISION_DEFAULT`). References: `src/lib/openai.ts`, `src/lib/openai/models.ts`.
- [Docs] Clarified legacy Assistants-era API directory is intentionally unused with README. Reference: `src/app/api/admin/function-call/README.md`.

## 2025-10-17
### Changed
- [Admin] Enforced server-side confirmation for inventory and order mutations invoked by Admin AI tools to block unconfirmed writes. Reference: `src/lib/admin/agents/tools.ts`.
### Added
- [Admin] Localized agent results and exposed request identifiers for observability in the Admin AI chat interface. References: `src/components/admin/ai-chat/results/ResultsPanel.tsx`, `src/components/admin/ai-chat/chat-interface.tsx`.
- [Admin] Linked duplicate detection cards directly to the manual editor for rapid follow-up. Reference: `src/components/admin/ai-chat/results/cards/DuplicateMatchesCard.tsx`.

## 2025-10-16
### Added
- [Docs] Documented the Admin AI UI roadmap to coordinate panel and observability workstreams (`doc/admin-ai/admin-ai-ui-roadmap.md`).
