# Changelog

All notable changes to this project will be documented in this file.

## Unreleased

### Added
- [Admin • Shared UI] Centralized user management UI and logic:
  - Components: `UsersTable`, `RoleSelect`, `PaginationControls`.
  - Hooks: `useUsers` (debounce, pagination, enabled flag), `useUserRoleUpdate`.
  - Typed clients: users (list, role update, orders) and books (list/update/delete).
- [Super Admin] Extracted `ClipHealthCard` and refactored super-admin panel to use shared users UI.

### Changed
- [Admin • Users page] Switched to shared `UsersTable` and `useUsers` hook (read‑only roles for admins).
- [Admin • Manual] Switched book list/dialog to use typed clients (no behavioral change).
- [Navigation • Mobile] Navbar now uses the animated `MobileMenu` on small screens; inline links are desktop‑only. The user icon sits next to the menu toggle on mobile. Removed the “Admin Panel” label entirely.
- [Mobile Menu] Replaced text-based toggle with an icon-only shadcn `Button` (Menu/X) and localized aria-labels. Extracted GSAP logic into `useMobileMenuAnimation` and toggle button into `MobileMenuToggle`.
- [Admin • UsersTable] Show inline loading row while fetching.
- [Admin • Navbar] Replace “Back to Site” text with the front-page `LogoButton` that links to the localized home.

### Performance
- [Users] Abort in‑flight fetches on search/page/limit changes to avoid race conditions and wasted work; hook cleans up on unmount.
- [Navbar] Memoized `navItems` and `mobileItems` to reduce re-creation.

### Removed
- [Mobile Menu] Dead code: text-cycling animation and old `toggleLabel`/`toggleOpenLabel` props.

### Home • Lotus 3D
- Added spinner-style drag-to-spin with inertia; works with mouse and touch, scroll-safe (`touchAction: 'pan-y'`). Reduced motion disables drag.
- Added an always-on base tilt toward the viewer (~5°) for depth; independent of cursor.
- Performance: pause auto-rotation when the Canvas is off-screen (IntersectionObserver), when tab is hidden, or when reduced motion is on.
- Performance: tuned GL (`stencil: false`) and cap DPR on battery; fixed `getBattery` listener cleanup.
- A11y: mark the lotus Canvas as decorative (`aria-hidden`).
- Fixed petal-tip clipping at full bloom by widening FOV, reducing near plane, and disabling mesh frustum culling.

### Added
- [UI] Reusable, accessible image preview dialog component that guarantees a hidden `DialogTitle` and `DialogDescription` while preserving visuals.
- [Admin • Navigation] Language switch (zh/en) with active highlight and account `UserMenu` in Admin navbar. Super Admin tab appears only for superadmins.
- [Admin • Users API] Admin-only endpoint to view a specific user’s order history (includes per-order address snapshot).
  - `GET /api/users/[userId]/orders`
- [Admin • User Management] New read‑only Admin page to view users and open per-user order history.
  - Page: `src/app/[locale]/admin/users/page.tsx` (normal admins cannot see SUPER_ADMIN rows; super admins see all).
  - Shared dialog: `src/components/admin/users/UserOrdersDialog.tsx` to display orders, items, and shipping address.
- [Super Admin • User Management] Added “View Orders” action per user with the same dialog.

- [Admin AI • Tools] Unified `check_duplicates` tool to accept item inputs (name/type/tags/category) in addition to book fields.
- [Vision] Neutralized visual similarity prompt and switched comparisons to normalized Cloudinary derivatives (512×512, crop:fill, gravity:auto).
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
  
- [Vision] Standardized internal imports in similarity service to `@/…` for reliable mocking; updated similarity test to use deterministic JSON path.
- [DB] `getUserOrders` now accepts an optional `db` client parameter for easier unit testing; default behavior unchanged.
- [Admin • AI Chat] Switched the image lightbox to `ImagePreviewDialog`; same appearance, now a11y-compliant and reusable.
- [Admin • Manual • Book List] Switched book cover preview to `ImagePreviewDialog`; consistent behavior and a11y.
- [Admin • Users/Manual] Added hidden descriptions to existing dialogs to satisfy a11y requirements.

 - [Dev • Local] In-memory KV backend for rate limiting via `KV_USE_MEMORY=1` (dev-only). Documented in `.env.example` and `AGENTS.md`; blocked in production builds.

