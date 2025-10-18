# Changelog

## 2025-10-18

- feat(admin-ai): deduplicate router agent config
  - Moved Router to data-only config to avoid drift between instances.
  - Files: `src/lib/admin/agents/router.ts`, `src/lib/admin/agents/index.ts`.
- feat(admin-ai): wire Agents SDK to project OpenAI client
  - Set default OpenAI client and API mode for Agents SDK; Responses API by default, override with `OPENAI_USE_RESPONSES=0` to force Chat Completions.
  - File: `src/lib/admin/chat/orchestrator-agentkit.ts`.
- feat(inventory): enable hosted `web_search` tool (sparse use)
  - Added `webSearchTool()` to Inventory for quick factual checks (publisher/edition disambiguation).
  - File: `src/lib/admin/agents/inventory.ts`.
- refactor(duplicates): unify duplicate match mapping
  - Extracted a single helper for transforming visual analysis to match schema.
  - File: `src/lib/admin/services/duplicates.ts`.
- refactor(openai): simplify Responses API typing
  - Removed unsafe casts; call `client.responses.create` directly and synthesize ChatCompletion without brittle usage mapping.
  - File: `src/lib/openai/responses.ts`.
- feat(openai): separate vision default model
  - Added `VISION_DEFAULT` and used as fallback when `OPENAI_VISION_MODEL` is unset.
  - Files: `src/lib/openai.ts`, `src/lib/openai/models.ts`.
- ui(admin-ai): reuse results cards in chat transcript
  - Message renderer now uses `DuplicateMatchesCard`, `SearchResultsList`, `BookSummaryCard`, `OrderUpdateCard` to avoid duplication.
  - File: `src/components/admin/ai-chat/MessageContent.tsx`.
- chore: remove unused import and document legacy API dir
  - Dropped unused `Image` import in `DuplicateMatchesCard`.
  - Added README to `src/app/api/admin/function-call` clarifying it is intentionally unused.

Validation: `npm run check:ci` passed (lint, typecheck, tests, build).
