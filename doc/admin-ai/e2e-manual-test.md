# Admin AI — End‑to‑End Manual Test Plan

This guide validates the full Admin AI stack (vision, inventory, orders) through realistic, bilingual chat flows. It covers auth, SSE streaming, tools, server protections (confirmation gating, rate limiting, concurrency), and UI result rendering.

References to code include exact file paths and important line anchors to help verify behavior in source.


## Scope & Success Criteria

- Exercise every tool at least once:
  - Vision: `analyze_book_cover` (structured only), `analyze_item_photo`, `check_duplicates` (src/lib/admin/agents/tools.ts)
  - Inventory: `create_book`, `update_book`, `search_books`, `adjust_book_quantity`, `check_duplicates` (src/lib/admin/agents/tools.ts)
  - Orders: `get_order`, `search_orders`, `update_order` (src/lib/admin/agents/tools.ts)
- Observe correct SSE event sequence in the browser console and UI:
  - `handoff` → `assistant_delta` → `tool_start` → `tool_result` → `tool_append` → `assistant_done`
    - Normalization: src/lib/admin/chat/normalize-agent-events.ts:4
- Verify server protections:
  - Admin‑only auth (src/app/api/admin/ai-chat/stream/orchestrated/route.ts:8; src/lib/security/guards.ts:23)
  - Confirmation gating for mutating tools (create/update book, update order) via `confirmed: true` (src/lib/admin/agents/tools.ts)
  - Rate limiting + user concurrency (src/lib/security/limits.ts:1, src/lib/security/ratelimit.ts:58)
  - Logging/audit of function calls and outcomes (src/lib/admin/chat/orchestrator-agentkit.ts:153; src/lib/db/admin/logs.ts:1)


## Environment & Setup

- Node 20.18+ (Next.js 15). Start dev with `npm run dev`.
- Required envs (see src/lib/config/env.ts:1): `OPENAI_API_KEY`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPER_ADMIN_EMAIL`, `CLOUDINARY_URL`.
- Optional envs for limits (local dev): `KV_REST_API_URL`, `KV_REST_API_TOKEN` (Vercel injects these in production). Toggle logs with `ADMIN_AI_TRACE_DISABLED`, `ADMIN_AI_TRACE_SENSITIVE` (src/lib/observability/toggle.ts:1).
- Visit the chat UI as an admin: `http://localhost:3000/zh/admin/ai-chat` (page: src/app/[locale]/admin/ai-chat/page.tsx:1).
- Upload API for images: `POST /api/upload` (route: src/app/api/upload/route.ts:6) validates MIME/size against FILE_CONFIG (src/lib/admin/constants.ts:4).
- SSE streaming entry: `POST /api/admin/ai-chat/stream/orchestrated` (route: src/app/api/admin/ai-chat/stream/orchestrated/route.ts:8) → orchestrator (src/lib/admin/chat/orchestrator-agentkit.ts:85).

Helpful toggles/config:
- AGENT turns: `AGENT_MAX_TURNS` (default 12) (src/lib/admin/chat/orchestrator-agentkit.ts:94)
- Model override: `OPENAI_TEXT_MODEL`, `OPENAI_VISION_MODEL` (src/lib/openai/models.ts:1)


## Event Contract (UI ↔ Server)

- Route enriches SSE events with `version` and `request_id` (src/app/api/admin/ai-chat/stream/orchestrated/route.ts:66).
- Normalizer maps AgentKit events to UI SSE types (src/lib/admin/chat/normalize-agent-events.ts:4):
  - Tool call start: `tool_called` → `tool_start` (id/name/args)
  - Tool result: `tool_output` → `tool_result` (unwraps `.data` if present) and `tool_append` (full envelope JSON)
  - Assistant text: `assistant_delta`
  - Agent changes: `handoff`
