# Changelog

All notable changes to this project will be documented in this file.

## Unreleased

### Added
- [Admin • Shared UI] Centralized user management UI and logic:
  - Components: `UsersTable`, `RoleSelect`, `PaginationControls`.
    - Files: `src/components/admin/users/UsersTable.tsx`, `src/components/admin/users/RoleSelect.tsx`, `src/components/common/PaginationControls.tsx`.
  - Hooks: `useUsers` (debounce, pagination, enabled flag), `useUserRoleUpdate`.
    - Files: `src/lib/admin/hooks/use-users.ts`, `src/lib/admin/hooks/use-update-user-role.ts`.
  - Typed clients: users (list, role update, orders) and books (list/update/delete).
    - Files: `src/lib/admin/client/users.ts`, `src/lib/admin/client/books.ts`.
- [Super Admin] Extracted `ClipHealthCard` and refactored super-admin panel to use shared users UI.
  - Files: `src/components/super-admin/ClipHealthCard.tsx`, `src/components/super-admin/super-admin-panel.tsx`.

### Changed
- [Admin • Users page] Switched to shared `UsersTable` and `useUsers` hook (read‑only roles for admins).
  - File: `src/app/[locale]/admin/users/page.tsx`.
- [Admin • Manual] Switched book list/dialog to use typed clients (no behavioral change).
  - Files: `src/components/admin/manual/book-list.tsx`, `src/components/admin/manual/book-dialog.tsx`.
- [Navigation • Mobile] Navbar now uses the animated `MobileMenu` on small screens; inline links are desktop‑only. The user icon sits next to the menu toggle on mobile. Removed the “Admin Panel” label entirely.
  - File: `src/components/admin/admin-navbar.tsx`.
- [Mobile Menu] Replaced text-based toggle with an icon-only shadcn `Button` (Menu/X) and localized aria-labels. Extracted GSAP logic into `useMobileMenuAnimation` and toggle button into `MobileMenuToggle`.
  - Files: `src/components/layout/pill/mobile/useMobileMenuAnimation.ts`, `src/components/layout/pill/mobile/MobileMenuToggle.tsx`, `src/components/layout/pill/MobileMenu.tsx`, `src/components/layout/pill-nav.tsx`.
- [Admin • UsersTable] Show inline loading row while fetching.
  - File: `src/components/admin/users/UsersTable.tsx`.

### Performance
- [Users] Abort in‑flight fetches on search/page/limit changes to avoid race conditions and wasted work; hook cleans up on unmount.
  - Files: `src/lib/admin/hooks/use-users.ts`, `src/lib/admin/client/users.ts` (added `signal`).
- [Navbar] Memoized `navItems` and `mobileItems` to reduce re-creation.
  - File: `src/components/admin/admin-navbar.tsx`.

### Removed
- [Mobile Menu] Dead code: text-cycling animation and old `toggleLabel`/`toggleOpenLabel` props.
  - Files: `src/components/layout/pill/mobile/useMobileMenuAnimation.ts`, `src/components/layout/pill/MobileMenu.tsx`, `src/components/layout/pill-nav.tsx`.

### Home • Lotus 3D
- Added spinner-style drag-to-spin with inertia; works with mouse and touch, scroll-safe (`touchAction: 'pan-y'`). Reduced motion disables drag.
  - Files: `src/components/3d/lotus-model.tsx`, constants in `src/lib/ui.ts`.
- Added an always-on base tilt toward the viewer (~5°) for depth; independent of cursor.
  - Files: `src/components/3d/lotus-model.tsx`, constant `LOTUS_BASE_TILT_RAD` in `src/lib/ui.ts`.
- Performance: pause auto-rotation when the Canvas is off-screen (IntersectionObserver), when tab is hidden, or when reduced motion is on.
  - File: `src/components/3d/lotus-model.tsx`; hook: `src/lib/ui/useReducedMotion.ts`.
- Performance: tuned GL (`stencil: false`) and cap DPR on battery; fixed `getBattery` listener cleanup.
  - File: `src/components/3d/lotus-model.tsx`.
- A11y: mark the lotus Canvas as decorative (`aria-hidden`).
  - File: `src/components/3d/lotus-model.tsx`.
- Fixed petal-tip clipping at full bloom by widening FOV, reducing near plane, and disabling mesh frustum culling.
  - File: `src/components/3d/lotus-model.tsx`.

### Added
- [UI] Reusable, accessible image preview dialog component that guarantees a hidden `DialogTitle` and `DialogDescription` while preserving visuals.
  - File: `src/components/ui/image-preview-dialog.tsx`
