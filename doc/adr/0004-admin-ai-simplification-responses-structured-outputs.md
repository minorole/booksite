# ADR 0004: Admin AI Simplification — OpenAI Responses + Structured Outputs, Streaming‑Only, OpenAI‑Only

Status: Accepted (implemented, refreshed)
Date: 2025-10-16

Update (2025-10-30): Vision flow is now one‑shot structured analysis (no initial stage). Image embeddings are required for image flows; content‑only streaming route removed.

Context
The admin AI accumulated complexity across multiple layers:
- Brittle JSON handling in the vision flow, scraping JSON out of free‑text and retrying on failure (legacy; now replaced by strict JSON schemas).
- Partial usage of the OpenAI Responses API only for safe, non‑tool, non‑streaming cases (see `src/lib/openai/chat.ts:32`), leaving tools and vision on Chat Completions without structured outputs.
- Duplicated API paths for chat: a legacy non‑stream route and a streaming orchestration route; the UI uses the streaming path only.
- Outdated prompt wording referenced GPT‑4o, while the configured default model is GPT‑5‑mini (legacy prompt removed; default model centrally configured).

Research inputs are captured in `doc/admin-ai/llm-comparison.md`, which recommends GPT‑5‑mini + Responses API with structured outputs, OpenAI Agents primitives when helpful, and image embeddings as a later optimization. The same brief advises against relying on Gemini for this project.

Decision
1) Use OpenAI Responses API with structured outputs for all vision JSON returns.
   - Replace free‑text → JSON scraping in `analyzeBookCover` (structured stage) with response_format JSON schema.
   - Replace regex parsing in `analyzeVisualSimilarity` with a small JSON schema `{ layout_similarity, content_similarity, confidence }`.
   - Keep Chat Completions for vision specifically (to preserve image inputs) with `response_format: { type: 'json_schema', strict: true }`.

2) Consolidate to the streaming orchestrator path and remove dead code.
   - Keep `src/app/api/admin/ai-chat/stream/orchestrated/route.ts` (server‑orchestrated streaming with tool execution via SSE events) using AgentKit.
   - Remove the legacy non‑stream route and its orchestrator (deleted).

3) Remain OpenAI‑only; no Gemini fallback.
   - All chat/vision stays on OpenAI (GPT‑5‑mini by default); improve OCR reliability with structured outputs and precise prompts instead of vendor fallback.

4) Keep duplicate detection simple for now; pgvector optional later.
   - Maintain Supabase text search in `src/lib/db/admin/duplicates.ts` and a single vision comparison (`src/lib/admin/services/vision/similarity.ts`).
   - Revisit pgvector for text/image embeddings only if recall/precision issues emerge at scale.

5) Add minimal, high‑value unit tests under `test/` to pin contracts.
   - Vision structured stage returns typed JSON with `cover_url`.
   - Vision similarity parses numeric scores via strict JSON.
   - Orchestrated streaming executes tool calls and emits lifecycle events + handoffs.
   - Model selection defaults to GPT‑5‑mini when env overrides are absent.

Changes (Refreshed)
- Code removal (completed):
  - Deleted legacy non‑stream chat route: `src/app/api/admin/ai-chat/route.ts`.
  - Deleted non‑stream orchestrator: `src/lib/admin/chat/orchestrator.ts`.
  - Deleted legacy system prompts file referencing GPT‑4o: `src/lib/admin/system-prompts.ts`.
  - Deleted old Chat Completions tool scaffolding (definitions/handlers).

- Tests (added/updated):
  - `test/admin-ai/vision.service.test.ts` — structured stage success/error + schema validation.
  - `test/admin-ai/vision.similarity.test.ts` — similarity JSON parsing.
  - `test/admin-ai/orchestrator.events.test.ts` — AgentKit stream: handoff, assistant deltas, tool lifecycle, JSON result mapping.
  - `test/admin-ai/item.service.test.ts` — item analysis returns structured data with cover_url.
  - `test/admin-ai/agentkit.tools-scope.test.ts` — tool registry coverage (includes new tools).
  - `test/security.limits.test.ts` — route-specific rate limit policy for SSE path.
  - `test/openai.models.test.ts` — default model resolution.

