# Architecture Review — Booksite

Date: 2025-10-11

## Summary

The current stack (Next.js App Router, Prisma/Postgres, Supabase Auth, Cloudinary, server‑centric API routes) is a solid foundation for this product. I recommend keeping it and addressing a set of correctness, DX, and scalability gaps: a tool-message role mapping bug in the admin AI flow, route‑specific rate limiting not being enforced due to a shared limiter instance, links to non‑existent pages, missing Super Admin endpoints, placeholder logic in analysis helpers, a drifted unit test, and a Postgres FTS mismatch. Medium‑term improvements include SSE streaming, Responses API adoption, direct‑to‑Cloudinary uploads with signatures/webhooks, zod validation on tool calls, observability (Sentry + structured logs), and FTS/vector search.

## Goals (Product & Architecture)

- Free distribution platform; bilingual; admin AI assistant for inventory and orders; no payments; robust audit trail.
- Server‑centric APIs with Supabase Auth gates; typed env; rate limits; Cloudinary uploads; OpenAI GPT‑4o (admin) and GPT‑4o‑mini (user).

Sources: instruction/AMTBCF-website-prd.md:1, doc/new-plans/rewrite-roadmap.md:1

## Current Capabilities

- Auth and access control
  - Supabase Auth magic link; role gating via middleware for `/api`, `/admin`, `/super-admin`.
    - src/middleware.ts:1
  - Client/server Supabase helpers.
    - src/lib/supabase.ts:1
  - Auth callback upserts user and role; sets SUPER_ADMIN by env email.
    - src/app/api/auth/callback/route.ts:1

- Admin AI chat & tools
  - Admin chat route injects system prompts, tools, calls OpenAI; applies rate limits and user‑scoped concurrency.
    - src/app/api/admin/ai-chat/route.ts:1
    - src/lib/security/ratelimit.ts:49, src/lib/security/limits.ts:1
  - Tools defined centrally; function executor dispatches to handlers with audit logging.
    - src/lib/admin/function-definitions.ts:1
    - src/app/api/admin/function-call/route.ts:1

- OpenAI integration (centralized)
  - Single wrapper with role‑aware keys, retries, timeout, chat + “vision chat” helpers.
    - src/lib/openai.ts:9

- Media uploads
  - Server route validates file and uploads to Cloudinary (data URI); URL standardization; error mapping; RL + concurrency.
    - src/app/api/upload/route.ts:1
    - src/lib/admin/image-upload.ts:1
    - next.config.js:12

- Data model and seeds
  - Rich schema: Users, Books/Categories, Orders, Admin/User chat sessions, AdminLog, SystemPrompts, vector column.
    - prisma/schema.prisma:14
    - prisma/migrations/20241123033651_init/migration.sql:1
  - Seeds for categories, settings, prompts, optional super admin.
    - prisma/seed.ts:1

- Admin UI
  - Chat interface orchestrates upload → analysis → tool execution loop.
    - src/components/admin/ai-chat/chat-interface.tsx:1
  - Manual listing management UI with edit dialog.
    - src/components/admin/manual/book-list.tsx:1, src/components/admin/manual/book-dialog.tsx:1

- User features
  - Orders listing; API returns denormalized records.
    - src/app/users/orders/page.tsx:1, src/app/api/orders/user/route.ts:1

## Architecture Model

- Frontend (Next.js 14 App Router)
  - Public pages and authenticated areas under `src/app/**` with shadcn UI components.
  - AuthContext wires Supabase session to UI Client Components.
    - src/contexts/AuthContext.tsx:1

- Server routes (Next Route Handlers)
  - Auth callback, admin AI orchestration (`/api/admin/ai-chat`), tool execution (`/api/admin/function-call`), uploads (`/api/upload`), user orders (`/api/orders/user`).
  - Guards and helpers for user/admin assertions.
    - src/lib/security/guards.ts:1

- AI layer
  - Centralized OpenAI wrapper; prompts and tool schemas in `src/lib/admin/**`.
    - src/lib/openai.ts:9, src/lib/admin/system-prompts.ts:1, src/lib/admin/function-definitions.ts:1

- Data layer
  - Prisma client with dev‑only in‑process caching middleware; domain‑aligned schema; admin actions audited.
    - src/lib/prisma.ts:1

- External services
  - Supabase (Auth), Postgres (Prisma), Cloudinary (images), Upstash (optional rate limiting/concurrency).

## Detailed Findings

### Strengths

- Clear, server‑centric boundaries and role‑gated APIs (middleware + in‑route checks).
- OpenAI config is centralized with timeouts/retries; role‑aware key selection.
- Media handling is robust: MIME/size validation, URL normalization, clear errors; Next image remote allowlist.
- Schema models audit logs and AI prompts; seeds provide bootstrapping.
- Admin AI orchestration is neatly separated from tool execution.