### Fixed
- [A11y] Resolved Radix warnings: “DialogContent requires a DialogTitle” and “Missing Description/aria-describedby” across image preview dialogs and user/book dialogs.
- [Admin • Navigation] Centralized a single Admin navbar across Admin and Super Admin via layouts; removed page-level container wrappers; preserved Back-to-Site.
- [Admin/Super Admin • User Management] Localized UI (titles, headers, placeholders, actions), added explicit empty states, and consistent loading labels.
- [Admin • Book Management] Localized list and editor dialog; added loading spinner for list; added a11y labels for icon-only buttons.
- [Admin AI Chat] Align composer and messages to a shared column width.
  - Introduced a single CSS variable `--chat-col-width` and centered wrappers so both areas use the exact same measure; removed per‑bubble `max-w` caps to prevent drift; aligned the "Jump to latest" affordance; kept mobile full‑width behavior.
- [Admin AI Chat] Improve composer ergonomics: auto‑resize up to a sane cap with a taller default and safe‑area space on iOS.
  - Textarea now grows with content up to `max-h-[20rem]`, then scrolls; default height ~3–4 lines; added `mb:[env(safe-area-inset-bottom)]` on the sticky bar.
- [Admin AI Chat] Unified spacing to rely on layout; removed inner horizontal padding from chat container.

- refactor(openai): migrate both text and vision to the Responses API (`client.responses.create`) with a centralized helper that converts chat-style messages (text + images) to Responses input and maps JSON schema output to `text.format`. Eliminates usage of Chat Completions in our wrappers.
- [Admin • Navigation] Added "User Management" to Admin navbar and user menu for admins.

- [Admin AI • Duplicates] Embeddings‑first shortlist with fallback to ILIKE; fused scoring (0.6 text + 0.4 image); visual tie‑breaker limited to top‑3 candidates; richer audit metadata.
- [Admin • Create/Update Book] Auto‑embed text on create/update; if image provider=clip and cover present, auto‑embed image vectors as best‑effort.
 - [Embeddings • Strict Mode] Introduced `IMAGE_EMBEDDINGS_STRICT` (opt‑in). When `1` and provider=clip:
   - Duplicate checks fail if image embedding/KNN path is unavailable.
   - Create/Update will fail if image embedding upsert fails when a cover image is present.

### Fixed
- [Admin • Users API] Support `hide_super_admin=true` to filter SUPER_ADMIN rows for non-superadmins. Avoid pagination drift by omitting `total` in the RPC path and computing accurate totals in the fallback path. Client now uses this flag.
- fix(vision): resolve `400 Unsupported parameter: 'max_tokens'` on `gpt-5-mini` by using Responses `max_output_tokens` via the centralized path. Vision tools now return structured JSON without error.
- fix(vision): resolve `400 Unsupported parameter: 'temperature'` on `gpt-5-mini` image runs by omitting `temperature` for vision calls and guarding `temperature` in the Responses wrapper when any `input_image` is present.

### Removed
- [Cleanup] Moved shared `UserOrdersDialog` to `src/components/admin/users/UserOrdersDialog.tsx` and removed the legacy location.

- [Infra] Removed legacy Supabase schema dumps to avoid drift and large diffs.

## 2025-10-21
### Fixed
- [Super Admin • Users API] 500 on `GET /api/users` when DB RPCs return varchar vs text. Casted RPC return columns to `text` and normalized `total_count` parsing.
- [Users API] Auth context not forwarded to admin RPCs. Switched to route-scoped Supabase client so `auth.uid()` is present under RLS.
- [Orders API • History] 500 on `GET /api/orders/user` due to ambiguous join. Explicitly selected the snapshot relation and switched to route client.

