# Observability Session Report — Central Logger, Alerts, Health (Admin AI)

Date: 2025‑11‑04
Owner: Booksite

## Summary
We implemented a structured, server‑first observability stack for Admin AI and OpenAI paths:
- Central logger with consistent fields and request IDs
- Slack alerts for critical errors (opt‑in)
- Admin health endpoint to catch upstream issues early

All changes are server‑only (no client secrets). Lint, typecheck, and build pass. Next steps: small fixes for full request_id coverage, adopt logger in remaining routes, and optional Sentry + traces.

## Changes Delivered (Phases 1–4)

### Phase 1 — Central Logger
- File: `src/lib/logging.ts:1`
- Features:
  - Methods: `log.debug|info|warn|error(scope, event, fields)`
  - Auto fields: `timestamp`, `level`, `scope`, `event`, `env`, `request_id` (from context)
  - Levels: `LOG_LEVEL` (default dev=debug, prod=info); `DEBUG_LOGS` suppresses debug when off
  - Formats: JSON lines (default) or pretty via `LOG_FORMAT=pretty`
  - Redaction: keys `apiKey`, `authorization`, `password`, `token`, `secret`, `key`
  - Safety: process handlers for `unhandledRejection` and `uncaughtException`

### Phase 2 — Logger Adoption
- Admin AI stream route (request lifecycle + errors)
  - `src/app/api/admin/ai-chat/stream/orchestrated/route.ts:42,63,82,101,124,131,167,178,213`
  - Replaces `console.*` with `log.*` for: `request_start`, `ratelimit`, `concurrency`, `sse_out` (debug), `release_concurrency_failed` (warn), `stream_complete`, `orchestrator_error`, `route_error`.
- Orchestrator (agent/tool lifecycle + diagnostics)
  - `src/lib/admin/chat/orchestrator-agentkit.ts:130,155,188,212,221,232,245,257,273,281`
  - Signals: `agent_updated`, `run_item`, `no_text_after_message_event` (debug), `tool_start`, `tool_result`, `assistant_preview`, `assistant_text_collected`, and generic `event`.
- Compact raw model logs (deduped, concise)
  - `src/lib/admin/chat/logging.ts:14,36,57,71,77,80`
- OpenAI wrapper logger
  - `src/lib/openai/logging.ts:20,22`
  - `logOperation` now delegates to central logger (`scope='openai'`).

### Phase 3 — Slack Alerts (opt‑in)
- Alerts module: `src/lib/alerts.ts:53`
  - Enable with `LOG_ALERTS_ENABLED=1|true` and `OPS_SLACK_WEBHOOK_URL`
  - Dedupe per `(scope,event,request_id)` for ~60s
  - Redacts sensitive keys
- Wired alert points:
  - Route criticals: `src/app/api/admin/ai-chat/stream/orchestrated/route.ts:179,214`
  - OpenAI criticals: `src/lib/openai/logging.ts:20`

### Phase 4 — Admin Health Endpoint
- `src/app/api/admin/health/route.ts:1,34,42,43`
  - Guarded by `ADMIN_TASK_TOKEN` (query param `?token=`)
  - Minimal OpenAI ping (Responses API, `max_output_tokens=1`)
  - Logs `admin_ai_health:ok` with latency; on failure logs `admin_ai_health:degraded` and sends Slack alert

### Environment Examples Updated
- `LOG_LEVEL`, `LOG_FORMAT`, `LOG_ALERTS_ENABLED`, `OPS_SLACK_WEBHOOK_URL`, `ADMIN_TASK_TOKEN` added (commented) in `.env.example`.

## What’s Left / Recommendations

1) Immediate correctness fixes
- Include request_id in outer route error:
  - Hoist `requestId` above `try` so the catch can log it: `src/app/api/admin/ai-chat/stream/orchestrated/route.ts:16–36, 203–214`.
- Attach request_id to all health logs:
  - Wrap the full handler in `withRequestContext(requestId, ...)` or add `request_id` to log fields: `src/app/api/admin/health/route.ts:21,34,42`.

2) Broaden adoption (other routes)
- Uploads: swap `console.*` → `log.*`; alert on fatal `request_error`.
  - `src/app/api/upload/route.ts:10,49,75,82`
- Sweep other API routes for consistent request lifecycle + error logging with `log.*`.

