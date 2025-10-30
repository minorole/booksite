# Admin AI Session Report — 2025-10-30

This report documents, in detail, all analysis, design decisions, code changes, refactors, and documentation updates completed during the session. It is intended as an exhaustive, operator‑level and developer‑level artifact of record.

Contents
- Overview and Objectives
- Initial Diagnosis and Context
- Incremental Changes (Phase A)
- Behavioral Alignment to Owner Requirements
- Long‑Term Refactor (Phase B)
- OpenAI Config Improvements (Phase C)
- Documentation Updates (Phase D)
- UI Adjustments (Phase E)
- Validation and Tests
- Risk Notes, Rollback, and Follow‑ups
- File‑by‑File Change Log (with reasons)

---

## Overview and Objectives

Primary objectives defined during this session, based on owner guidance:

- Keep AgentKit orchestration and routing (Router → Vision → Inventory/Orders).
- Remove the two‑stage analysis pattern (“initial” then “structured”); use a single structured analysis only and only request the minimal fields needed.
- Make image embeddings mandatory for image flows; fail fast if the embedding service is unavailable (no soft fallback).
- Implement a top‑3 duplicate candidate selection policy: 1 candidate from image‑KNN (top match) + 2 candidates from text‑KNN (top text matches excluding the image‑top). Add a confidence gate: if the best fused score is low, skip vision visual comparison; otherwise compare the top candidates.
- Remove fallback re‑run behavior in the orchestrator (single pass only).
- Remove the unused content‑only streaming route.
- Improve logging/metrics to make troubleshooting clear when runs appear “stuck,” and emit assistant_done only on success (already implemented in initial steps).
- Then, refactor any oversized files into smaller modules along clear boundaries, preserving imports and behavior.
- Update the documentation to reflect the new behavior and the structural refactor; append a single ADR line noting the shift to structured‑only and embeddings‑required.

---

## Initial Diagnosis and Context

1) Mapped current flow when an admin submits an image:
   - Upload goes to Cloudinary via signed upload (client) or the server upload route as a fallback.
   - Admin opens a streaming chat session (`/api/admin/ai-chat/stream/orchestrated`), which provides SSE events.
   - Router agent detects an image and hands off to the Vision agent.
   - Vision tools run: historically “initial” → “structured” analysis → duplicate check.

2) Observed “stuck” run behavior in logs:
   - Server logs reported “Max turns (12) exceeded”. No clear summary of tool names or durations.
   - Client logs showed tool_start/tool_result events but no clear correlation/context.

3) Root causes identified:
   - AgentKit might re‑enter tool calls (or struggle to conclude) within the max‑turn limit.
   - Logs lacked granular visibility (tool names, args size, durations, turns count), complicating diagnosis.

4) Early fixes applied prior to the “big update” (Phase A below):
   - Added tool lifecycle logs (name/id/args size, duration).
   - Added per‑request tool call deduplication (skip identical calls in the same request).
   - Emit assistant_done only on success; on error, SSE “error” event is now the terminal signal.
   - Client console now logs tool name/id for tool events.

---

## Incremental Changes (Phase A)

Purpose: Unblock clarity/safety immediately and reduce loops.

Key changes:

1) Logging and metrics improvements
   - Added server logs for tool_start and tool_result with durations, args size, name/id.
   - Counted turns/toolCalls/handoffs for better visibility.
   - Files changed:
     - `src/lib/admin/chat/orchestrator-agentkit.ts` (multiple blocks; see file log section)
     - `src/app/api/admin/ai-chat/stream/orchestrated/route.ts` (enriched error logs with metrics and maxTurns)
     - `src/components/admin/ai-chat/hooks/useChatSession.ts` (client console logs now include tool name/id)

2) Per‑request tool-call dedup
   - Introduced a request‑scoped cache in AsyncLocalStorage to skip repeated identical tool calls within a single request.
   - Files changed:
     - `src/lib/runtime/request-context.ts` (added `toolCalls` cache and getter)
     - `src/lib/admin/agents/tools.ts` (initially; later moved into `tooling/common.ts`)