- [Admin • Navigation] Language switch (zh/en) with active highlight and account `UserMenu` in Admin navbar. Super Admin tab appears only for superadmins.
  - File: `src/components/admin/admin-navbar.tsx`
- [Admin • Users API] Admin-only endpoint to view a specific user’s order history (includes per-order address snapshot).
  - `GET /api/users/[userId]/orders`
  - Files: `src/app/api/users/[userId]/orders/route.ts`, reuses `getUserOrders` from `src/lib/db/orders.ts`.
- [Admin • User Management] New read‑only Admin page to view users and open per-user order history.
  - Page: `src/app/[locale]/admin/users/page.tsx` (normal admins cannot see SUPER_ADMIN rows; super admins see all).
  - Shared dialog: `src/components/admin/users/UserOrdersDialog.tsx` to display orders, items, and shipping address.
- [Super Admin • User Management] Added “View Orders” action per user with the same dialog.
  - File: `src/components/super-admin/super-admin-panel.tsx`.

- [Admin AI • Tools] Unified `check_duplicates` tool to accept item inputs (name/type/tags/category) in addition to book fields.
  - File: `src/lib/admin/agents/tools.ts`
- [Vision] Neutralized visual similarity prompt and switched comparisons to normalized Cloudinary derivatives (512×512, crop:fill, gravity:auto).
  - Files: `src/lib/admin/services/vision/similarity.ts`, `src/lib/admin/image-upload.ts`
- [DB • Embeddings] Text embeddings: table + HNSW index + KNN RPC.
  - Migration: `supabase/migrations/0019_text_embeddings.sql`
  - Helpers: `src/lib/openai/embeddings.ts`, `src/lib/db/admin/embeddings.ts`
  - Backfill API: `POST /api/admin/embeddings/backfill`.
- [DB • Embeddings] Image embeddings (self‑hosted CLIP, 512‑dim): table + HNSW index + KNN RPC.
  - Migration: `supabase/migrations/0020_image_embeddings_clip.sql`
  - Provider client: `src/lib/admin/services/image-embeddings/openclip.ts`
  - Helpers: `src/lib/db/admin/image-embeddings.ts`, service: `src/lib/admin/services/image-embeddings.ts`
  - Backfill API: `POST /api/admin/image-embeddings/backfill`.
- [Super Admin] CLIP health monitor card with secure server-side health proxy (superadmin only).
  - UI: `src/components/super-admin/super-admin-panel.tsx`
  - API: `GET /api/super-admin/clip/health` (`src/app/api/super-admin/clip/health/route.ts`)
- [Config] Added env support for self‑hosted CLIP provider.
  - Keys: `IMAGE_EMBEDDINGS_PROVIDER`, `CLIP_EMBEDDINGS_URL`, `CLIP_EMBEDDINGS_API_KEY`
  - Files: `.env.example`, `src/lib/config/env.ts`
  
- [Vision] Standardized internal imports in similarity service to `@/…` for reliable mocking; updated similarity test to use deterministic JSON path.
  - Files: `src/lib/admin/services/vision/similarity.ts`, `test/admin-ai/vision.similarity.test.ts`
- [DB] `getUserOrders` now accepts an optional `db` client parameter for easier unit testing; default behavior unchanged.
  - File: `src/lib/db/orders.ts`
- [Admin • AI Chat] Switched the image lightbox to `ImagePreviewDialog`; same appearance, now a11y-compliant and reusable.
  - File: `src/components/admin/ai-chat/chat-interface.tsx`
- [Admin • Manual • Book List] Switched book cover preview to `ImagePreviewDialog`; consistent behavior and a11y.
  - File: `src/components/admin/manual/book-list.tsx`
- [Admin • Users/Manual] Added hidden descriptions to existing dialogs to satisfy a11y requirements.
  - Files: `src/components/admin/users/UserOrdersDialog.tsx`, `src/components/admin/manual/book-dialog.tsx`

 - [Dev • Local] In-memory KV backend for rate limiting via `KV_USE_MEMORY=1` (dev-only). Documented in `.env.example` and `AGENTS.md`; blocked in production builds.

### Fixed
- [A11y] Resolved Radix warnings: “DialogContent requires a DialogTitle” and “Missing Description/aria-describedby” across image preview dialogs and user/book dialogs.
- [Admin • Navigation] Centralized a single Admin navbar across Admin and Super Admin via layouts; removed page-level container wrappers; preserved Back-to-Site.
  - Files: `src/app/[locale]/admin/layout.tsx`, `src/app/[locale]/super-admin/layout.tsx`, `src/app/[locale]/admin/ai-chat/page.tsx`, `src/app/[locale]/admin/users/page.tsx`