### Gaps and Risks

1) Tool message role mapping bug (blocks tool‑calling follow‑ups)
- Issue: Tool messages are converted to `role: 'assistant'` instead of `role: 'tool'` in the AI chat route, and tool messages sent back to OpenAI should remain `role: 'tool'` with `tool_call_id` for correct chaining.
  - Evidence: src/app/api/admin/ai-chat/route.ts:25, src/app/api/admin/ai-chat/route.ts:52
- Impact: The model may ignore tool outputs or fail to proceed correctly with subsequent reasoning.
- Fix: Map tool results as `{ role: 'tool', content, tool_call_id, name? }` only when sending back; never coerce to `assistant`.

2) Route‑specific rate limiting not guaranteed (shared limiter instance)
- Issue: A single global `limiter` is reused for all routes; limiter settings are built only once, so later calls with different policies reuse the first limiter configuration.
  - Evidence: src/lib/security/ratelimit.ts:24–31
- Impact: Per‑route windows/limits/concurrency policies may not be enforced as intended.
- Fix: Keep a `Map<string, Ratelimit>` keyed by route/policy; construct per route and cache.

3) Navbar and middleware reference non‑existent pages
- Issue: Links to `/products`, `/orders`, `/profile` exist, but only `/users/orders` is implemented. Middleware protects `/orders` and `/profile`, which are missing pages.
  - Evidence: src/components/layout/navbar.tsx:20, :23, :24 and src/middleware.ts:52; orders page exists at src/app/users/orders/page.tsx:1
- Impact: Broken navigation; unexpected redirects.
- Fix: Point to existing routes (e.g., `/users/orders`) or add the missing pages and align middleware.

4) Super Admin API endpoints are missing
- Issue: UI calls `/api/users` and `/api/users/role` endpoints that don’t exist.
  - Evidence: src/components/super-admin/super-admin-panel.tsx:59
- Impact: Super Admin UI will fail to load/update users.
- Fix: Implement these routes with admin guard + Prisma queries.

5) Placeholders and TODOs (violates “zero tolerance” guideline)
- Issue: Analysis extract helpers return placeholders; Chat UI includes a TODO for edit UI.
  - Evidence: src/lib/admin/function-handlers.ts:348–380, src/components/admin/ai-chat/chat-interface.tsx:538
- Impact: Initial analysis confirmations surface undefined fields; weak UX and brittle flows.
- Fix: Remove placeholders; either depend solely on structured stage or implement minimal extraction or explicit “not available” messaging. Remove TODOs by implementing or deleting feature entry points.

6) Unit test drift
- Issue: Rate limit test imports a non‑existent export (`rateLimit`) instead of the current `checkRateLimit`.
  - Evidence: tests/unit/ratelimit.test.ts:2 vs src/lib/security/ratelimit.ts:49
- Impact: Test suite will fail or mislead.
- Fix: Update tests to the current API.

7) Postgres full‑text search mismatch
- Issue: Prisma schema declares `@@fulltext`, but the migration does not add a tsvector/generated column or GIN index.
  - Evidence: prisma/schema.prisma:64; prisma/migrations/20241123033651_init/migration.sql lacks FTS DDL.
- Impact: Search performance and duplicate checks rely on simple `contains` filters.
- Fix: Add a migration for a generated tsvector and GIN index per rewrite roadmap.

8) Unused/legacy dependencies and config
- Issue: `next-auth` and `@auth/prisma-adapter` are installed but unused; Sentry is installed but not initialized; a stray Next images remote pattern.
  - Evidence: package.json:1; no references in `src/` to next-auth/Sentry; next.config.js:20
- Impact: Larger surface area; confusion for contributors.
- Fix: Remove unused deps or wire them up; prune unused remote pattern.

9) Observability gaps
- Issue: Logging relies on console; @sentry/nextjs is not configured.
  - Evidence: No Sentry usage found in src.
- Impact: Limited production visibility; harder incident response.
- Fix: Initialize Sentry, add request IDs + structured logs in API routes.

10) Upload path is server‑heavy
- Issue: Server processes base64 and uploads to Cloudinary; fine for small images but not optimal at scale.
  - Evidence: src/lib/admin/image-upload.ts:160
- Impact: Higher server CPU/memory; potential timeouts.
- Fix: Introduce signed direct uploads + a webhook route for post‑processing.

11) AI API and streaming
- Issue: Using Chat Completions; streaming helper exists but UI doesn’t use streaming; Responses API would simplify future work.
  - Evidence: src/lib/openai.ts:108 (iteratorToStream) and `createChatCompletion` used non‑stream; Chat UI uses fetch JSON.
