Supabase project setup (linked CLI)

Prereqs
- Supabase CLI installed and logged in: `supabase --version`, `supabase login`.
- This repo is already initialized with `supabase/config.toml`.
- Project is linked with `supabase link --project-ref <PROJECT_REF>`.

Migrations workflow
1) Create a migration: `supabase migration new <name>`
2) Edit the generated SQL under `supabase/migrations/`.
3) Apply to the linked project: `supabase db push`
4) (Optional) Run locally with Docker: `supabase start`, then `supabase db reset`.

Extensions
- The initial migration enables core extensions used by this project:
  - `vector` (pgvector) for embeddings
  - `pg_trgm` for trigram similarity
  - `uuid-ossp` for UUID generation
  - `unaccent` (optional) to normalize diacritics for FTS

Types generation
- Generate TypeScript types from the linked DB into the app:
  `supabase gen types typescript --linked --schema public > src/types/supabase.generated.ts`

Notes
- Do not commit secrets. Keep `.env.local` with `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` for the app.
- Use SQL-first migration files; avoid in-console schema drift.

Linking & verification (important)
- Linking stores project info in your Supabase CLI profile (not in the repo). The absence of a local `.supabase/` folder does not mean you’re unlinked.
- Best way to verify the link is via a command that requires it:
  - Quick check (read‑only): `supabase gen types typescript --linked --schema public > /dev/null` (exit 0 means linked)
  - Apply migrations: `supabase db push` (will fail if not linked)
- Avoid using `supabase status` with `--project-ref` to infer linkage; it’s not a link check and can be misleading.
- Do not use placeholder envs as a linkage signal. `.env.local` may contain template values and does not affect CLI linkage.
