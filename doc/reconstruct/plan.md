Reconstruction Plan (Milestones & Slices)

Context

- Current stack and code are described in doc/new-plans/rewrite-roadmap.md. This plan maps that roadmap into executable slices with clear acceptance and validation.

Slice: Foundations-1 (docs + scaffolding)
Scope

- Create the /doc/reconstruct documentation system (this directory) to run the reconstruction.
  Acceptance
- All files added with clear instructions and no placeholders.
- Status updated; next current_slice set to Foundations-2 (planned).

Slice: Foundations-2 (typed env, guards, rate limit, lazy OpenAI, orders API)
Scope

- Add typed env module and adopt in server paths.
- Introduce central auth guards.
- Add basic rate limiting wrapper.
- Make OpenAI client lazy and role-aware.
- Implement minimal user orders API to satisfy existing UI.
  Files To Touch
- src/lib/config/env.ts (new)
- .env.example (update; add OPENAI_API_KEY_USER)
- src/lib/openai.ts (refactor to lazy, role-aware client)
- src/lib/security/guards.ts (new; assertAdmin/assertUser/isSuperAdmin)
- src/lib/security/ratelimit.ts (new; Upstash wrapper)
- src/app/api/admin/ai-chat/route.ts (wrap with rate limit)
- src/app/api/upload/route.ts (wrap with rate limit)
- src/app/api/orders/user/route.ts (new; used by src/app/users/orders/page.tsx)
  Acceptance
- Admin AI chat and upload routes remain functional and return 429 when rate limit exceeded.
- Missing envs fail at call time with explicit errors; no import-time crashes.
- Users orders page loads successfully.

Exact Edit Points

- OpenAI refactor (remove eager throw and client init; use per-call client):
  - Remove throw: src/lib/openai.ts:73
  - Remove module-time client init: src/lib/openai.ts:76-81
  - Calls to swap to per-call client:
    - createChatCompletion uses openai.chat.completions.create: src/lib/openai.ts:174-181
    - createVisionChatCompletion uses openai.chat.completions.create: src/lib/openai.ts:241-247

- Rate limit insertion points (wrap at start of handlers):
  - Admin chat: export POST in src/app/api/admin/ai-chat/route.ts:102
  - Upload: export POST in src/app/api/upload/route.ts:6

- Guards replacement points (replace inline Supabase checks with assertAdmin/assertUser):
  - Function-call route Supabase user fetch: src/app/api/admin/function-call/route.ts:12-23
  - Manual books [id] route: src/app/api/admin/manual/books/[id]/route.ts:12-19
  - Manual books collection route: src/app/api/admin/manual/books/route.ts:12-21

API Contract (/api/orders/user)

- Method: GET
- Auth: required (401 when unauthenticated)
- Response (200): { orders: Array<{ id: string, status: string, total_items: number, created_at: string, shipping_address: string, order_items: Array<{ book: { title_en: string, title_zh: string }, quantity: number }> }>}
- Used by: src/app/users/orders/page.tsx:33
- Error codes: 401 unauthorized, 500 on server errors

Rate Limit Contract (initial)

- Key: userId + route path
- Window: 1 minute
- Limit: 10 requests per window
- 429 payload: { error: "Rate limit exceeded" }

Slice: Admin AI Hardening (jobs, validation, retries)
Scope

- Queue long-running vision/duplicate checks.
- Validate input/output via zod for admin tools.
- Add retry logic and audit logs where missing.
  Files To Touch
- src/lib/admin/function-handlers.ts (extract long ops to jobs)
- src/app/api/admin/function-call/route.ts (enqueue jobs)
- Worker/queue setup (Upstash Queue or equivalent; new files under src/lib/queue/\*)
  Acceptance
- Duplicate check runs via a job, reports progress or result, and logs to AdminLog.

Slice: User AI Librarian (read-only tools + cart)
Scope

- Separate user prompts/tools/handlers (read/search/cart only).
- Add API route for user chat with moderation and rate limits.
- Build simple UI page under users/.
  Files To Touch
- src/lib/user/{prompts.ts,tools.ts,handlers.ts} (new)
- src/app/api/users/ai-chat/route.ts (new)
- src/app/users/ai-chat/page.tsx (new)
  Acceptance
- User chat can search and add to cart, with moderation and rate limits.

Slice: Uploads Modernization (signed direct + webhook)
Scope

- Add signature endpoint and Cloudinary webhook route.
- Migrate admin UI to direct uploads.
  Files To Touch
- src/app/api/upload/sign/route.ts (new)
- src/app/api/upload/webhook/route.ts (new)
- src/components/admin/ai-chat/chat-interface.tsx (migrate to direct uploads)
  Acceptance
- Image uploads bypass server file streaming; webhook persists post-processing as needed.

Slice: Data Indexes (FTS/GIN/vector)
Scope

- Add generated tsvector and GIN index for titles/authors.
- Add GIN on search_tags.
- Add IVFFlat/HNSW index on Book.embedding with correct ops.
  Files To Touch
- prisma/migrations/\* (new migration with explicit SQL DDL)
- prisma/schema.prisma (optional: document generated columns if modeled)
  Acceptance
- Queries in duplicate/search paths benefit from indexes; migrations apply cleanly.

Slice: OpenAI Responses API Migration
Scope

- Move admin and user AI to Responses API with tool calling and streaming.
- Maintain role-based keys and budgets.
  Files To Touch
- src/lib/openai.ts (introduce Responses flows, keep compatibility shims briefly)
- src/app/api/admin/ai-chat/route.ts (streaming)
- src/app/api/users/ai-chat/route.ts (streaming)
  Acceptance
- Streaming works for both admin and user chat; tool calls function as expected.

Slice: Upgrades & Cleanup (Next/React/Tailwind/ESLint)
Scope

- Upgrade to Next 15, React 19, Tailwind 4, ESLint 9; remove unused deps (next-auth, @auth/prisma-adapter).
  Files To Touch
- package.json, config files, codemods across src/\* as needed.
  Acceptance
- Lint/typecheck/build succeed; smoke tests pass; no regressions in protected routes.
