# Booksite Rewrite Roadmap (AI Librarian + Admin)

## Goals

- Reliability: server-centric design, background jobs for heavy AI tasks.
- Maintainability: typed env, validation at edges, clear module boundaries.
- Safety: role-based access, rate limits, moderation, least privilege for tools.
- Performance: proper DB indexes (FTS/GIN/vector), direct-to-Cloudinary uploads.
- Product: expose AI Librarian to users (read/search/cart), keep admin ops separate.

## Target Stack

- Next.js 15 (App Router) + React 19; Server Actions for UI-bound CRUD, Route Handlers for APIs.
- TypeScript 5.9+, ESLint 9 + eslint-config-next 15, Tailwind 4 + shadcn.
- Postgres (Supabase/Neon) + Prisma 6 (or Drizzle; choose 1 — plan assumes Prisma 6).
- AI: OpenAI Responses API (GPT-4o for admin, GPT-4o-mini for user), SSE streaming, tool calling.
- Jobs: Upstash Redis + worker (or Cloudflare/Vercel queues) for vision, duplicate checks, embeddings.
- Uploads: direct-to-Cloudinary signed client uploads + server webhooks.
- Observability: Sentry + pino logger + request IDs; basic OpenTelemetry later.

## Module Boundaries

- API/Actions: `src/app/api/**`, Server Actions in RSC where appropriate.
- Admin AI: `src/lib/admin/**` (prompts, tools, handlers) — write ops only.
- User AI: `src/lib/user/**` (prompts, tools, handlers) — read + cart only.
- Shared DB: `src/lib/db/**` (read/write functions with role guards), `src/lib/prisma.ts`.
- Uploads: `src/lib/upload/**` (signing, validation); `src/app/api/upload/**` for signatures/webhooks.
- Config/env: `src/lib/config/env.ts` (zod schema + typed getters).
- Logging: `src/lib/observability/{logger.ts,ids.ts}`.
- Rate limit: `src/lib/security/ratelimit.ts` (Upstash Ratelimit).

## Data Layer

- Prisma 6 migration; remove deprecated previewFeatures; add helpers for safe read/write.
- FTS: add `tsvector` generated column over `title_zh,title_en,author_zh,author_en` with GIN index.
- Arrays: add GIN indexes for `search_tags`.
- Vector: add HNSW/IVFFlat index on `Book.embedding` if using semantic search (dimension per model, e.g., 1536 for text-embedding-3-small).

Example (SQL outline)

- ALTER TABLE Book ADD COLUMN search_tsv tsvector GENERATED ALWAYS AS (to_tsvector('simple', coalesce(title_zh,'') || ' ' || coalesce(title_en,'') || ' ' || coalesce(author_zh,'') || ' ' || coalesce(author_en,''))) STORED;
- CREATE INDEX book_search_tsv_gin ON "Book" USING GIN (search_tsv);
- CREATE INDEX book_search_tags_gin ON "Book" USING GIN (search_tags);
- CREATE INDEX book_embedding_ivf ON "Book" USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

## AI Pipelines

- Admin: cover upload → job queue: vision → structured result → duplicate check (vector + FTS) → suggested ops → admin confirms → write.
- User: chat → tools allowed: `search_books`, `get_book_details`, `list_categories`, `add_to_cart` (guarded) → strictly read/map outputs.
- Two API keys: `OPENAI_API_KEY` (admin), `OPENAI_API_KEY_USER` (user). Token budgets + rate limits per role.

## Security & Guardrails

- Central `assertAdmin()` and `assertUser()` guards; `isSuperAdmin()` with allowlist.
- Rate limiting via Upstash per IP + user on LLM and upload endpoints.
- Input/output validation with zod; drop unknown fields; audit logs for admin writes.
- Moderation: optional text moderation for user messages; block PII/abuse.

## Observability

- Sentry already present — enable server instrumentation.
- Structured logs (pino) with requestId; redact PII; debug logs only in dev.
- Minimal analytics: searches/session, tool error rates, add-to-cart conversions from user AI.