- UI consumption and rendering:
  - SSE client: src/lib/admin/chat/client/sse-transport.ts:1
  - Message stream buffer: src/components/admin/ai-chat/hooks/useChatSession.ts:1
  - Inline rendering handled in MessageContent: src/components/admin/ai-chat/MessageContent.tsx:1
  - Cards: Duplicates/Search/Book/Order under src/components/admin/ai-chat/cards/**


## A. New Book From Photo (Vision → Inventory)

1) Upload cover image or paste Cloudinary URL
- If uploading: drag a file into the chat input. The client calls `/api/upload` (src/components/admin/ai-chat/hooks/useImageUpload.ts:1; src/app/api/upload/route.ts:6) with admin auth + RL/CC. Expect 200 with `{ url }`.
- If pasting: ensure a publicly accessible Cloudinary URL.

2) Ask in Chinese with the image attached
- Send: “请分析这本书封面并准备创建条目。”
- Expected SSE:
  - `handoff` to `Vision` (src/lib/admin/agents/router.ts:1; src/lib/admin/agents/vision.ts:1)
  - `tool_start` analyze_book_cover with `{ image_url }`
  - `tool_result` with `data.vision_analysis.stage === 'structured'`
  - `assistant_delta` explaining findings

3) Duplicate check
- Triggered by the Vision agent when it has titles/authors.
- Expected SSE:
  - `tool_start` check_duplicates with extracted fields + optional cover (src/lib/admin/agents/tools.ts:47)
  - `tool_result` with `data.duplicate_detection.analysis.recommendation` (src/lib/admin/services/duplicates.ts:67)
  - Inline card shows “Duplicate candidates” (src/components/admin/ai-chat/cards/DuplicateMatchesCard.tsx:1)

4) Structured analysis confirmation
- Reply: “好的，继续结构化提取。”
- Expected SSE:
  - `tool_start` analyze_book_cover `{ stage:"structured", confirmed_info }` (src/lib/admin/services/vision/cover-analysis.ts:65)
  - `tool_result` with `data.vision_analysis.stage === 'structured'` and `structured_data.cover_url` (src/lib/admin/services/vision/cover-analysis.ts:95)

5) Create the book (confirmation gating)
- The assistant proposes a create payload and asks for confirmation. If it calls `create_book` without confirmation, service returns `{ success:false, error.code:'confirmation_required' }` (negative test) (src/lib/admin/agents/tools.ts:116).
- Reply: “确认”
- Expected SSE:
  - `handoff` to `Inventory` (src/lib/admin/agents/inventory.ts:1)
  - `tool_start` create_book with `confirmed:true` (src/lib/admin/agents/tools.ts:93)
  - `tool_result { success:true, data.book }` → Book card (src/components/admin/ai-chat/results/cards/BookSummaryCard.tsx:1)


## B. Inventory: Search, Adjust Quantity, Update

6) Search inventory
- Ask: “查找标签含‘净土’且库存>0的书。”
- Expected SSE:
  - `tool_start` search_books with filters (src/lib/admin/agents/tools.ts:161)
  - `tool_result` `data.search.books` → Search card list (src/components/admin/ai-chat/results/cards/SearchResultsList.tsx:1)

7) Adjust quantity
- Ask: “把刚创建的书库存+5。”
- Expected SSE:
  - `tool_start` adjust_book_quantity `{ book_id, delta: 5 }` (src/lib/admin/agents/tools.ts:184)
  - `tool_result` `{ success:true, data.book.quantity }` (src/lib/admin/services/books.ts:89)

8) Update fields (confirmation gating)
- Assistant proposes an update payload; reply “确认” to proceed.
- Expected SSE:
  - `tool_start` update_book with `confirmed:true` and changed fields (src/lib/admin/agents/tools.ts:126)
  - `tool_result { success:true, data.book }` → Book card in “updated” mode


## C. Orders Assistance

9) Search orders
- Ask: “查找PROCESSING的订单。”
- Expected SSE:
  - `handoff` to `Orders` (src/lib/admin/agents/orders.ts:1)
  - `tool_start` search_orders `{ status:"PROCESSING" }` (src/lib/admin/agents/tools.ts:200)
  - `tool_result { success:true, data.orders }`

10) Update order with invalid ID (negative test)
- Ask: “将订单 abc 标记为 SHIPPED，单号 9400…（确认）”
- Expected SSE:
  - `tool_start` update_order `{ confirmed:true, order_id:"abc", ... }`
  - `tool_result { success:false, error.code:'validation_error' }` (src/lib/admin/services/orders.ts:10)

11) Update order with valid UUID
- Ask: “确认将订单 <valid-uuid> 标记为 SHIPPED，单号 9400…。”
- Expected SSE:
  - `tool_result { success:true, data.order }` → Order card (src/components/admin/ai-chat/results/cards/OrderUpdateCard.tsx:1)


## D. Non‑Book Item Analysis

12) Analyze item photo
- Send: “分析这尊佛像的材质与尺寸。” with an image.
- Expected SSE:
  - `handoff` to `Vision`
  - `tool_start` analyze_item_photo `{ image_url }` (src/lib/admin/agents/tools.ts:75)
  - `tool_result { success:true, data.item_analysis.structured_data }` (src/lib/admin/services/vision/item-analysis.ts:1)
  - `tool_start` check_duplicates with extracted item fields + image (src/lib/admin/agents/tools.ts:49)
  - `tool_result` shows duplicate candidates and recommendation (src/lib/admin/services/duplicates.ts:1)
  - Assistant summarizes.

## D2. Text‑Only Create (No Photo)

15) Ask to add a book by title/author without a photo
- Send: “Add ‘Title XYZ’ by ‘Author ABC’ with 5 in stock.”
- Expected SSE:
  - `handoff` to `Inventory`
  - `tool_start` check_duplicates with provided text fields (src/lib/admin/agents/tools.ts:97–120, 1–95 builder)
  - `tool_result` shows duplicate candidates and recommendation
  - If you confirm create, `tool_start` create_book with `confirmed:true`


## E. Bilingual Behavior & Language Mirroring

13) Switch to English
- Ask: “Also provide an English summary.”
- The orchestrator injects a system prelude to mirror the user’s last language (src/lib/admin/chat/orchestrator-agentkit.ts:26). Expected: assistant replies in English while preserving quoted Chinese.


## F. Security, Limits, and Logging

14) Admin‑only auth
- From an unauthenticated browser/tab, call `POST /api/admin/ai-chat/stream/orchestrated` → 401 (src/app/api/admin/ai-chat/stream/orchestrated/route.ts:12; src/lib/security/guards.ts:23).

15) Rate limiting & concurrency
- Policy: `/api/admin/ai-chat/stream/orchestrated` → limit=10, weight=2, concurrency=2 (src/lib/security/limits.ts:12)
- With Upstash configured, exceed allowed calls → 429 with `X-RateLimit-*` headers (src/lib/security/ratelimit.ts:94). Launch 3 concurrent chats → one 429 (src/lib/security/ratelimit.ts:113).

16) Logging & audit
- During streaming, FUNCTION_CALL / FUNCTION_SUCCESS entries are logged (src/lib/admin/chat/orchestrator-agentkit.ts:153).
- Domain logs: `ANALYZE_IMAGE`, `CREATE_BOOK`, `EDIT_BOOK`, `UPDATE_QUANTITY`, `UPDATE_STATUS` (src/lib/admin/services/logging.ts:1; src/lib/db/admin/logs.ts:1).
- Validate in Supabase table `admin_logs`.


## Minimal API Examples (for Postman/cURL)

SSE chat (requires admin session cookie; easiest in browser UI):

```bash
curl -N \
  -H 'Content-Type: application/json' \
  -H 'Cookie: <your-supabase-session-cookies>' \
  -X POST http://localhost:3000/api/admin/ai-chat/stream/orchestrated \
  -d '{
    "messages": [
      {
        "role": "user",
        "content": [
          { "type": "text", "text": "请分析这本书封面并准备创建条目。" },
          { "type": "image_url", "image_url": { "url": "https://res.cloudinary.com/demo/image/upload/sample.jpg" } }
        ]
      }
    ],
    "uiLanguage": "zh"
  }'
```

Upload image (admin required):

```bash
curl -F 'file=@/path/to/book.jpg' http://localhost:3000/api/upload
```


## UI Mapping Cheat‑Sheet

- Handoff steps list: src/components/admin/ai-chat/hooks/useChatSession.ts:49
- Inline rendering in MessageContent: src/components/admin/ai-chat/MessageContent.tsx:1
- Duplicate candidates card: src/components/admin/ai-chat/cards/DuplicateMatchesCard.tsx:1
- Search results list: src/components/admin/ai-chat/cards/SearchResultsList.tsx:1
- Book summary card: src/components/admin/ai-chat/cards/BookSummaryCard.tsx:1
- Order update card: src/components/admin/ai-chat/cards/OrderUpdateCard.tsx:1


## Troubleshooting

- Vision JSON parsing errors → vision service retries/strict JSON (src/lib/admin/services/vision/helpers.ts:1; schemas: src/lib/admin/services/vision/schemas.ts:1). Check logs and confirm `OPENAI_API_KEY`.
- `confirmation_required` on create/update/order → reply “确认” or “Confirm” so the agent includes `confirmed:true` (mutations enforced at tools layer; src/lib/admin/agents/tools.ts).
- 429 responses in dev → either Upstash is on and limits are hit, or concurrency cap reached; see src/lib/security/limits.ts:1 and headers from route.
- No messages rendering → ensure SSE chunks reach the client (console). Client parser: src/lib/admin/chat/client/sse-transport.ts:1.


## Validation Checklist (Quick)

- Vision structured → `data.vision_analysis.stage === 'structured'` and assistant summary
- Duplicates → `data.duplicate_detection.analysis.recommendation` present
- Vision structured → `structured_data.cover_url` echoed
- Create/update/quantity → `success:true` and Book card updates
- Orders → negative UUID path (error), then valid UUID path (success)
- Item analysis → `data.item_analysis.structured_data` present
- Bilingual mirroring → assistant follows last user language
- SSE sequence → handoff/deltas/tool_* events and final `assistant_done`
- Logs → entries in `admin_logs` for calls/results
- Limits → 429 on overuse/concurrency with headers


---

If you want this plan as a runnable Playwright/Vitest test suite with mocked AgentKit and Supabase, we can scaffold it under `test/e2e/admin-ai/` following the event contract above.