- Streaming orchestrator (retained, AgentKit):
  - `runChatWithAgentsStream` streams assistant deltas and executes tools (`src/lib/admin/chat/orchestrator-agentkit.ts`).
  - Emits `handoff`, `assistant_delta`, `tool_start`, `tool_result`, and `tool_append` events; logs FUNCTION_CALL/FUNCTION_SUCCESS.

- OpenAI wrappers:
  - Vision uses Chat Completions with `response_format` for images (strict JSON).
  - Partial Responses remain optional for non‑tool, non‑stream paths.
  - Default model selection to GPT‑5‑mini.

- Prompts:
  - Removed legacy system prompt file referencing GPT‑4o; agent instructions reside alongside agent definitions.

Out of Scope (for this ADR)
- Introducing pgvector and embeddings in the initial simplification. This remains a future optimization once we see real duplicate‑detection pain.
- Adding Gemini or other model vendors as fallbacks.

Alternatives Considered
- Keep Chat Completions + manual JSON parsing: rejected due to brittleness and higher maintenance cost versus structured outputs.
- Adopt pgvector now: deferred; current admin‑in‑the‑loop plus one vision comparison is sufficient at present scale.
- Multi‑vendor stack with Gemini for OCR: rejected per project directive to stay OpenAI‑only and the added operational complexity.

Consequences
- Pros:
  - Simpler, more reliable vision pipelines with structured outputs; no ad‑hoc JSON scraping or retry scaffolding.
  - Single, server‑orchestrated streaming path reduces duplication and improves testability.
  - Tests pin the observable contracts, enabling safe migration of internals to Responses API.
- Cons:
  - Rate limiting/concurrency needs parity on the streaming route (see Follow‑ups) since the non‑stream route was removed.
  - Embedding‑based duplicate detection remains deferred; text search + one vision compare may miss some near‑duplicates at larger scale.

Security / Auth
- The orchestrated streaming route is admin‑gated via `assertAdmin()` (`src/app/api/admin/ai-chat/stream/orchestrated/route.ts:21`).
- Rate limiting policies still include the legacy path (`src/lib/security/limits.ts:20`), which should be updated to point at `/api/admin/ai-chat/stream/orchestrated`.

Verification
- Build: `npm run build` compiles successfully (Next.js output includes `/api/admin/ai-chat/stream/orchestrated`).
- Tests: `npm run test -- test/admin-ai --run` passes. Unit tests mock OpenAI and DB calls to avoid network/DB flakiness.

Implementation Notes (Oct 16, 2025)

- AgentKit integration
  - Implemented Router/Vision/Inventory/Orders agents and tool wrappers; streaming route now runs AgentKit and emits `handoff`, `assistant_delta`, `tool_start`, `tool_result`, `tool_append` SSE events.
  - Files:
    - Orchestrator: `src/lib/admin/chat/orchestrator-agentkit.ts:1`
    - Agents: `src/lib/admin/agents/{index.ts,router.ts,vision.ts,inventory.ts,orders.ts}`
    - Tools: `src/lib/admin/agents/tools.ts`
    - API route: `src/app/api/admin/ai-chat/stream/orchestrated/route.ts:29`
  - Legacy streaming orchestrator removed: `src/lib/admin/chat/orchestrator-stream.ts` (deleted).

- Vision via strict JSON schemas
  - Replaced free‑text JSON scraping and retry with `response_format: { type: 'json_schema', strict: true }` using Chat Completions so we keep image support while enforcing structured outputs.
  - Initial stage returns `{ summary, title_zh, title_en, author_zh, author_en, publisher_zh, publisher_en, category_suggestion, quality_issues }` with required+nullable fields.
  - Structured stage matches `VisionAnalysisResult` strictly; similarity returns `{ layout_similarity, content_similarity, confidence }` strictly.
  - Files:
    - Vision service: `src/lib/admin/services/vision.ts:150` (initial), `src/lib/admin/services/vision.ts:213` (structured), `src/lib/admin/services/vision.ts:264` (similarity)
    - OpenAI wrapper: `src/lib/openai/vision.ts:1` (adds `response_format` pass‑through)
  - Removed brittle helpers: `retryAnalysis`, `extractLastJsonObject`.

