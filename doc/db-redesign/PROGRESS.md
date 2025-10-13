Supabase DB Redesign — Progress Tracker

Meta
- Overall Status: In Progress (3/12 phases complete)
- Current Phase: Phase 3 — Types & enums
- Owners: Junpeng
- Last Updated: 2025-10-13T12:00:00Z
- Plan: doc/db-redesign/README.md

Phase Checklist
- [x] Phase 0 — Confirm guardrails (doc/db-redesign/README.md:188)
- [x] Phase 1 — Supabase project & extensions (doc/db-redesign/README.md:193)
- [x] Phase 2 — Author SQL migrations (doc/db-redesign/README.md:197)
- [ ] Phase 3 — Types & enums (doc/db-redesign/README.md:203)
- [ ] Phase 4 — DB access layer (doc/db-redesign/README.md:208)
- [x] Phase 5 — Prove path in one route (doc/db-redesign/README.md:213)
- [ ] Phase 6 — Port admin handlers (doc/db-redesign/README.md:217)
- [ ] Phase 7 — Seed and cleanup (doc/db-redesign/README.md:222)
- [ ] Phase 8 — Data migration (optional) (doc/db-redesign/README.md:227)
- [ ] Phase 9 — Tests & security checks (doc/db-redesign/README.md:232)
- [ ] Phase 10 — CI/CD & docs (doc/db-redesign/README.md:236)
- [ ] Phase 11 — Performance tuning (doc/db-redesign/README.md:240)

Phase 0 — Confirm guardrails (doc/db-redesign/README.md:188)
- Goal: Lock core decisions (roles source, embedding model/dimension, pagination defaults, performance budgets).
- Tasks
  - [x] Decide `profiles.role` as source of truth.
    - Decision: Confirmed. Use `profiles.role` (USER | ADMIN | SUPER_ADMIN) as the authoritative role. Continue mirroring to `user_metadata.role` for UI convenience. Add `is_admin()` SECURITY DEFINER in SQL and update server guards to rely on DB role.
    - Evidence:
      - doc/db-redesign/README.md:21 — Guardrails specify `profiles.role` as source of truth.
      - src/lib/security/guards.ts:10-20, src/middleware.ts:27-49 currently read `user_metadata.role`; will be updated in later phases to consult DB.
  - [x] Confirm embedding model + dimension and cosine metric.
    - Decision: Use OpenAI `text-embedding-3-small` with 1536 dimensions and cosine similarity across indexes and queries. Build IVFFlat index on `books.embedding` with `vector(1536)`.
    - Evidence:
      - doc/db-redesign/README.md:23 — Model/dimension to be confirmed; placeholder present in schema section.
  - [x] Set pagination defaults and P95 budgets.
    - Decision: Default page size = 24, max page size = 50. Prefer keyset pagination for long lists (cursor by `updated_at desc, id desc`). Budgets: P95 ≤ 150 ms for catalog queries on warm cache; admin mutating actions ≤ 300 ms. Short TTL cache on public catalog lists.
    - Evidence:
      - doc/db-redesign/README.md:24-26 — Keyset pagination and performance budgets guidance.
- Acceptance
  - Status: Completed. Decisions documented; evidence linked; proceed to Phase 1.

Phase 2 — Author SQL migrations (doc/db-redesign/README.md:197)
- Goal: Create tables, FKs, indexes, triggers; add RLS and admin helper; add RPCs.
- Tasks
  - [x] 0001_init.sql — schema, foreign keys (with ON DELETE), indexes, triggers (`search_tsv_en`, updated_at).
    - Files: `supabase/migrations/0001_init.sql`
  - [x] 0002_rls.sql — RLS policies per table + SECURITY DEFINER `is_admin()` function.
    - Files: `supabase/migrations/0002_rls.sql`
  - [x] 0003_rpcs.sql — `search_books` (blend FTS+trigram), `similar_books_nn`, `place_order`, `can_place_order`.
    - Files: `supabase/migrations/0003_rpcs.sql`
  - [x] Apply migrations to dev.
    - Command: `supabase db push --linked --yes`
- Acceptance
  - Status: Completed. Migrations applied successfully; RLS and RPCs created. `EXPLAIN` checks deferred until queries are exercised in Phase 5.

Running Log
- 2025-10-13: Created progress tracker. Initialized meta and checklist.
- 2025-10-13: Completed Phase 0 guardrails (roles, embeddings, pagination, budgets).
- 2025-10-13: Completed Phase 1 (linked project, created extensions migration, pushed).
- 2025-10-13: Completed Phase 2 (authored 0001/0002/0003 migrations; pushed to dev).
- 2025-10-13: Refactored auth callback to Supabase profiles + metadata; added `src/lib/db/books.ts`; switched admin books GET to use Supabase; middleware admin gating now checks DB role via `is_admin()` and profiles.

Open Questions / Blockers
- None.
