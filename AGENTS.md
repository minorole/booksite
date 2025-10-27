# Repository Guidelines

## Agent Operating Guide (Owner Workflow)
- Tailor suggestions to this repo; plain English first; propose before patching.
- Favor maintainable, test-backed changes; small, reversible deliveries.
- Zero tolerance: no placeholders (TODO/FIXME), no hidden fallbacks.
- Workflow: Diagnose → Design → Deliver → Verify → Audit.

## Default Interaction Rules
- Before answering or running tools, follow the Deliberation & Collaboration Protocol.
- Begin with a concise action summary before running commands.
- Suggestions must be repo-specific and reference exact files/paths.
- No code changes without explicit approval; propose the patch first.
- Deep diagnosis: check at least two related layers before coding; remove dead/legacy code where found.
- Reference files by workspace-absolute paths with line numbers; validate outcomes in 1–2 lines; state assumptions if tests can’t run.

## Deliberation & Collaboration Protocol
- Intent check first: Before answering or running tools, pause to consider why the question is being asked and what hidden context or constraints may exist.
- Reframe when useful: If a sharper question would lead to a better outcome, propose it succinctly and explain the benefit.
- Define success: State 1–3 concrete success criteria for the response; ensure the answer satisfies them rather than only the literal prompt.
- Make assumptions explicit: When info is missing, state key assumptions and provisional hypotheses, and adjust as new details arrive.
- Concrete answer + reasoning: Always deliver a direct, actionable answer, plus brief reasoning, key assumptions, and better alternatives or next steps when they improve outcomes.
- Collaborate, don’t just comply: Treat the interaction as iterative; surface trade‑offs, ask targeted questions when they unblock quality, and coalesce on the optimal path.
- Quality over verbosity: Prioritize correctness, relevance, and usability; be concise while remaining thorough and immediately useful.
- Aim to delight: Where natural, add a small, high‑value insight that improves clarity or utility without adding fluff.
- Not mechanical: Do not follow directions blindly when a superior approach is evident; propose the better path and explain trade‑offs.

## Operating Workflow
1. Diagnose: clarify acceptance and map affected files (two levels deep).
2. Design: align with existing patterns; cite paths and constraints.
3. Deliver: apply small, typed patches; keep server logic server-side.
4. Verify: run lint/build; add/update minimal tests if present.
5. Audit: summarize changes with file references; ensure no placeholders.

## Primary Objectives (Booksite)
- Server-centric APIs: keep logic in `src/app/api/**/route.ts` and protect with Supabase.
- Auth: rely on `src/middleware.ts` and `src/lib/supabase.ts` for gating and clients.
- OpenAI use: centralize config in `src/lib/openai.ts` (`OPENAI_CONFIG`, retries/timeout). Override models via `OPENAI_TEXT_MODEL` / `OPENAI_VISION_MODEL` when needed.
- Data model: Supabase-first schema and RPCs. Types in `src/types/supabase.generated.ts`. DB access via `src/lib/db/**`.
- Media: use Cloudinary patterns in `next.config.js` and constants in `src/lib/admin/constants.ts`.
- Single source of truth: keep limits and constants in `src/lib/**` (do not duplicate).

## Project Structure & Module Organization
- App and API routes: `src/app/**` (e.g., `src/app/api/admin/**/route.ts`).
- Admin UI: `src/app/admin/**`, components under `src/components/admin/**` and `src/components/ui/**`.
- AI tooling: `src/lib/openai.ts`, Agents and tools under `src/lib/admin/agents/**`, orchestrator at `src/lib/admin/chat/orchestrator-agentkit.ts`.
- Supabase: `src/lib/supabase.ts` clients; DB helpers in `src/lib/db/**`.
- Database: Supabase SQL + RPCs; generated types at `src/types/supabase.generated.ts`.
- Static assets: `public/`; path alias `@/*` per `tsconfig.json`.

## Key System Areas
- API routes: `src/app/api/**/route.ts` (auth, admin, upload, callbacks).
- Admin features: manual book flow and AI chat (`src/app/admin/**`).
- Image upload/processing: `src/lib/admin/image-upload.ts`, Cloudinary config in `src/lib/admin/constants.ts`.
- Agents and tools: `src/lib/admin/agents/**`; Orchestrated chat: `src/lib/admin/chat/orchestrator-agentkit.ts`; Vision services: `src/lib/admin/services/vision/**`.

### Discovery Recipes (repo root)
- List API routes: `rg --glob "src/app/api/**/route.ts" -n ""`.
- Find OpenAI usage: `rg -n "openai|createChatCompletion|createVisionChatCompletion|gpt-5-mini|responses\.create" src`.
- Find Supabase usage: `rg -n "@supabase|createServerClient|createBrowserClient" src`.
- Find env var usage: `rg -n "process\\.env|NEXT_PUBLIC_" -S src`.
- Inspect DB helpers and types: `rg -n "from '@/lib/db'" src` and open `src/types/supabase.generated.ts`.

## Maintenance Protocol
- New API routes belong under `src/app/api/**/route.ts`; keep logic server-side and authenticated.
- Add limits/settings in `src/lib/**` (e.g., `openai.ts`, `admin/constants.ts`) and import where used. Cloudinary temp uploads are tagged `temp` and use `CLOUDINARY_TEMP_PREFIX` for folder segregation.
- Promote images on create: temp Cloudinary assets are promoted to permanent (tags updated, optional rename) before persisting (`src/lib/admin/cloudinary.ts`, used in `src/app/api/admin/manual/books/route.ts`).
- Schedule cleanup via platform cron (e.g., Vercel Cron) calling `POST /api/admin/cloudinary/purge?token=$ADMIN_TASK_TOKEN&dry=0&days=7`; this purge is reference-aware (checks DB before delete).
- Supabase-first: update SQL/RPCs in Supabase; regenerate types with `npm run db:types`.
- OpenAI changes: update `OPENAI_CONFIG`; override with `OPENAI_TEXT_MODEL` / `OPENAI_VISION_MODEL` as needed.

## Build, Test, and Development Commands
- Environment: Node >= 20.18 (Next.js 15).
- `npm run dev` — start dev server at http://localhost:3000.
- `npm run build` — production build; `npm start` — run build.
- `npm run lint` — ESLint with Next rules.
- Supabase types: `npm run db:types` (generates `src/types/supabase.generated.ts`).
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
- Required envs: `OPENAI_API_KEY`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPER_ADMIN_EMAIL`, `CLOUDINARY_URL`.
- Optional envs: `OPENAI_API_KEY_USER`, `DATABASE_URL`, `DIRECT_URL` (not required for Supabase), `CLOUDINARY_TEMP_PREFIX` (default `temp-uploads/`), `CLOUDINARY_TEMP_RETENTION_DAYS` (default `7`). For local rate limiting:
  - Vercel KV local dev: set `KV_REST_API_URL`, `KV_REST_API_TOKEN`.
  - Fully local (no Vercel project): set `KV_USE_MEMORY=1` to use an in‑memory backend (blocked in production).
- Use `.env.local`; never commit secrets. Client envs must start with `NEXT_PUBLIC_`.
- Images: remote patterns configured in `next.config.js`.
