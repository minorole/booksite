# AgentKit Integration Notes — Admin AI

Purpose
- Capture practical findings from integrating OpenAI AgentKit and structured outputs so future devs can move fast and avoid token burn.

Scope
- Applies to admin AI chat orchestration, agents, tools, and the vision pipeline in this repo.

Quick Start
- Env: set `OPENAI_API_KEY` and (recommended) `OPENAI_DEFAULT_MODEL=gpt-5-mini`.
- Entry point: `src/app/api/admin/ai-chat/stream/orchestrated/route.ts:29` streams SSE using AgentKit.
- Agents/Tools: see `src/lib/admin/agents/**` and `src/lib/admin/agents/tools.ts:1`.
- SSE events consumed by UI: `assistant_delta`, `assistant_done`, `tool_start`, `tool_result`, `tool_append`, plus `handoff` when the active agent changes.

Gotchas & Time Savers
1) Zod schemas for tools: avoid `optional()`
- Responses/Agents tooling doesn’t allow optional fields in JSON schemas for tools/structured outputs. Use `z.string().nullable()` for optional string fields.
- Pattern: Accept `null` from the model, then prune `null` → `undefined` before calling service methods that expect optionals.
  - Examples:
    - Update book pruning: `src/lib/admin/agents/tools.ts:108`
    - Search pruning: `src/lib/admin/agents/tools.ts:138`
    - Order update pruning: `src/lib/admin/agents/tools.ts:158`

2) Vision: structured outputs with images
- We enforce JSON via `response_format: { type: 'json_schema', strict: true }` on Chat Completions to preserve image inputs.
- Initial stage returns `{ summary, title_zh/en, author_zh/en, publisher_zh/en, category_suggestion, quality_issues }` with required+nullable fields.
- Structured stage strictly matches `VisionAnalysisResult` (see `src/lib/admin/services/vision.ts:213`).
- Similarity returns `{ layout_similarity, content_similarity, confidence }` strictly.
- Removed brittle parsing: no regex or “last JSON” scraping, no retry path.

3) Package versions & types
- Keep top-level `openai@^4` for existing wrappers (chat/vision). AgentKit brings `openai@^5` internally; avoid crossing types between them.
- AgentKit docs mention Node 22+, but the server route runs fine on Node 20.19.5. Verify after Node bumps.

4) Routing heuristics vs agents
- Removed route-level heuristics (image/order) and forced tool_choice. The Router agent handles handoffs. Keep prompts per agent small and focused.
- The streaming route ignores `imageUrl`/`confirmedInfo` in payload; pass them within the messages if needed (e.g., user-provided confirmations as text).

5) SSE bridge
- `handoff`: `{ to: agentName }` — emitted when AgentKit reports `agent_updated_stream_event` (`src/lib/admin/chat/orchestrator-agentkit.ts:69`).
- `assistant_delta`: emit each `output_text` segment.
- `tool_start`, `tool_result`, `tool_append`: mapped from Function Call/Result events.

Adding a New Tool
- Define Zod schema with required fields; use `nullable()` instead of `optional()`.
- Implement `execute` by calling service functions; prune nulls as needed.
- Export from `getToolsForAgent(...)` if agent-scoped, or add directly to the agent.

Adding a New Agent
- Create a file under `src/lib/admin/agents/` with concise `instructions`, a `handoffDescription`, and its tools.
- Register it in `src/lib/admin/agents/index.ts` and, if it’s a new branch, add it to the Router handoffs.

Testing
- Unit test tools/agents without network: construct tools and ensure they exist (no tool names typo), and that pruning runs.
- Keep existing mocks for OpenAI/Supabase (see `test/admin-ai/**`). Avoid live LLM calls in tests.

Operational Tips
- For OCR quality: instruct “Extract text as-is; do not translate.” Ask for manual confirmation when confidence < threshold.
- For duplicate detection: keep Supabase search + one vision compare now; add pgvector later if recall/precision becomes an issue.

Where to Look
- Route: `src/app/api/admin/ai-chat/stream/orchestrated/route.ts:29`
- Orchestrator: `src/lib/admin/chat/orchestrator-agentkit.ts:1`
- Agents/Tools: `src/lib/admin/agents/**`
- Vision service: `src/lib/admin/services/vision.ts:150, 213, 264`
- OpenAI vision wrapper: `src/lib/openai/vision.ts:1`

