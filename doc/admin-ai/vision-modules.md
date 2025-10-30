# Vision Modules — Structure and Contracts

Purpose
- Document how vision flows are organized after the structured-outputs refactor.
- Provide a reference for adding or extending vision functionality without reintroducing brittle parsing.

Overview (files)
- `src/lib/admin/services/vision/index.ts`
  - Public re-exports for all vision functions and helpers used across the app and tests.

- `src/lib/admin/services/vision/schemas.ts`
  - `visionStructuredResponseFormat(name, schema)` — wraps JSON Schema into OpenAI `response_format`.
  - `structuredVisionAnalysisSchema` — full VisionAnalysisResult JSON contract (we use structured‑only now).
  - `itemAnalysisSchema` — non-book item analysis contract.
  - `visualSimilaritySchema` — layout/content/confidence (0–1) contract.

- `src/lib/admin/services/vision/helpers.ts`
  - `callVisionJSON<T>(schemaName, schema, messages)` — standard helper to call the vision model via Chat Completions with `response_format` and parse JSON reliably.

- `src/lib/admin/services/vision/cover-analysis.ts`
  - `analyzeBookCover(args, adminEmail)` — structured‑only path using `structuredVisionAnalysisSchema`; appends `cover_url`.
  - Uses `callVisionJSON` and logs via `logAnalysisOperation`.

- `src/lib/admin/services/vision/similarity.ts`
  - `analyzeVisualSimilarity(newImageUrl, existingImageUrl)` — returns `{ layout_similarity, content_similarity, confidence }` using `visualSimilaritySchema`.

- `src/lib/admin/services/vision/item-analysis.ts`
  - `analyzeItemPhoto(imageUrl, adminEmail)` — returns `item_analysis.structured_data` for non-book items (Dharma items, Buddha statues) using `itemAnalysisSchema`.

- `src/lib/admin/services/vision/validation.ts`
  - `validateAnalysisResult(result)` — guards to verify a `VisionAnalysisResult` object.

Key Contracts & Invariants
- Always use strict JSON schemas (`response_format: { type: 'json_schema', strict: true }`) for vision outputs.
- Use Chat Completions for vision (images) and Responses/AgentKit for text orchestration.
- Include `cover_url` in structured cover/item results for downstream usage.
- Prefer `nullable` fields over `optional` in tool schemas (see AgentKit notes); prune `null` to `undefined` before service calls when needed.

Usage Examples
- Structured cover analysis:
```
const structured = await callVisionJSON('VisionAnalysisResult', structuredVisionAnalysisSchema, [
  { role: 'user', content: [
    { type: 'text', text: 'Extract as-is (do not translate). Return only valid JSON.' },
    { type: 'image_url', image_url: { url: standardizedUrl } },
  ] },
])
```

Adding a New Vision Flow
1) Define a schema constant in `schemas.ts` (use `nullable` for optional fields).
2) Implement a function in a new file under `vision/` (or extend an existing one):
   - Standardize URLs, call `callVisionJSON`, build the `AdminOperationResult`, and log via `logAnalysisOperation`.
3) If agent-triggered, add a matching tool in `src/lib/admin/agents/tools.ts`.
4) Update UI rendering in `src/components/admin/ai-chat/MessageContent.tsx` if new structured blocks are introduced.
5) Add unit tests under `test/admin-ai/` mocking `createVisionChatCompletion` to return JSON payloads.

References
- Orchestrated route: `src/app/api/admin/ai-chat/stream/orchestrated/route.ts`
- Orchestrator (AgentKit): `src/lib/admin/chat/orchestrator-agentkit.ts`
- Agents/Tools: `src/lib/admin/agents/**`
- Supabase helpers: `src/lib/db/**`
- OpenAI wrappers: `src/lib/openai/**`