- Zod schema nuance (saves time)
  - Tools used by AgentKit/Responses cannot use `z.optional()` for fields; use `z.nullable()` and then convert `null` → `undefined` before calling service functions that expect optional fields.
  - Implemented pruning in `src/lib/admin/agents/tools.ts:108` (update_book), `src/lib/admin/agents/tools.ts:138` (search_books), and `src/lib/admin/agents/tools.ts:158` (update_order).

- Package/version compatibility
  - Kept top‑level `openai@^4.104.0` for existing Chat Completions types; AgentKit pulls its own `openai@^5` internally. Avoid mixing v4/v5 types in app code.
  - Node 20.19.5 works in practice for server usage despite AgentKit docs noting Node 22+; plan to bump in future.

- Supersedes (partial) ADR 0002
  - ADR 0002 introduced a custom streaming orchestrator. This ADR supersedes that part by adopting AgentKit as the orchestrator while keeping the streaming SSE contract compatible for the UI.

Follow‑ups
1) Rate limit + concurrency parity for the streaming route
   - Add a policy for `/api/admin/ai-chat/stream/orchestrated` in `src/lib/security/limits.ts:20`.
   - In `src/app/api/admin/ai-chat/stream/orchestrated/route.ts:17`, mirror rate limit + concurrency acquisition/release used previously on the deleted route.

2) Responses API structured outputs
   - Done: strict JSON schemas applied to initial, structured, and similarity; brittle helpers removed.

3) Prompt wording cleanup
   - Update `src/lib/admin/system-prompts.ts:1` to remove GPT‑4o wording and keep model references neutral.

4) (Optional, later) Embedding‑based duplicate detection
   - Add pgvector indexes and text embeddings first; consider image embeddings later if needed.

References
- Research brief: `doc/admin-ai/llm-comparison.md`
- Prior work: ADR 0002 (server‑orchestrated chat + streaming) `doc/adr/0002-server-orchestrated-ai-chat-ui-refactor-streaming-and-gpt5-mini.md`
- Evidence in code:
- Vision structured paths: `src/lib/admin/services/vision/cover-analysis.ts`, `src/lib/admin/services/vision/similarity.ts`, `src/lib/admin/services/vision/item-analysis.ts`
  - Partial Responses usage: `src/lib/openai/chat.ts:32`
  - Default model selection: `src/lib/openai/models.ts:3`
- Streaming orchestrator function: `src/lib/admin/chat/orchestrator-agentkit.ts`
  - Tool lifecycle events (AgentKit): Emitted by `src/lib/admin/chat/orchestrator-agentkit.ts` (handoff, assistant_delta, tool_*).
  - Prompt wording: legacy file removed; see agents in `src/lib/admin/agents/**`.
  - Rate limits now point to the streaming route: `src/lib/security/limits.ts`.

Known Gaps / Not Done Yet
- Rich UI for tool results: duplicate/search results and create/update outputs are not rendered with dedicated components in chat; they appear as raw tool JSON (see `src/components/admin/ai-chat/MessageContent.tsx`).
- Inventory niceties: no explicit increase/decrease quantity tool; no automatic low‑stock warnings surfaced by the agent.
- Orders assistance: no stock‑shortage warning during shipping; `update_order` tool does not expose `admin_notes` or `override_monthly` although the service supports them.
- Observability: Sentry and request‑ID tracing are not wired into the streaming route/orchestrator.
- Vector/embeddings: no pgvector/embeddings pipeline for duplicates yet (intentionally deferred).
- Upload optimization: still server‑side base64 uploads to Cloudinary; no signed direct uploads/webhook flow.
- Tests (route integration): no integration test that exercises `/api/admin/ai-chat/stream/orchestrated` end‑to‑end with mocked RL/CC; only a policy unit test exists.
- Bilingual hinting: agents are not explicitly instructed to mirror UI locale; behavior relies on model defaults.
