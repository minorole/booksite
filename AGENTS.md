# Repository Guidelines

## Agent Operating Guide (Owner Workflow)
- Tailor suggestions to this repo; plain English first; propose before patching.
- Favor maintainable, test-backed changes; small, reversible deliveries.
- Zero tolerance: no placeholders (TODO/FIXME), no hidden fallbacks.
- Workflow: Diagnose → Design → Deliver → Verify → Audit.

## Default Interaction Rules
- Begin with a concise action summary before running commands.
- Suggestions must be repo-specific and reference exact files/paths.
- No code changes without explicit approval; propose the patch first.
- Deep diagnosis: check at least two related layers before coding; remove dead/legacy code where found.
- Reference files by workspace-absolute paths with line numbers; validate outcomes in 1–2 lines; state assumptions if tests can’t run.

## Operating Workflow
1. Diagnose: clarify acceptance and map affected files (two levels deep).
2. Design: align with existing patterns; cite paths and constraints.
3. Deliver: apply small, typed patches; keep server logic server-side.
4. Verify: run lint/build; add/update minimal tests if present.
5. Audit: summarize changes with file references; ensure no placeholders.

## Primary Objectives (Booksite)
- Server-centric APIs: keep logic in `src/app/api/**/route.ts` and protect with Supabase.
- Auth: rely on `src/middleware.ts` and `src/lib/supabase.ts` for gating and clients.
- OpenAI use: centralize config in `src/lib/openai.ts` (`OPENAI_CONFIG`, retries/timeout).
- Data model: evolve `prisma/schema.prisma` with migrations; access via `src/lib/prisma.ts`.
- Media: use Cloudinary patterns in `next.config.js` and constants in `src/lib/admin/constants.ts`.
- Single source of truth: keep limits and constants in `src/lib/**` (do not duplicate).

## Project Structure & Module Organization
- App and API routes: `src/app/**` (e.g., `src/app/api/admin/**/route.ts`).
- Admin UI: `src/app/admin/**`, components under `src/components/admin/**` and `src/components/ui/**`.
- AI tooling: `src/lib/openai.ts`, `src/lib/admin/{function-definitions.ts,function-handlers.ts,system-prompts.ts}`.
- Supabase/Prisma: `src/lib/{supabase.ts,prisma.ts}`.
- Database: `prisma/schema.prisma`, `prisma/migrations`, `prisma/seed.ts`.
- Static assets: `public/`; path alias `@/*` per `tsconfig.json`.

## Key System Areas
- API routes: `src/app/api/**/route.ts` (auth, admin, upload, callbacks).
- Admin features: manual book flow and AI chat (`src/app/admin/**`).
- Image upload/processing: `src/lib/admin/image-upload.ts`, Cloudinary config in `src/lib/admin/constants.ts`.
- AI prompts/functions: `src/lib/admin/system-prompts.ts`, `function-definitions.ts`, `function-handlers.ts`.

### Discovery Recipes (repo root)
- List API routes: `rg --glob "src/app/api/**/route.ts" -n ""`.
- Find OpenAI usage: `rg -n "openai|createChatCompletion|createVisionChatCompletion|gpt-4o" src`.
- Find Supabase usage: `rg -n "@supabase|createRouteHandlerClient|createClientComponentClient" src`.
- Find env var usage: `rg -n "process\.env|NEXT_PUBLIC_" -S src prisma`.
- Inspect Prisma models: `rg -n "^model " prisma/schema.prisma`.

## Maintenance Protocol
- New API routes belong under `src/app/api/**/route.ts`; keep logic server-side and authenticated.
- Add limits/settings in `src/lib/**` (e.g., `openai.ts`, `admin/constants.ts`) and import where used.
- Schema changes: run `npx prisma migrate dev --name <desc>`; update `prisma/seed.ts` when needed.
- OpenAI changes: update `OPENAI_CONFIG` and review dependent admin functions.

## Build, Test, and Development Commands
- Environment: Node >= 18.17 (Next.js 14).
- `npm run dev` — start dev server at http://localhost:3000.
- `npm run build` — production build; `npm start` — run build.
- `npm run lint` — ESLint with Next rules.
- `npm run db:seed` — seed via `prisma/seed.ts`.
- Prisma: `npx prisma migrate dev --name <desc>`, `npx prisma studio`.
- Quick check (CI-like sweep): `npm run lint && npm run build`.

## Coding Style & Naming Conventions
- TypeScript strict; 2-space indent; explicit types where practical.
- Files: kebab-case; React components PascalCase; named exports preferred for libs.
- Imports: prefer `@/…` alias; reuse `src/components/ui` primitives; Tailwind for styling.

## Testing Guidelines
- No formal test suite yet. If adding tests, prefer Vitest for unit and Playwright for e2e.
- Naming: `*.test.ts[x]` colocated or under `src/**/__tests__/`.
- For API behavior changes, include minimal integration tests under `src/app/api/__tests__/` if introduced.

## Commit & Pull Request Guidelines
- Commits: concise, imperative; conventional style encouraged (e.g., `feat(api): add duplicate check`).
- PRs: summary, rationale, linked issues, screenshots for UI, validation steps.
- DB changes must include migrations and, if applicable, seed updates.

## Security & Configuration Tips
- Required envs: `DATABASE_URL`, `DIRECT_URL`, `OPENAI_API_KEY`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SUPER_ADMIN_EMAIL`.
- Use `.env.local`; never commit secrets. Client envs must start with `NEXT_PUBLIC_`.
- Images: remote patterns configured in `next.config.js`.