### Added
- [Addresses • API] New endpoints to manage a user’s address (RLS-protected):
  - `GET /api/addresses` — returns the current (active) address.
  - `POST /api/addresses` — upserts the current address (update in place or insert if none).
  - `PUT /api/addresses/[id]` — updates only the user’s active address by id.
- [Addresses • UI] “My Addresses” page with a single editable form for the current address; added menu link.
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

### Notes
- Seed migrations that proved unreliable via CLI were removed in favor of the consolidated fix+seed in `0017`.
  - Removed files (staged earlier, then deleted): `0014_seed_test_orders_junpeng_me_com.sql`, `0015_seed_orders_for_super_admin.sql`, `0016_seed_super_admin_function.sql`.

### Fixed
- [Admin AI Chat] Remove the large outer outline around the input area.
  - Dropped container border/shadow on the sticky bar so no outer rectangle renders.
  - Made the textarea borderless with a subtle inner shadow (Option A) and removed all focus rings/offsets on this control.
### Changed
- [UI • Focus] Eliminate outer focus halo globally by removing ring offsets and relying on a border highlight; keep accessibility.
  - Updated shared `FOCUS_RING` to `ring-0 ring-offset-0` with `border-ring` fallback.
  - Normalized components that used ring offsets: buttons, select trigger, toast action/close, dialog close; homepage textarea no longer adds a ring.
- [Admin AI Chat] Prevent any container-level outline: wrapper now explicitly disables `focus-within` rings/offsets and borders.
- [Admin AI Chat • Theme] Apply Catppuccin Latte text to message content (not only bubbles).
  - Scoped `theme-catppuccin` and `text-foreground` at the chat root.
  - Force Latte foreground on user/assistant message text wrapper; tool/system remain muted.
### Added
- [Admin AI Chat • Rich text] Optional auto-styling of assistant messages using Catppuccin palette (feature‑flagged).
  - New renderer `RichTextAuto` supports lead paragraph, bullet lists, label — description lines, links, and **bold**.
  - Palette variables and utilities (`text-ctp-*`) added for Latte/Mocha.
  - Flag `ADMIN_AI_RICH_ASSISTANT_TEXT` (default: ON).
  - Wired for assistant messages only (array text items and plain text).
### Added
- [Super Admin] SQL guardrails for role updates via `update_user_role_secure`: admin-only; only SUPER_ADMIN can touch/assign SUPER_ADMIN; prevent self-demotion; prevent demoting the last SUPER_ADMIN.
- [Super Admin] Paginated users listing RPC with server-side search and `total_count` via window function.
- [Super Admin] One-time backfill to ensure every `auth.users` has a `public.profiles` row (defaults to `USER`).
- [API] Rate limit policy for `PUT /api/users/role`.
- [API] Audit logging for role changes with `UPDATE_USER_ROLE` action.
- [Tests] Minimal API tests for role update route behaviors (403/400/404/200).
### Changed
- [API] `PUT /api/users/role` now delegates to the secure SQL RPC, maps known SQL errors to HTTP statuses, rate-limits requests, and logs admin actions.
- [API] `GET /api/users` now supports `q`, `limit`, `offset`, and returns `{ users, total }`, preferring the new paginated RPC with a safe fallback to legacy `list_users`.
- [Super Admin UI] User Management panel now uses server-side search + pagination, adds a rows-per-page selector and pager, confirms SUPER_ADMIN grants/demotions, disables only self-row, and uses functional state updates.
- [Auth] Unified `Role` typing by importing from the single source `@/lib/db/enums`.

### Changed
- [Auth • Avatars] Idempotent Cloudinary avatar ingest using deterministic public_id; reuse or overwrite `avatars/<user.id>` instead of creating duplicates.
- [Auth • Avatars] Recover if deleted in Cloudinary: always verify `avatars/<user.id>` exists and re-upload when missing.
- [Admin • Uploads] Deduplicate Cloudinary uploads by content: hash file bytes and use `<folder>/<sha1>` as `public_id`; reuse existing resource and handle concurrent races.
- [API • Upload] Remove unused `publicId` field from JSON response.