3) Optional polish
- Reduce noise: make non‑error OpenAI logs debug (`src/lib/openai/logging.ts:22`).
- Mask or drop `userEmail` from `request_start` logs (`src/app/api/admin/ai-chat/stream/orchestrated/route.ts:42`).
- Gate alerts to production (check `NODE_ENV==='production'`) in `src/lib/alerts.ts:53`.
- DRY sanitizer: extract a shared redaction util and reuse in logger + alerts.

4) Future: Sentry + Tracing (OpenTelemetry)
- Initialize @sentry/nextjs for server error capture.
- Add OTel tracing around HTTP/OpenAI/Supabase calls and attach `request_id` to spans.
- Consider a Vercel Logs drain for longer retention (optional).

## Manual Test Plan (Before Continuing)

Pre‑reqs:
- `.env.local` includes: `OPENAI_API_KEY`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPER_ADMIN_EMAIL`, `CLOUDINARY_URL`.
- Observability envs (suggested for testing):
  - `LOG_LEVEL=debug`
  - `LOG_FORMAT=pretty`
  - `LOG_ALERTS_ENABLED=1` and `OPS_SLACK_WEBHOOK_URL=...` (optional)
  - `ADMIN_TASK_TOKEN=...`

1) Health check
- Call: `GET /api/admin/health?token=$ADMIN_TASK_TOKEN`
- Expect: 200 JSON `{ ok: true, latency_ms, model }`.
- Logs: `admin_ai_health:ok` (see `src/app/api/admin/health/route.ts:34`).
- Failure case: set an invalid `OPENAI_API_KEY` temporarily → expect 500 with `{ ok: false }`, server logs `admin_ai_health:degraded` (line `42`) and a single Slack alert (deduped ~60s).

2) Admin AI stream
- Sign in as admin; open `/[locale]/admin/ai-chat`; send a short message.
- Expect server logs (examples):
  - `admin_ai_route:request_start` (`route.ts:42`)
  - `admin_ai_route:ratelimit` (`route.ts:63`) and `concurrency` (`route.ts:82`)
  - `admin_ai_route:sse_out` debug (`route.ts:101`, excludes `assistant_delta`)
  - Orchestrator: `agent_updated` (`orchestrator-agentkit.ts:130`), `run_item` (`155`), `tool_start` (`212`), `tool_result` (`232`), `assistant_preview` (`257`), `assistant_text_collected` (`281`)
- UI should display a `request_id` in the session (client hook at `src/components/admin/ai-chat/hooks/useChatSession.ts:120`).

3) Route error / alert sanity
- Induce an orchestrator tool schema error (e.g., temporarily break a tool param schema).
- Expect one `admin_ai_route:orchestrator_error` log (`route.ts:178`) and one Slack alert (`route.ts:179`).
- Outer route error (rare): should log `route_error` (`route.ts:213`) and send a Slack alert (`route.ts:214`).

4) Format + level toggles
- Switch `LOG_FORMAT=json` → logs appear as JSON lines.
- Set `DEBUG_LOGS=0` → debug logs like `sse_out` and `no_text_after_message_event` stop.

Acceptance (proceed only if):
- All logs are structured with `scope,event` and contain a `request_id` for Admin AI flows.
- Health endpoint returns `ok` and logs `ok`; on failure, logs `degraded` and sends one alert.
- Admin AI run shows lifecycle logs; no `[AdminAI route]` or `[AdminAI orchestrator]` console prefixes remain.
- Slack receives exactly one alert per distinct critical error per minute.

## Risks & Rollback
- Risk: noisy logs in production if `LOG_LEVEL=debug` and `DEBUG_LOGS=1`.
  - Mitigation: set `LOG_LEVEL=info` and/or `DEBUG_LOGS=0`.
- Risk: PII in logs (userEmail in `request_start`).
  - Mitigation: mask or drop; enable with env if needed.
- Rollback: disable alerts (unset webhook or `LOG_ALERTS_ENABLED`), set `LOG_LEVEL=info|warn`, `DEBUG_LOGS=0`.

## Commits
- feat(observability): add central structured logger (phase 1) and env hints; no adoption yet
- feat(observability): adopt central logger in Admin AI route, orchestrator, and OpenAI wrappers (phase 2)
- chore(observability): normalize remaining orchestrator console errors to central logger
- feat(observability): add Slack alerts (phase 3) and wire to critical errors
- feat(observability): add admin health endpoint (phase 4) and env docs

