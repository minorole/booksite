# Repository Guidelines

## Agent Operating Guide (Owner Workflow)
- Tailor suggestions to this repo only; report in plain English; no code changes until approved.
- Favor long-term, test-backed solutions; think deeply before coding. Update/add tests as needed and commit with honest, precise, concise messages after green.
- Objectives: maintain `packages/core` (layout/metrics/PDF draw), keep Next.js API routes server-centric for render/OCR, ensure Gemini OCR reliability with retries/backoff, keep config centralized in `packages/config`.
- Zero tolerance: no placeholders (`TODO`/`FIXME`), no hidden fallbacks; production-ready only.
- Workflow: Diagnose → Design → Deliver (small, reversible) → Verify (tests/lint) → Audit (summarize with file refs).
- Conventions: reference files by absolute/workspace paths, explain significant commands before running, validate results in 1–2 lines, state assumptions if tests can’t run.

## Default Interaction Rules
- Plain English first: begin with a concise summary of intended actions before any tool runs or code edits.
- No generic advice: suggestions must be repo‑specific and actionable for this codebase.
- No code changes without approval: propose design/patch first; make edits only after explicit OK.
- Ultra think before coding: prioritize long‑term, maintainable solutions that scale to many user scenarios.
- Deep diagnosis: survey at least two related levels of code before proposing changes; remove dead/legacy code where found.

## Operating Workflow
1. Diagnose: clarify acceptance criteria; map affected modules/files (at least two levels deep).
2. Design: propose scalable changes aligned with existing patterns; reference exact files.
3. Deliver: apply small, reversible patches with clear naming/typing; keep server logic server‑side.
4. Verify: run tests/lint/build; add/update minimal unit/integration tests as needed.
5. Audit: summarize changes with file references; ensure no placeholders or hidden fallbacks remain.

## Primary Objectives
- Core rendering: maintain and evolve `packages/core` (layout, metrics, PDF draw) with strict types and validation. read /doc/core/core.md
- Server‑centric Next.js APIs: keep render/OCR logic in API routes; avoid UI workarounds.
- OCR reliability: Gemini integration with retries/backoff; environment‑driven behavior; clean error handling.
- Single source of truth: use `packages/config` for all limits and environment; do not duplicate constants elsewhere.

## Project Structure & Module Organization
- Monorepo managed by `pnpm`.
- Apps: `apps/web` (Next.js 15 app; UI, API routes, public assets).
- Packages: `packages/core` (TypeScript PDF/layout engine), `packages/ui-background` (React/ogl background utilities), `packages/config` (shared config + zod schemas), `packages/tsconfig` (TS bases).
- Docs/Tools: `doc/` (design/notes), `tools/` (internal scripts), root configs (`eslint.config.js`, `vitest.workspace.ts`).

## Key System Areas (Stable Patterns)
- Core library (rendering)
  - Scope: `packages/core/src/**` (layout, metrics, PDF draw, public API).
- API routes (server‑only)
  - Scope: `apps/web/src/app/api/**/route.ts` (render, OCR, uploads, config, estimate).
  - OCR pipeline helpers: `apps/web/src/app/api/extract-text/lib/**`.
- Web utilities (server)
  - Scope: `apps/web/src/utils/**` (Gemini client, image normalize, logger, storage).
- Configuration (single source of truth)
  - Scope: `packages/config/src/**` (env schema, allowlists, OCR/Gemini settings).
- Tests
  - Scope: `apps/web/src/app/api/__tests__/*`, `apps/web/src/**/__tests__/*.test.ts[x]`, `packages/core/src/tests/*.test.ts`, `packages/*/src/**/__tests__/*.test.ts[x]`.

### Discovery Recipes (from repo root; don’t commit outputs)
- List API routes: `rg --glob "apps/web/src/app/api/**/route.ts" -n ""`
- Find OCR pipeline code: `rg -n "extract-text|pipeline|sse|multi" apps/web/src/app/api`
- Find Gemini usage: `rg -n "GoogleGenAI|generateContent" apps/web/src`
- Find image limit usage: `rg -n "MAX_IMAGE_(SIZE_MB|WIDTH|HEIGHT)" -S | rg -v "packages/config"`
- Find env schema references: `rg -n "getEnv\(" -S`
- Find render entry points: `rg -n "render.*pdf|pdf" packages/core src apps/web`

### Maintenance Protocol
- When adding/renaming API routes: keep them under `apps/web/src/app/api/**/route.ts`; no client‑side OCR/render logic.
- When adding limits/settings: update `packages/config/src/env.ts`; import via `@trace-writing/config` only.
- When changing OCR behavior: update/increase tests under `apps/web/src/app/api/__tests__/`.
- Before merges: ensure `pnpm check` passes; no placeholders, no hidden fallbacks.
- If a directory pattern changes, update “Key System Areas” patterns and, if needed, the discovery recipes.

