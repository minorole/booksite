# AgentKit Integration Notes — Admin AI

Purpose

- Capture practical findings from integrating OpenAI AgentKit and structured outputs so future devs can move fast and avoid token burn.

Scope

- Applies to admin AI chat orchestration, agents, tools, and the vision pipeline in this repo.

Quick Start

- Env: set `OPENAI_API_KEY` and (recommended) `OPENAI_DEFAULT_MODEL=gpt-5-mini`. For image flows, `CLIP_EMBEDDINGS_URL` is required.
- Entry point: `src/app/api/admin/ai-chat/stream/orchestrated/route.ts` streams SSE using AgentKit.
- Agents/Tools: see `src/lib/admin/agents/**` (tools split by domain under `tooling/`).
- SSE events consumed by UI: `handoff`, `assistant_delta`, `assistant_done`, `tool_start`, `tool_result`, `tool_append`.

Gotchas & Time Savers

1. Zod schemas for tools: avoid `optional()`

- Responses/Agents tooling doesn’t allow optional fields in JSON schemas for tools/structured outputs. Use `z.string().nullable()` for optional string fields.
- Pattern: Accept `null` from the model, then prune `null` → `undefined` before calling service methods that expect optionals.
  - Examples:
    - Update book pruning: `src/lib/admin/agents/tools.ts:108`
    - Search pruning: `src/lib/admin/agents/tools.ts:138`
    - Order update pruning: `src/lib/admin/agents/tools.ts:158`

2. Vision: structured outputs with images (one‑shot)

- We enforce JSON via `response_format: { type: 'json_schema', strict: true }` on Chat Completions to preserve image inputs.
- Analysis is structured‑only; no separate “initial” stage. Similarity returns `{ layout_similarity, content_similarity, confidence }` strictly.
- Removed brittle parsing: no regex or “last JSON” scraping, no retry path.

3. Package versions & types

- Keep top-level `openai@^4` for existing wrappers (chat/vision). AgentKit brings `openai@^5` internally; avoid crossing types between them.
- AgentKit docs mention Node 22+, but the server route runs fine on Node 20.19.5. Verify after Node bumps.

4. Routing heuristics vs agents

- The Router agent handles handoffs; no route‑level heuristics or fallback reruns. Keep prompts per agent small and focused.
- Confirmation is enforced at the tool layer: mutating tools require `confirmed: true` param. No visible UI modal; agents include `confirmed: true` only after explicit admin confirmation in chat.

5. SSE bridge

- `handoff`: `{ to: agentName }` — emitted when AgentKit reports `agent_updated_stream_event`.
- `assistant_delta`: emit each `output_text` segment.
- `tool_start`, `tool_result`, `tool_append`: mapped from Function Call/Result events.
  - Event contract (Option B): `tool_result.result` carries the unwrapped domain `data` (if present); `tool_append.message.content` keeps the full envelope JSON for chat summaries.

Adding a New Tool

- Define Zod schema with required fields; use `nullable()` instead of `optional()`.
- Implement `execute` by calling service functions; prune nulls as needed.
- For mutating tools, add a `confirmed: z.boolean()` parameter and reject if not true.
- Export from `getToolsForAgent(...)` if agent-scoped, or add directly to the agent.

Adding a New Agent

- Create a file under `src/lib/admin/agents/` with concise `instructions`, a `handoffDescription`, and its tools.
- Register it in `src/lib/admin/agents/index.ts` and, if it’s a new branch, add it to the Router handoffs.

Testing

- Unit test tools/agents without network: construct tools and ensure they exist (no tool names typo), and that pruning runs.
- Keep existing mocks for OpenAI/Supabase (see `test/admin-ai/**`). Avoid live LLM calls in tests.

Operational Tips

- For OCR quality: instruct “Extract text as-is; do not translate.” Ask for manual confirmation when confidence < threshold.
- For duplicate detection: always compute image embeddings; pick top‑3 candidates (1 image‑KNN + 2 text‑KNN). Skip visual compare when confidence is low; otherwise compare selected candidates.
- Avoid UI confirmation surfaces; keep confirmation in chat and enforce via tool parameter.

Where to Look

- Route: `src/app/api/admin/ai-chat/stream/orchestrated/route.ts`
- Orchestrator: `src/lib/admin/chat/orchestrator-agentkit.ts`
- Agents/Tools: `src/lib/admin/agents/**`
- Vision service modules: `src/lib/admin/services/vision/{cover-analysis,similarity,item-analysis,validation,schemas,helpers}.ts`
- OpenAI vision wrapper: `src/lib/openai/vision.ts`

Future Enhancements / Known Gaps

- Chat UI renders rich panels for duplicates/search/create/update; continue to refine.
- Add simple quantity increment/decrement tool and low‑stock warnings.
- Orders: warn when stock is short; expose `admin_notes` and `override_monthly` in `update_order` tool.
- Observability: add Sentry and request IDs to route + orchestrator logs (request_id already displayed in UI).
- Duplicates: introduce pgvector/embeddings pipeline when needed.
- Uploads: migrate to signed direct Cloudinary uploads with webhook processing.
- Tests: add E2E‑style test for `/api/admin/ai-chat/stream/orchestrated` with mocked RL/CC and AgentKit events.