3) Assistant_done only on success
   - Moved assistant_done emission out of `finally` and into the success path of the orchestrator.
   - Files changed:
     - `src/lib/admin/chat/orchestrator-agentkit.ts`

4) Preliminary constraints on Vision agent
   - Tightened prompt to “call each vision tool at most once per image,” setting the stage for structured‑only changes.
   - Files changed:
     - `src/lib/admin/agents/vision.ts`

Outcome: These changes increased observability and reduced redundant tool churn. Runs still used a two‑stage analysis at that point (which would shortly change to structured‑only per the owner’s mandate).

---

## Behavioral Alignment to Owner Requirements

Owner asked to implement the following behavioral changes across the board (“big update”):

1) One‑shot analysis only
   - Removed “initial” stage entirely.
   - Vision agent now calls only a single structured analysis and requests only the fields we actually need.

2) Image embeddings: always required
   - Duplicate checks and create/update flows compute image embeddings unconditionally when `cover_image` exists.
   - Fail fast if the embedding service is not configured or returns an error (no toggle, no fallback).

3) Duplicate candidate policy
   - Select exactly 3 candidates: 1 top image‑KNN match and 2 top text‑KNN matches (excluding the image‑top id).
   - Compute a fused score for the best candidate (0.6 text + 0.4 image). If the best fused score is below 0.6, skip vision visual comparison; otherwise compare the selected candidates.

4) No fallback rerun
   - The orchestrator executes a single pass only. The prior fallback re‑run mechanism is removed alongside its toggle.

5) Remove unused route
   - Deleted the content‑only streaming route (`/api/admin/ai-chat/stream/text`), as the Admin UI uses the orchestrated route.

6) Remove any vestigial “natural_analysis” references in types/UI
   - Eliminated UI code path and results type fields for `natural_analysis`.

All of the above are implemented; see File‑by‑File Change Log for details and exact paths.

---

## Long‑Term Refactor (Phase B)

Purpose: Reduce module size and improve maintainability by aligning code to domain boundaries and responsibilities.

1) Split tools by domain with a small shared helper module
   - New files:
     - `src/lib/admin/agents/tooling/common.ts` — shared AgentContext; stable stringify; duplicate‑call guard; `buildCheckDuplicatesTool()`.
     - `src/lib/admin/agents/tooling/vision.ts` — `analyze_book_cover` (structured‑only), `analyze_item_photo`, `check_duplicates` via builder.
     - `src/lib/admin/agents/tooling/inventory.ts` — `create_book`, `update_book`, `search_books`, `adjust_book_quantity`, `check_duplicates`.
     - `src/lib/admin/agents/tooling/orders.ts` — `update_order`, `get_order`, `search_orders`.
     - `src/lib/admin/agents/tooling/index.ts` — barrel for `visionTools`, `inventoryTools`, `orderTools`, `getToolsForAgent`, `getDomainToolNames`.
   - Existing file `src/lib/admin/agents/tools.ts` now re‑exports from tooling index (2 lines), keeping external imports stable.

2) Factor orchestrator helper utilities
   - New files:
     - `src/lib/admin/chat/to-agent-input.ts` — input conversion extracted from the orchestrator.
     - `src/lib/admin/chat/logging.ts` — compact raw model logging function and state type.
     - `src/lib/admin/chat/metrics.ts` — tiny run metrics aggregator (turns/toolCalls/handoffs).
   - Orchestrator (`src/lib/admin/chat/orchestrator-agentkit.ts`) now imports these helpers and focuses on the run loop. Size reduced to 243 lines (previously 400+).

Outcome: The two previously large files are now below 300 lines (or minimal, in the case of the barrel), and responsibilities are split across cohesive modules. External imports remain stable via barrels.

---

## OpenAI Config Improvements (Phase C)

Purpose: Clean up the central OpenAI config and make it more flexible without changing behavior by default.

Changes:

1) Removed unused `ROLES` and centralized env parsing
   - `OPENAI_MAX_RETRIES` and new per‑kind envs now read via `src/lib/config/env.ts` helpers.