### Added
- [API • Upload] Temporary upload mode via `?temp=1`; chat image uploader now targets `temp-uploads/` for ephemeral files.
- [API • Admin] Admin-only purge endpoint to delete `temp-uploads/*` older than N days (for Cron).
- [Scripts] Purge tool to delete `temp-uploads/*` older than N days (default 7) and npm script.
- [Docs] Documented Cloudinary media uploads, temp storage, and purge usage.
 - [CI] Nightly GitHub Actions workflow to purge Cloudinary temp uploads; set repo secret `CLOUDINARY_URL`.
 - [Config] Optional `ADMIN_TASK_TOKEN` env to authorize maintenance endpoints from Cron.

### Performance
- [Uploads] Skip base64 encoding when an existing Cloudinary asset is reused by content hash (small CPU/memory win on cache hits).

## 2025-10-20
### Changed
- [Admin UI] Apply Catppuccin text tokens to Admin AI chat so message and UI text auto-inherit Catppuccin colors without component changes; added dark-mode (Mocha) variant. Scoped to the chat container to avoid side effects elsewhere.

## 2025-10-19
### Changed
- [Admin UI] Switched Admin AI to a single-stream chat: removed right-pane ResultsPanel and the client results store. Inline cards remain the single source of truth.
- [Admin UI] Removed the inline image "expand" overlay icon to reduce visual noise; click the image itself to zoom.
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
- [Cleanup] Removed locale-less admin wrappers in favor of middleware + localized routes.
 

## 2025-10-18
### Added
- [Admin] Request-scoped tracing and logs across the Admin AI flow; server logs include request lifecycle breadcrumbs and client logs trace SSE events (default ON; disable via env).
- [Admin] Streaming client utilities for the Admin AI UI: transport and assistant buffering helpers with unit tests.
- [Docs] Minimal README for the chat client helpers.
### Changed
- [Admin] Auto-language reply behavior: agent mirrors the user's last message language; falls back to UI language when unclear (no language limits).
- [Admin] Tracing IDs: rely on Agents SDK-generated `trace_…` ids and attach server `request_id` via `traceMetadata` to avoid exporter 400s.
- [Admin] Refactored `useChatSession` to delegate SSE parsing and buffering to the new helpers; preserved public API.
- [Admin] Router agent config deduplicated and instantiated once via `Agent.create` using shared config to avoid drift.
- [Admin] Agents SDK wired to project OpenAI client and API mode; default to Responses API (`OPENAI_USE_RESPONSES=0` to use Chat Completions).
- [Admin] Inventory enabled hosted `web_search` tool for narrow disambiguation (publisher/edition).
- [Admin] Chat transcript now reuses results cards (duplicates/search/book/order) for a single source of truth.
- [Admin] Duplicate transform unified via `toDuplicateMatch` helper.
- [OpenAI] Separate vision default model fallback (`VISION_DEFAULT`).
### Fixed
- [Admin] Intermittent empty assistant message bubble due to streaming race; added robust buffering and finalization to guarantee rendering on `assistant_done`.
## 2025-10-17
### Added
- [Admin] Localized agent results and exposed request identifiers for observability in the Admin AI chat interface.
- [Admin] Linked duplicate detection cards directly to the manual editor for rapid follow-up.
### Changed
- [Admin] Enforced server-side confirmation for inventory and order mutations invoked by Admin AI tools to block unconfirmed writes.

 
### Changed
- [Security • Rate Limiting] Centralized rate limiting and per-user concurrency now backed by Vercel KV (native on Vercel Pro). Preserves existing APIs and headers; no route changes required.
  - Infra: attach a KV store in Vercel → Storage → KV; env injected automatically in production.

### Removed
- [Deps/Env] Removed Upstash dependencies and env keys; replaced with Vercel KV.
  - Deps: removed `@upstash/ratelimit`, `@upstash/redis`; added `@vercel/kv`.
  - Env: removed `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`; `.env.example` now documents `KV_REST_API_URL`, `KV_REST_API_TOKEN` for local dev.
  - Cleanup: removed legacy 503 branches when RL was disabled (now always enabled via KV).
