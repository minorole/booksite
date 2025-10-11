# Combined Architecture Review + Reconstruction Plan

Date: 2025-10-11

This document consolidates the architecture review (doc/new-plans/architecture-review.md) with the existing reconstruction plan (doc/reconstruct/plan.md), mapping concrete findings to actionable slices with clear acceptance.

## Executive Summary

Keep the core architecture (Next.js App Router, Prisma/Postgres, Supabase Auth, Cloudinary, server-centric routes). Address correctness gaps and modernize where it pays off: tool message mapping, per-route rate limiting, missing admin endpoints, placeholder logic, test drift, FTS/indexes, observability, streaming, and signed uploads.

## Key Findings (from Architecture Review)

1) Tool message role mapping bug blocks tool-calling follow-ups.
2) Route-specific rate limiting not guaranteed due to a shared limiter instance.
3) Navbar/middleware reference non-existent routes.
4) Super Admin API endpoints missing.
5) Placeholders/TODOs in analysis flow.
6) Unit test drift (rate limit API name).
7) Postgres FTS mismatch (schema vs migration).
8) Unused deps/config (next-auth, @auth/prisma-adapter; Sentry unused; stray image pattern).
9) Observability gaps (no Sentry/init, no structured logs).
10) Server-heavy uploads (base64 → Cloudinary on server).
11) Non-streaming chat UI; still on Chat Completions vs Responses API.
12) Vector embeddings present but unused in queries.

Evidence: See doc/new-plans/architecture-review.md (includes precise file:line references).

## Integrated Plan (Mapping Findings → Slices)

Roadmap baseline: doc/new-plans/rewrite-roadmap.md
Plan baseline: doc/reconstruct/plan.md

### Slice: Foundations (polish and correctness)

Augment Foundations-2 with:
- Rate limiter per-route instance (fix shared limiter).
- Fix unit test drift to use `checkRateLimit`.

New Foundations-3 (small, reversible):
- Fix tool message mapping in `src/app/api/admin/ai-chat/route.ts` to preserve `role: 'tool'` and `tool_call_id` for tool outputs.
- Align Navbar links/middleware with existing pages (e.g., `/users/orders`) or add stub pages; avoid guarding non-existent paths.
- Remove placeholders/TODOs in analysis helpers and admin UI (explicit messages or remove initial stage dependency).

Acceptance
- Tool call chains work across multiple calls (assistant consumes tool messages correctly).
- Different rate limit windows/limits apply per route as configured.
- Navbar links do not 404; middleware protects real routes only.
- No TODOs/placeholders in user-facing flows; initial analysis confirmation isn’t showing undefined fields.
- Tests pass using current APIs.

### Slice: Admin AI Hardening (existing)

Keep scope from plan; add:
- zod validation for tool call args at `src/app/api/admin/function-call/route.ts`.
- Persist retries/decision logs consistently to AdminLog.

Acceptance
- Function calls reject invalid payloads with 400; AdminLog contains retries/decisions.

### Slice: Super Admin APIs (new)

Add endpoints used by UI:
- `GET /api/users` (list with id/email/name/role/created_at).
- `PUT /api/users/role` (change role; protect super admin address).

Acceptance
- Super Admin panel loads users and updates roles successfully (UI: src/components/super-admin/super-admin-panel.tsx).

### Slice: Observability & Validation (new)

- Initialize @sentry/nextjs (server and client); DSN via env.
- Add request IDs and a structured logger (e.g., pino) in route handlers.

Acceptance
- Errors reported to Sentry; logs include request IDs.

### Slice: Streaming & AI API (merge of plan’s Responses API + streaming)

- Add SSE streaming to admin chat route and hook ChatInterface to display tokens.
- Optionally migrate to Responses API for tool calling and streaming parity.

Acceptance
- Admin chat streams; tool calls continue to work; no regressions.

### Slice: Uploads Modernization (existing)

- Add `/api/upload/sign` and Cloudinary webhook route.
- Migrate Admin UI to direct signed uploads.

Acceptance
- Client performs signed uploads; webhook executes post-processing.

### Slice: Data Indexes & Similarity (existing)

- Add generated `tsvector` column (title/author fields) + GIN index; use it in search queries.
- Add GIN on `search_tags` (present) and vector index (IVFFlat/HNSW) on `Book.embedding`.
- Add embedding pipeline for duplicate/search paths.

Acceptance
- Duplicate/search queries leverage FTS/vector; migrations apply cleanly.

### Slice: Upgrades & Cleanup (existing)

- Remove unused deps (next-auth, @auth/prisma-adapter) unless intended.
- Prune unused Next image patterns.
- Upgrade Next/React/Tailwind/ESLint per plan when ready.

Acceptance
- Lint/typecheck/build succeed; smoke tests pass; reduced dependency surface.

## Work Breakdown (Actionable Items)

- Tool role mapping: edit ai-chat route mapping for tool messages; verify conversation continuity on tool results.
- Rate limiter: replace single `limiter` with `Map<route, Ratelimit>`; unit tests for two different route policies.
- Navbar/middleware: align links and protected paths; add missing stubs or retarget to existing pages.
- Super Admin APIs: implement GET/PUT endpoints with guardrails.
- Placeholders/TODOs: remove or replace with explicit text; avoid undefined in confirmation UI.
- Test drift: update ratelimit test to `checkRateLimit` and possibly add `getPolicy` tests.
- Observability: initialize Sentry; add request IDs and a logger in handlers.
- Streaming: implement SSE for admin chat; wire UI to stream.
- Responses API: refactor wrapper with compatibility shim; migrate routes incrementally.
- Uploads: add sign + webhook; update UI upload path.
- FTS/vector: add migration DDL; implement embedding write & search usage.
- Cleanup: remove unused deps and image patterns.

## References

- Architecture review: doc/new-plans/architecture-review.md
- Strategic roadmap: doc/new-plans/rewrite-roadmap.md
- Reconstruction plan: doc/reconstruct/plan.md
- Status/logs/ADRs: doc/reconstruct/*