2) Per‑kind retries/timeouts
   - Introduced `OPENAI_CONFIG.RETRIES.{text, vision}` and `OPENAI_CONFIG.TIMEOUTS.{text, vision}`.
   - Wrappers now request admin clients with an explicit kind:
     - Chat: `getAdminClient('text')`
     - Vision: `getAdminClient('vision')`
   - This enables operators to tune behavior for text vs. vision independently via env without changing code.

3) Re‑export model helpers from the central module
   - Re‑exported `getModel` and `getEmbeddingModel` via `src/lib/openai.ts` to keep a single surface for consumers, while implementation remains in `openai/models.ts`.

Outcome: Cleaner config, better tunability, no behavior changes unless envs are set. All wrappers/build validated.

---

## Documentation Updates (Phase D)

Updated documents to reflect new behavior and the refactor:

1) `AGENTS.md`
   - Security & Configuration: added `CLIP_EMBEDDINGS_URL` to required envs for image flows.

2) `doc/admin-ai/features.md`
   - One‑shot structured analysis.
   - Embeddings required.
   - Duplicate policy: top‑3 selection with confidence‑gated visual compare.
   - No rerun fallback (single pass).

3) `doc/admin-ai/vision-modules.md`
   - Removed references to the initial schema.
   - Documented structured‑only flow and updated examples.

4) `doc/admin-ai/agentkit-integration-notes.md`
   - CLIP required for image flows.
   - Tools are now split by domain (`tooling/`).
   - Structured‑only analysis; no fallback rerun.
   - Duplicate policy documented.

5) `doc/admin-ai/e2e-manual-test.md`
   - Updated “Vision tool list” and SSE expectations to structured‑only.
   - Updated checklist entries accordingly.

6) `src/lib/admin/README.md`
   - Sequence diagrams and JSON examples updated to structured‑only.
   - Removed mention of the deleted text stream route.

7) ADR
   - `doc/adr/0004-admin-ai-simplification-responses-structured-outputs.md` — appended a one‑line update noting: “Vision is now one‑shot structured analysis; embeddings required; removed content‑only streaming route.”

---

## UI Adjustments (Phase E)

1) Remove natural_analysis rendering
   - `src/components/admin/ai-chat/MessageContent.tsx` no longer renders a `vision.natural_analysis` panel. The structured analysis card remains.

2) Update result types
   - `src/lib/admin/types/results.ts` updated so `vision_analysis.stage` is `'structured'` only; removed `natural_analysis` type.

Outcome: The UI reflects structured‑only analysis; duplicate and search cards continue to function unchanged.

---

## Validation and Tests

1) Lint and Build
   - `npm run lint` — passed throughout.
   - `npm run build` — successful with all routes; deleted content‑only route no longer listed.

2) Tests
   - Running `npm test` now (Vitest) — 30 test files, 78 tests passed.
   - Some tests log expected “Missing OPENAI_API_KEY” warnings in mocked contexts; tests still pass.
   - Suites cover:
     - Admin AI: vision service, agent normalizer, tool scope.
     - SSE events.
     - Security limits, locale handling, paths.
   - No new tests were added in this session. Proposed next step: add a unit test for the top‑3 duplicate policy including the fused confidence gate.

---

## Risk Notes, Rollback, and Follow‑ups

Risks
- CLIP now required for image flows. If env is missing or the service is down, image duplicate checks and create/update embedding upserts will fail fast. This is by design per owner direction.
- The removal of natural_analysis may reveal any external integrations that relied on that field downstream; none were identified in the repo during search.

Rollback
- Re‑introduce “initial” analysis would require restoring the removed initial schema and tool parameters; not recommended.
- Re‑enable fallback rerun would require adding back the toggle and code in the orchestrator; not recommended.
- Restore content‑only streaming route by re‑adding `src/app/api/admin/ai-chat/stream/text/route.ts`; unused by the Admin UI and not recommended.

Follow‑ups
- Add tests for the new duplicate policy and fused threshold.
- Update any screenshots in docs to match structured‑only tool outputs.
- Consider surfacing confidence or selection policy in the UI “Details” panel.
- Optionally centralize “final event” SSE after assistant_done for explicit status, if desired.

---

## File‑by‑File Change Log (with reasons)

This section enumerates every file changed/added/deleted, along with the rationale for the change.