## Uploads

- Direct-to-Cloudinary: client gets signed params from server; server handles webhooks for post-processing.
- Keep current `CLOUDINARY_URL` for server ops; add signature endpoint.

## Testing & CI

- Vitest for unit/integration (DB via Testcontainers if possible); Playwright for e2e.
- CI: lint, typecheck, test, build.
- Seed small fixtures for tests; avoid large seeds.

## Dependency Plan (phased)

- Phase A (safe bumps): TypeScript, sharp, Supabase libs, ts-node; remove unused next-auth/@auth/prisma-adapter.
- Phase B: Prisma 6; adjust schema if CLI warns; `prisma generate`; verify seeds.
- Phase C: Next 15 + ESLint 9; React 19 after codemods; fix RSC/SA breaking changes.
- Phase D: Tailwind 4 (config and classes migration).
- Phase E: OpenAI 6 (if adopting Responses API + tools).

## Workspace Layout (proposed)

```
src/
  app/
    admin/
      ai-chat/
        page.tsx
      manual/
        page.tsx
    user/
      ai-chat/
        page.tsx
    api/
      admin/
        ai-chat/route.ts
        function-call/route.ts
      users/
        ai-chat/route.ts
      upload/
        sign/route.ts
        webhook/route.ts
  lib/
    config/env.ts
    db/
      read.ts
      write.ts
    upload/
      cloudinary.ts
      validate.ts
    observability/
      logger.ts
      ids.ts
    security/
      guards.ts
      ratelimit.ts
    admin/
      prompts.ts
      tools.ts
      handlers.ts
    user/
      prompts.ts
      tools.ts
      handlers.ts
```

## Environment

- Required: `DATABASE_URL`, `DIRECT_URL`, `OPENAI_API_KEY`, `OPENAI_API_KEY_USER`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SUPER_ADMIN_EMAIL`, `CLOUDINARY_URL`.
- Node >= 20 for Next 15; see `.env.example` for locations.

## Migration Plan (Strangler)

1. Foundations

- Add `src/lib/config/env.ts` (zod), `observability/logger.ts`, `security/guards.ts`.
- Introduce Upstash ratelimit helper.
- Add FTS/GIN migrations.

2. Admin AI hardening

- Move OpenAI client to lazy init; add request-scoped logger.
- Extract admin tools/handlers into `src/lib/admin/*` with zod validation.
- Queue long-running jobs (vision/duplicate) via Upstash worker.

3. User AI Librarian

- Add `OPENAI_API_KEY_USER`; create user prompts/tools (read-only + `add_to_cart`).
- Implement `src/app/api/users/ai-chat/route.ts` with rate limits + moderation.
- Build `src/app/user/ai-chat/page.tsx` UI with cart integration.

4. Uploads

- Implement signed upload endpoint + webhook; migrate UI to direct uploads.

5. Modernize deps (separate PRs)

- Phase B–E from Dependency Plan with codemods/tests.

6. Cleanup

- Remove unused packages; align logging; document envs and runbooks.

## Risks & Rollback

- Major upgrades (Next/React/Tailwind) can break RSC/SA; isolate in branches with codemods and revert plan.
- FTS/vector indexes require Postgres extensions; verify on target infra first.
- Job runner environment (Vercel vs. self-host) — have a fallback (synchronous path) for critical ops during rollout.

## Milestones

- M1 (1–2 days): Foundations + FTS/GIN + admin OpenAI lazy init + guards.
- M2 (3–5 days): Admin AI job-ify + validation + rate limits.
- M3 (3–5 days): User AI Librarian API + UI + moderation + analytics.
- M4 (2–3 days): Signed uploads + webhook + UI migration.
- M5 (ongoing): Dependency modernizations per phase, with smoke/e2e tests.

## Acceptance

- Admin: image → analysis → dup-check → create/update flow completes with logs, retries, and audit.
- User: chat search returns results, respects limits, and supports add-to-cart.
- System: rate-limited, validated, observable; deployable with documented env.