## Build, Test, and Development Commands
- Install: `pnpm install` (Node >= 20 required).
- Dev (core + web): `pnpm dev` (concurrently runs `packages/core` watch and Next dev server).
- Build all: `pnpm build` (recursive). Web-only: `pnpm build:web` or `pnpm --dir apps/web build`.
- Test (workspace): `pnpm test` (Vitest across core, ui-background, web). Package-only: `pnpm --dir packages/core test`.
- Lint/Format: `pnpm lint`, `pnpm format`. Types: `pnpm typecheck`. CI-like sweep: `pnpm check`.
- Run web locally: `pnpm --dir apps/web dev` then open http://localhost:3000.

## Coding Style & Naming Conventions
- Language: TypeScript, ES modules. Prefer explicit types and named exports where practical.
- Formatting: Prettier (`pnpm format`); lint with ESLint (`pnpm lint`).
- Files: React components `PascalCase.tsx`; utilities `kebab-case.ts`.
- Imports: use workspace aliases/packages (e.g., `@trace-writing/core`).

## Testing Guidelines
- Runner: Vitest (workspace config in `vitest.workspace.ts`).
- Locations: `packages/*/src/**/__tests__/*.test.ts[x]` and `packages/core/src/tests/*.test.ts`; web tests under `apps/web/src/**/__tests__/*.test.ts[x]`.
- Names: `*.test.ts` / `*.test.tsx`. Run quickly with `pnpm --filter ./packages/ui-background test`.
 - API routes affecting OCR/render should include integration tests under `apps/web/src/app/api/__tests__/` when behavior changes.

## Commit & Pull Request Guidelines
- Commits: conventional style is encouraged, e.g. `feat(core): add page wrap`, `fix(web): prevent empty uploads`, `docs(tools): update usage`.
- PRs: include clear summary, linked issue(s), scope (files/areas touched), and screenshots or clips for UI changes.
- Checks: ensure `pnpm check` passes (lint, tests, build). Keep PRs focused and small; note breaking changes explicitly.

## Security & Configuration Tips
- Secrets: use `*.env.local` (never commit). Next.js client envs require `NEXT_PUBLIC_` prefix.
- Node/PM: Node 20+ and `pnpm@10` (see `package.json`).
 - Centralized env schema: `packages/config/src/env.ts` (e.g., `MAX_PAGES`, `MAX_IMAGE_SIZE_MB`, `MAX_IMAGE_WIDTH/HEIGHT`, `GEMINI_MODEL_NAME`, `GOOGLE_AI_API_KEY`). Do not duplicate limits in app code.

## Git Tooling (macOS)
- Always use Homebrew Git on macOS; do not rely on the Xcode/CLT “Apple Git”.
- Path (Apple Silicon): `/opt/homebrew/bin/git`. Intel Macs: `/usr/local/bin/git`.
- Ensure PATH precedence so Homebrew comes before `/usr/bin` (e.g., add `export PATH="/opt/homebrew/bin:$PATH"` to `~/.zshrc` on Apple Silicon).
- Verify before work: `which git` should resolve to the Homebrew path; `git --version` should not include “Apple Git”.
- Keep updated via `brew upgrade git`. Optional companions: `brew install git-lfs gh delta` then `git lfs install`.
- In scripts or shell commands run by agents on macOS, invoke the Homebrew path explicitly to avoid PATH drift (e.g., `/opt/homebrew/bin/git ...`).

## Agent Workflow Addendum (Cursor Alignment)
- Canonical workflow: Diagnose → Design → Deliver → Verify → Audit.
- Long-term quality: maintainable, test-backed changes only; remove dead/legacy code; no placeholders (TODO/FIXME) or hidden fallbacks.
- Server-centric behavior: keep all render/OCR logic in API routes; avoid UI workarounds for server logic.
- OCR reliability: use Gemini with retries/backoff; environment-driven behavior; clean up temp artifacts; return actionable errors.
- Single source of truth: rely on `packages/config/src/env.ts` for limits and environment. Do not duplicate constants in app code.
- Communication: before significant commands, briefly state purpose and inputs; reference files with workspace-absolute paths and lines; validate outcomes in 1–2 lines; state assumptions if tests cannot run.
- Testing: add/update minimal unit and integration tests; for API behavior changes, include tests in `apps/web/src/app/api/__tests__/`; ensure `pnpm check` passes (lint, tests, build) before committing.
- Environment: Node ≥ 20 with pnpm workspace; key env vars and defaults are defined centrally in `packages/config/src/env.ts`.
- Commits: after green tests, commit with honest, precise, concise conventional messages.
- See `doc/core/work-flow.md` for detailed file map and product context.

### Operational Clarifications
- No generic advice: tailor suggestions to this repo only; no code changes without explicit approval per task.
- Deep diagnosis: survey at least two levels of related files before coding and remove dead/legacy code where found.
- Tooling discipline: prefer semantic search and efficient batch reads; before significant commands, state purpose/inputs; after, validate in 1–2 lines and self-correct if needed.
- Document gaps: clearly call out unfinished work or assumptions when local test validation isn’t possible.
- Typing and structure: avoid `any`; use explicit types; handle edge cases early; comment only to clarify intent; avoid unnecessary reformatting.
- Responses: use structured headings/bullets and succinct snippets for illustration, not large dumps.