### A) Behavior and Services

1) `src/lib/admin/services/vision/cover-analysis.ts`
- What: Removed the “initial” branch; structured‑only analysis call remains.
- Why: Owner requested single structured analysis step; reduces token use and complexity.
- Details:
  - Now calls `callVisionJSON` once with `structuredVisionAnalysisSchema`.
  - Always appends `cover_url` to the structured result.
  - Logs `STRUCTURED_ANALYSIS` only.

2) `src/lib/admin/services/vision/schemas.ts`
- What: Removed `initialCoverAnalysisSchema`.
- Why: Initial stage is no longer used anywhere; delete dead code.

3) `src/lib/admin/services/duplicates.ts`
- What: Implemented required embeddings and top‑3 policy with fused score gate.
- Why: Owner requirement for deterministic and efficient duplicate checking.
- Details:
  - Always compute image embedding via `createImageEmbeddingClip` when `cover_image` exists.
  - Build maps of text scores and image scores; fused score = 0.6*text + 0.4*image.
  - Selected candidates: 1 from image‑KNN top, and 2 from text‑KNN top excluding the image top id.
  - If best fused < 0.6, skip visual comparison entirely; otherwise run `analyzeVisualSimilarity` on the selected candidates.
  - Logs CHECK_DUPLICATE with search criteria and match counts.

4) `src/lib/admin/services/books.ts`
- What: Mandated image embedding upsert on create/update when a cover image is present (removed toggles/soft error behavior).
- Why: Owner requirement for embeddings to always be present; fail fast if not available.
- Details:
  - On create: always compute image embedding and upsert.
  - On update: if `cover_image` supplied in the patch, compute embedding and upsert.

5) `src/lib/admin/services/image-embeddings/openclip.ts` (read only)
- What: Verified it already fails if `CLIP_EMBEDDINGS_URL` is missing; no change made.
- Why: Behavior aligned with fail‑fast directive.

### B) Tools and Agents

6) `src/lib/admin/agents/vision.ts`
- What: Updated instructions to a one‑shot structured analysis; no mention of “initial”.
- Why: Owner requirement; instruct the agent to do exactly what server policies allow.

7) `src/lib/admin/agents/tools.ts`
- What: Refactored to a barrel that re‑exports from `tooling/`.
- Why: Reduce file size and align with domain modularization; keep external imports stable.

8) New `src/lib/admin/agents/tooling/common.ts`
- What: Shared AgentContext; duplicate‑call guard (`shouldSkipDuplicateCall`), `stableStringify`; `buildCheckDuplicatesTool`.
- Why: Avoid duplication and keep shared tooling helpers in one place.

9) New `src/lib/admin/agents/tooling/vision.ts`
- What: `visionTools()` contains `analyze_book_cover` (structured‑only), `check_duplicates`, and `analyze_item_photo`.
- Why: Domain split; reflect owner behavior changes.

10) New `src/lib/admin/agents/tooling/inventory.ts`
- What: `inventoryTools()` contains inventory domain tools and reuses `check_duplicates` via the builder.
- Why: Domain split; isolate inventory responsibilities.

11) New `src/lib/admin/agents/tooling/orders.ts`
- What: `orderTools()` contains orders domain tools (update, get, search).
- Why: Domain split; isolate orders responsibilities.

12) New `src/lib/admin/agents/tooling/index.ts`
- What: Barrel export for domain tools (`visionTools`, `inventoryTools`, `orderTools`) and helpers `getToolsForAgent`, `getDomainToolNames`.
- Why: Keep external imports stable and provide a single source of truth for tool discovery.

### C) Orchestrator and Streaming Route

13) `src/lib/admin/chat/orchestrator-agentkit.ts`
- What (Phase A):
  - Added metrics counters (turns/toolCalls/handoffs), tool lifecycle logs with durations/args size, raw model logging compactor moved to a helper, and success‑only assistant_done emission.
- What (Phase B):
  - Extracted `toAgentInput` to a new module.
  - Imported new logging/metrics helpers.
  - Removed fallback rerun logic.
- Why: Observability, single‑pass policy, and separation of concerns.