- Impact: Slower perceived latency; more glue for tool calling.
- Fix: Add SSE streaming endpoint/UI; evaluate moving to Responses API.

12) Vector embeddings unused
- Issue: `Book.embedding` exists but not populated/queried; duplicate checks use text + ad‑hoc vision comparison prompts.
- Impact: Missed performance/recall benefits for similarity search.
- Fix: Add embedding pipeline (write path + search path) and appropriate index.

## Is This the Right Architecture Today?

Yes, keep the core stack. It aligns to goals and is already well‑organized. Incrementally harden and modernize where it adds clear value.

Trade‑offs:
- Responses API vs Chat Completions: +future‑proof tools/streaming; −migration effort. Given centralization in `src/lib/openai.ts`, the switch is contained.
- Signed uploads + webhook: +offload compute; −adds endpoints/webhooks.
- Zod validation at API edges: +safety; −boilerplate. Worth it for function‑call args.
- Sentry + structured logs: +observability; −minor setup.
- FTS/vector: +recall/perf; −migrations and small search refactors.

## Recommendations and Phasing

Phase 1 — Correctness and UX polish (small PRs)
- Fix tool message mapping in `ai-chat` route to preserve `role: 'tool'` and `tool_call_id`.
- Make rate limiter instance per route/policy (cache by route).
- Align Navbar links or add `/orders` and `/profile` pages; adjust middleware protected paths accordingly.
- Implement `/api/users` (GET) and `/api/users/role` (PUT) for Super Admin panel.
- Remove placeholders in analysis helpers (or skip initial stage until ready) and remove TODOs.
- Update unit test to use `checkRateLimit`.

Phase 2 — Observability and validation
- Initialize @sentry/nextjs on server and client. Add request IDs and a lightweight structured logger in API routes.
- Introduce zod validation for tool call request bodies in `src/app/api/admin/function-call/route.ts`.

Phase 3 — Streaming and AI API
- Add SSE streaming path to `/api/admin/ai-chat`; hook ChatInterface to display streaming tokens.
- Consider migrating to Responses API for tools/streaming parity.

Phase 4 — Uploads
- Add `/api/upload/sign` and Cloudinary webhook route; migrate client to signed direct uploads.

Phase 5 — Search & similarity
- Add FTS migration (generated tsvector + GIN) and use in search. Add vector index and an embeddings write/search path for duplicates.

Phase 6 — Cleanup
- Remove unused `next-auth` and `@auth/prisma-adapter` deps (or wire them intentionally). Prune unused Next images remote pattern.

## Acceptance Checks

- Tool calling chain works across multiple tools (role mapping correct).
- Per‑route rate limits behave as configured (different windows/limits apply).
- Admin nav links function or are removed; middleware doesn’t guard non‑existent paths.
- Super Admin panel lists users and updates roles.
- No TODOs/placeholders remain in admin analysis flow; confirmations are explicit.
- Tests run green and reflect current APIs.
- Sentry receives errors; logs include request IDs; zod rejects malformed tool call inputs.
- Admin chat streams tokens; Requests remain responsive under image uploads.
- Search endpoints leverage FTS; duplicate checks improve via embeddings when enabled.

## Evidence Index

- Tool role mapping bug: src/app/api/admin/ai-chat/route.ts:25, src/app/api/admin/ai-chat/route.ts:52
- Shared limiter instance: src/lib/security/ratelimit.ts:24–31
- Navbar broken links: src/components/layout/navbar.tsx:20, :23, :24; Orders page exists at src/app/users/orders/page.tsx:1; middleware protectedPaths at src/middleware.ts:52
- Missing Super Admin endpoints: src/components/super-admin/super-admin-panel.tsx:59
- Placeholders/TODO: src/lib/admin/function-handlers.ts:348–380; src/components/admin/ai-chat/chat-interface.tsx:538
- Test drift: tests/unit/ratelimit.test.ts:2; current API at src/lib/security/ratelimit.ts:49
- FTS mismatch: prisma/schema.prisma:64; migration lacks FTS DDL (prisma/migrations/20241123033651_init/migration.sql:1)
- Unused deps/config: package.json:1 (next-auth/@auth/prisma-adapter/@sentry/nextjs); next.config.js:20
- Observability gaps: no Sentry imports in src
- Server‑heavy uploads: src/lib/admin/image-upload.ts:160
- Streaming helper unused in UI: src/lib/openai.ts:108; ChatInterface uses JSON fetch
- Vector unused: prisma/schema.prisma:32 (Book.embedding)

