# Admin AI — Overview

This document is the single entry point for the Admin AI chat: what it is, how it works, how to run it, and how to troubleshoot it. It links directly to the relevant code paths in this repo.

## Quick Start
- Requirements
  - Node 20.18+
  - Env: `OPENAI_API_KEY`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPER_ADMIN_EMAIL`, `CLOUDINARY_URL`
- Run
  - `npm run dev`
  - Visit `/{locale}/admin/ai-chat` (example: `/en/admin/ai-chat`). You must be signed in as an admin.
- Use
  - Drag a cover photo into the input, then ask e.g. “Analyze this book and prepare to add it.”
  - The system streams: `handoff` → assistant text → tool events (analyze → structured → duplicate check) → `assistant_done`.
- Helpful toggles
  - Client SSE logs: `NEXT_PUBLIC_ADMIN_AI_TRACE_DISABLED=1` (off by default)
  - Server logs: `ADMIN_AI_TRACE_DISABLED=1` (off by default)
  - Deep diagnostics: `DEBUG_LOGS=1` (prints compact shapes for unexpected stream events)

## Architecture
- API entry (SSE)
  - `src/app/api/admin/ai-chat/stream/orchestrated/route.ts` — Admin‑only route; rate limit + per‑user concurrency; enriches SSE events with `request_id`.
- Orchestrator
  - `src/lib/admin/chat/orchestrator-agentkit.ts` — Wires Agents SDK and streams events. Handoffs: Router → Vision/Inventory/Orders. Logs tool calls/results.
- Agents & Tools
  - Registry: `src/lib/admin/agents/index.ts`
  - Router: `src/lib/admin/agents/router.ts`
  - Vision: `src/lib/admin/agents/vision.ts` (tools from `src/lib/admin/agents/tools.ts`)
  - Inventory: `src/lib/admin/agents/inventory.ts`
  - Orders: `src/lib/admin/agents/orders.ts`
- Vision Services
  - Cover analysis: `src/lib/admin/services/vision/cover-analysis.ts`
  - Item analysis: `src/lib/admin/services/vision/item-analysis.ts`
  - Similarity: `src/lib/admin/services/vision/similarity.ts` (+ schemas in `src/lib/admin/services/vision/schemas.ts`)
- Event Contract & Client
  - Event types: `src/lib/admin/types/events.ts`
  - Normalizer: `src/lib/admin/chat/normalize-agent-events.ts`
  - SSE client: `src/lib/admin/chat/client/sse-transport.ts` (+ README there)
  - UI hook & components: `src/components/admin/ai-chat/hooks/useChatSession.ts`, `src/components/admin/ai-chat/*`

## Models & Configuration
- OpenAI models
  - Default text: `gpt-5-mini`; override via `OPENAI_TEXT_MODEL`.
  - Default vision: `gpt-5-mini`; override via `OPENAI_VISION_MODEL`.
  - Source: `src/lib/openai/models.ts`, `src/lib/openai.ts`.
- Limits & security
  - Route limits and concurrency: `src/lib/security/limits.ts`, `src/lib/security/ratelimit.ts`
  - Admin gate: `src/lib/security/guards.ts` via `src/middleware.ts`
- Cloudinary uploads
  - Client hook: `src/components/admin/ai-chat/hooks/useImageUpload.ts`
  - Server helpers: `src/lib/admin/image-upload.ts`, config in `src/lib/admin/constants.ts`
  - Signed upload endpoint: `src/app/api/upload/sign/route.ts`

## Typical Flows
- Vision (book)
  1) Vision `analyze_book_cover` with `stage="initial"` → summary + tentative fields
  2) Vision `analyze_book_cover` with `stage="structured"` → `VisionAnalysisResult`
  3) `check_duplicates` → recommends create/update/review
- Vision (item)
  - `analyze_item_photo` → structured fields (name/type/material/finish/size/dimensions) + tags
- Inventory
  - `create_book`, `update_book`, `search_books`, `adjust_book_quantity`
  - Mutations require `confirmed: true` in tool params (server‑enforced)
- Orders
  - `get_order`, `search_orders`, `update_order` (mutations also require `confirmed: true`)

## Troubleshooting
- “Handoff to Vision” then silence
  - Fixed by robust normalization. If it occurs, set `DEBUG_LOGS=1` to log unknown message event shapes.
  - Code: `src/lib/admin/chat/normalize-agent-events.ts`, `src/lib/admin/chat/orchestrator-agentkit.ts`
- 401 Unauthorized
  - Ensure you are logged in and have admin role (`SUPER_ADMIN_EMAIL` or admin role in DB). Middleware protects admin routes.
- 429 Rate limited / concurrency
  - See `src/lib/security/limits.ts` for policy; in local dev you can set `KV_USE_MEMORY=1` or add Vercel KV envs.
- Tool schema “uri” format error
  - Agents‑safe URL schema is centralized at `src/lib/schema/http-url.ts`. Do not use `.url()` in tool params.
- OpenAI config error
  - Ensure `OPENAI_API_KEY` is present for admin calls; for user‑key flows, `OPENAI_API_KEY_USER`.

## Validation
- Manual E2E
  - `doc/admin-ai/e2e-manual-test.md` — end‑to‑end test plan and expected event sequence.
- Unit tests
  - Orchestrator/normalizer tests under `test/admin-ai/*`.

## Reference Links
- Features: `doc/admin-ai/features.md`
- Roadmap/notes: `doc/admin-ai/admin-ai-ui-roadmap.md`
- SSE client README: `src/lib/admin/chat/client/README.md`