- [Admin/Super Admin • User Management] Localized UI (titles, headers, placeholders, actions), added explicit empty states, and consistent loading labels.
  - Files: `src/app/[locale]/admin/users/page.tsx`, `src/components/super-admin/super-admin-panel.tsx`
- [Admin • Book Management] Localized list and editor dialog; added loading spinner for list; added a11y labels for icon-only buttons.
  - Files: `src/components/admin/manual/book-list.tsx`, `src/components/admin/manual/book-dialog.tsx`
- [Admin AI Chat] Align composer and messages to a shared column width.
  - Introduced a single CSS variable `--chat-col-width` and centered wrappers so both areas use the exact same measure; removed per‑bubble `max-w` caps to prevent drift; aligned the "Jump to latest" affordance; kept mobile full‑width behavior.
  - Files: `src/app/globals.css`, `src/components/admin/ai-chat/MessageList.tsx`, `src/components/admin/ai-chat/ChatInput.tsx`, `src/components/admin/ai-chat/chat-interface.tsx`.
- [Admin AI Chat] Improve composer ergonomics: auto‑resize up to a sane cap with a taller default and safe‑area space on iOS.
  - Textarea now grows with content up to `max-h-[20rem]`, then scrolls; default height ~3–4 lines; added `mb:[env(safe-area-inset-bottom)]` on the sticky bar.
  - File: `src/components/admin/ai-chat/ChatInput.tsx`.
- [Admin AI Chat] Unified spacing to rely on layout; removed inner horizontal padding from chat container.
  - File: `src/components/admin/ai-chat/chat-interface.tsx`

- refactor(openai): migrate both text and vision to the Responses API (`client.responses.create`) with a centralized helper that converts chat-style messages (text + images) to Responses input and maps JSON schema output to `text.format`. Eliminates usage of Chat Completions in our wrappers.
- [Admin • Navigation] Added "User Management" to Admin navbar and user menu for admins.
  - Files: `src/components/admin/admin-navbar.tsx`, `src/components/auth/user-menu.tsx`.

- [Admin AI • Duplicates] Embeddings‑first shortlist with fallback to ILIKE; fused scoring (0.6 text + 0.4 image); visual tie‑breaker limited to top‑3 candidates; richer audit metadata.
  - Files: `src/lib/admin/services/duplicates.ts`, `src/lib/db/admin/duplicates.ts`
- [Admin • Create/Update Book] Auto‑embed text on create/update; if image provider=clip and cover present, auto‑embed image vectors as best‑effort.
  - File: `src/lib/admin/services/books.ts`
 - [Embeddings • Strict Mode] Introduced `IMAGE_EMBEDDINGS_STRICT` (opt‑in). When `1` and provider=clip:
   - Duplicate checks fail if image embedding/KNN path is unavailable.
   - Create/Update will fail if image embedding upsert fails when a cover image is present.
   - Files: `.env.example`, `src/lib/config/env.ts`, `src/lib/admin/services/duplicates.ts`, `src/lib/admin/services/books.ts`

### Fixed
- [Admin • Users API] Support `hide_super_admin=true` to filter SUPER_ADMIN rows for non-superadmins. Avoid pagination drift by omitting `total` in the RPC path and computing accurate totals in the fallback path. Client now uses this flag.
  - Files: `src/app/api/users/route.ts`, `src/app/[locale]/admin/users/page.tsx`
- fix(vision): resolve `400 Unsupported parameter: 'max_tokens'` on `gpt-5-mini` by using Responses `max_output_tokens` via the centralized path. Vision tools now return structured JSON without error.
- fix(vision): resolve `400 Unsupported parameter: 'temperature'` on `gpt-5-mini` image runs by omitting `temperature` for vision calls and guarding `temperature` in the Responses wrapper when any `input_image` is present.
  - Files: `src/lib/openai/vision.ts:39`, `src/lib/openai/responses.ts:118`.

### Removed
- [Cleanup] Moved shared `UserOrdersDialog` to `src/components/admin/users/UserOrdersDialog.tsx` and removed the legacy location.
  - File removed: `src/components/super-admin/UserOrdersDialog.tsx`

- [Infra] Removed legacy Supabase schema dumps to avoid drift and large diffs.
  - Files removed: `supabase/_remote_schema.sql`, `supabase/public_dump.sql`

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
 
### Removed
- [Cleanup] Removed locale-less admin wrappers in favor of middleware + localized routes. References: `src/app/admin/page.tsx`, `src/app/admin/ai-chat/page.tsx`, `src/app/admin/manual/page.tsx`, `src/app/super-admin/page.tsx`.
 

