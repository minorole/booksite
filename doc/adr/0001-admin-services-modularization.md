# ADR 0001: Admin Function Handlers Modularization

Status: Accepted
Date: 2025-10-13

Context
The file `src/lib/admin/function-handlers.ts` had grown to ~943 lines and mixed unrelated responsibilities:

- Vision analysis (cover analysis, visual similarity, validation)
- Duplicate detection (text + visual)
- Book CRUD and search
- Order updates
- Generic helpers and logging
- A deprecated end‑to‑end function and placeholder helpers returning `undefined`

This size and coupling made changes risky and hard to test. The repo’s guidelines require server‑centric, maintainable modules with no placeholders.

Decision
Split `function-handlers.ts` into focused service modules and keep the public API stable via a barrel re‑export. Remove the deprecated function and dead placeholders. Add a minimal improvement to initial vision analysis so it returns real, structured data without placeholders.

Changes

- Barrel re‑export
  - `src/lib/admin/function-handlers.ts` now re‑exports from services only.

- New services (server‑side logic remains under `src/lib/admin/`):
  - `src/lib/admin/services/utils.ts` — `isValidUUID`, `handleOperationError`, `toBookBase`
  - `src/lib/admin/services/logging.ts` — `logAnalysisOperation` wrapper (uses `logAdminAction`)
  - `src/lib/admin/services/vision.ts` — `analyzeBookCover`, `validateAnalysisResult`, `analyzeVisualSimilarity`, `retryAnalysis`
  - `src/lib/admin/services/duplicates.ts` — `checkDuplicates`, `analyzeResults`
  - `src/lib/admin/services/books.ts` — `createBook`, `updateBook`, `searchBooks`
  - `src/lib/admin/services/orders.ts` — `updateOrder`

- API dispatch preserved
  - `src/app/api/admin/function-call/route.ts` continues importing from `@/lib/admin/function-handlers`.
  - Removed deprecated switch case for `analyze_book_and_check_duplicates`.

- Types update
  - `src/lib/admin/types.ts`: add `summary?: string` to `data.vision_analysis.natural_analysis` so the initial step returns useful text plus parsed fields (no placeholders).

- Removed code
  - Deprecated `analyzeBookAndCheckDuplicates` and its API route case.
  - Placeholder helpers in `function-handlers.ts` that returned `undefined` (title/author/publisher extraction, category suggestion, quality issues).

API Invariants

- Imports for existing tools remain the same: the barrel re‑exports preserve `analyzeBookCover`, `checkDuplicates`, `createBook`, `updateBook`, `searchBooks`, `updateOrder`.
- Vision structured analysis still returns `VisionAnalysisResult` as before.
- Duplicate, CRUD, and order update behaviors unchanged.
- Initial analysis now includes `natural_analysis.summary` and parsed candidate fields derived from a final JSON object in the model output.

Verification

1. Lint/build (after installing deps):
   - `npm install`
   - `npm run lint && npm run build`
   - Note: lint failed prior to install due to a missing ESLint config. Install resolves this.
2. Quick API checks (requires admin auth in your environment):
   - POST `/api/admin/function-call` with `name: "analyze_book_cover"` and `{ image_url, stage: "initial" }` — expect `data.vision_analysis.natural_analysis` with `summary` and optional fields.
   - POST `/api/admin/function-call` with `stage: "structured"` and `confirmed_info` — expect `structured_data` matching `VisionAnalysisResult`.
   - POST `/api/admin/function-call` with `name: "check_duplicates"` — expect `duplicate_detection` and `search` data.
   - POST `/api/admin/function-call` with `name: "create_book" | "update_book" | "search_books" | "update_order"` — unchanged behavior.

Consequences

- Pros: smaller modules, clearer responsibilities, easier testing, no placeholders, stable API surface for routes.
- Cons: one small type addition (`summary`) and a minor logging metadata shape (type included in analysis logs). If strict metadata shape is required, adjust wrapper.

Rollback

- Revert the service files and restore the previous `src/lib/admin/function-handlers.ts` from VCS.
- Re‑add the deprecated API switch case in `src/app/api/admin/function-call/route.ts` if needed.

Follow‑ups (Optional)

- UI: `src/components/admin/ai-chat/chat-interface.tsx` currently renders initial analysis by reading tool call args. Consider rendering the tool message (function result) to display the parsed `natural_analysis` reliably.
- Tests: add minimal unit tests for `vision.validateAnalysisResult` and `duplicates.analyzeResults`.
- OpenAI: if `vision.ts` grows, consider extracting streaming helpers (still centralized via `src/lib/openai.ts`).