14) New `src/lib/admin/chat/to-agent-input.ts`
- What: Move the message→AgentKit input conversion here.
- Why: Keep the orchestrator focused on the run loop.

15) New `src/lib/admin/chat/logging.ts`
- What: Raw model event compact logger and state type.
- Why: Encapsulate logging logic for reuse/clarity.

16) New `src/lib/admin/chat/metrics.ts`
- What: Tiny helper to increment and snapshot run metrics.
- Why: Avoid ad‑hoc counters; make behavior explicit.

17) `src/app/api/admin/ai-chat/stream/orchestrated/route.ts`
- What: Enrich route error logs with metrics and maxTurns; kept existing SSE event shape.
- Why: Improve operator clarity when runs stop due to turn limits or errors.

18) Deleted `src/app/api/admin/ai-chat/stream/text/route.ts`
- What: Removed content‑only streaming route.
- Why: Unused by Admin UI and requested by owner to remove no‑longer‑needed routes.

### D) OpenAI Config and Wrappers

19) `src/lib/openai.ts`
- What: Removed `ROLES`; introduced per‑kind RETRIES and TIMEOUTS; centralized env parsing via `env` getters; re‑exported `getModel`, `getEmbeddingModel`.
- Why: Cleaner contract; tunable behavior per path; single surface for model helpers.

20) `src/lib/config/env.ts`
- What: Added optional getters for `OPENAI_MAX_RETRIES`, `OPENAI_TEXT_MAX_RETRIES`, `OPENAI_VISION_MAX_RETRIES`, `OPENAI_TEXT_TIMEOUT_MS`, `OPENAI_VISION_TIMEOUT_MS`.
- Why: Centralize env handling for OpenAI config; avoid direct `process.env` usage in modules.

21) `src/lib/openai/client.ts`
- What: Updated `getOpenAIClient` to accept `kind: 'text' | 'vision'` and use per‑kind retries and timeouts; updated `getAdminClient` and `getUserClient` to pass kind.
- Why: Correctly apply per‑kind tuning.

22) `src/lib/openai/chat.ts`
- What: Use `getAdminClient('text')` explicitly.
- Why: Follow per‑kind client pattern.

23) `src/lib/openai/vision.ts`
- What: Use `getAdminClient('vision')` explicitly.
- Why: Follow per‑kind client pattern.

24) `src/lib/admin/chat/orchestrator-agentkit.ts`
- What: Set default OpenAI client for Agents SDK using `getAdminClient('text')`.
- Why: Ensure the Agents SDK uses the text path client for the orchestrator.

### E) UI and Types

25) `src/components/admin/ai-chat/MessageContent.tsx`
- What: Removed rendering for `vision.natural_analysis`; retained structured_data and other cards.
- Why: No longer produced; remove dead UI path.

26) `src/lib/admin/types/results.ts`
- What: Type narrowed to `stage: 'structured'` only; removed `natural_analysis` from `vision_analysis`.
- Why: Align types with new behavior.

### F) Documentation

27) `AGENTS.md`
- What: Required envs now include `CLIP_EMBEDDINGS_URL` for image flows.
- Why: Embeddings are mandatory.

28) `doc/admin-ai/features.md`
- What: Updated to structured‑only analysis; embeddings required; top‑3 duplicate policy and confidence gate.
- Why: Reflect new behavior.

29) `doc/admin-ai/vision-modules.md`
- What: Removed initial schema references; updated examples.
- Why: Reflect structured‑only flow.

30) `doc/admin-ai/agentkit-integration-notes.md`
- What: CLIP required; tools split by domain; no fallback rerun; updated duplicate policy note.
- Why: Keep integration notes current.

31) `doc/admin-ai/e2e-manual-test.md`
- What: Updated tool expectations and SSE steps to structured‑only.
- Why: Keep manual validation aligned to behavior.

32) `src/lib/admin/README.md`
- What: Sequence and JSON examples updated; removed text route mention.
- Why: Reflect structured‑only and deleted route.

33) `doc/adr/0004-admin-ai-simplification-responses-structured-outputs.md`
- What: Appended a one‑line update noting structured‑only and embeddings required.
- Why: ADR trail update per owner request.

---

## End of Report