## 2025-10-18
### Added
- [Admin] Request-scoped tracing and logs across the Admin AI flow; server logs include request lifecycle breadcrumbs and client logs trace SSE events (default ON; disable via env). References: `src/app/api/admin/ai-chat/stream/orchestrated/route.ts`, `src/lib/admin/chat/orchestrator-agentkit.ts`, `src/lib/observability/toggle.ts`, `src/components/admin/ai-chat/hooks/useChatSession.ts`.
- [Admin] Streaming client utilities for the Admin AI UI: transport and assistant buffering helpers with unit tests. References: `src/lib/admin/chat/client/sse-transport.ts`, `src/lib/admin/chat/client/assistant-buffer.ts`, `test/unit/sse-transport.test.ts`.
- [Docs] Minimal README for the chat client helpers. Reference: `src/lib/admin/chat/client/README.md`.
### Changed
- [Admin] Auto-language reply behavior: agent mirrors the user's last message language; falls back to UI language when unclear (no language limits). Reference: `src/lib/admin/chat/orchestrator-agentkit.ts`.
- [Admin] Tracing IDs: rely on Agents SDK-generated `trace_…` ids and attach server `request_id` via `traceMetadata` to avoid exporter 400s. Reference: `src/lib/admin/chat/orchestrator-agentkit.ts`.
- [Admin] Refactored `useChatSession` to delegate SSE parsing and buffering to the new helpers; preserved public API. Reference: `src/components/admin/ai-chat/hooks/useChatSession.ts`.
- [Admin] Router agent config deduplicated and instantiated once via `Agent.create` using shared config to avoid drift. References: `src/lib/admin/agents/router.ts`, `src/lib/admin/agents/index.ts`.
- [Admin] Agents SDK wired to project OpenAI client and API mode; default to Responses API (`OPENAI_USE_RESPONSES=0` to use Chat Completions). Reference: `src/lib/admin/chat/orchestrator-agentkit.ts`.
- [Admin] Inventory enabled hosted `web_search` tool for narrow disambiguation (publisher/edition). Reference: `src/lib/admin/agents/inventory.ts`.
- [Admin] Chat transcript now reuses results cards (duplicates/search/book/order) for a single source of truth. Reference: `src/components/admin/ai-chat/MessageContent.tsx`.
- [Admin] Duplicate transform unified via `toDuplicateMatch` helper. Reference: `src/lib/admin/services/duplicates.ts`.
- [OpenAI] Separate vision default model fallback (`VISION_DEFAULT`). References: `src/lib/openai.ts`, `src/lib/openai/models.ts`.
### Fixed
- [Admin] Intermittent empty assistant message bubble due to streaming race; added robust buffering and finalization to guarantee rendering on `assistant_done`. Reference: `src/components/admin/ai-chat/hooks/useChatSession.ts`.
## 2025-10-17
### Added
- [Admin] Localized agent results and exposed request identifiers for observability in the Admin AI chat interface. References: `src/components/admin/ai-chat/results/ResultsPanel.tsx`, `src/components/admin/ai-chat/chat-interface.tsx`.
- [Admin] Linked duplicate detection cards directly to the manual editor for rapid follow-up. Reference: `src/components/admin/ai-chat/results/cards/DuplicateMatchesCard.tsx`.
### Changed
- [Admin] Enforced server-side confirmation for inventory and order mutations invoked by Admin AI tools to block unconfirmed writes. Reference: `src/lib/admin/agents/tools.ts`.

 
### Changed
- [Security • Rate Limiting] Centralized rate limiting and per-user concurrency now backed by Vercel KV (native on Vercel Pro). Preserves existing APIs and headers; no route changes required.
  - Files: `src/lib/security/ratelimit.ts`, `src/lib/security/limits.ts` (unchanged; still the policy source)
  - Infra: attach a KV store in Vercel → Storage → KV; env injected automatically in production.

### Removed
- [Deps/Env] Removed Upstash dependencies and env keys; replaced with Vercel KV.
  - Deps: removed `@upstash/ratelimit`, `@upstash/redis`; added `@vercel/kv` (package.json:37)
  - Env: removed `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` (src/lib/config/env.ts); `.env.example` now documents `KV_REST_API_URL`, `KV_REST_API_TOKEN` for local dev.
  - Cleanup: removed legacy 503 branches when RL was disabled (now always enabled via KV).
    - Files: `src/app/api/admin/ai-chat/stream/orchestrated/route.ts`, `src/app/api/upload/route.ts`, `src/app/api/users/role/route.ts`
