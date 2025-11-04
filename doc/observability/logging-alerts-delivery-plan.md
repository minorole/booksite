# Observability: Logging + Alerts Delivery Plan (Vercel Pro)

This plan makes logs easy to read, easy to search, and gives fast alerts — while keeping costs low on Vercel Pro.

## TL;DR (Kid‑friendly)
- Every request gets a wristband number (`request_id`) so we can follow it end‑to‑end.
- All logs speak the same language (one format, same fields), so searching is easy.
- Big problems ring a Slack bell right away (free webhook), without spamming.

## Success Criteria
- Consistent, structured server logs with `level`, `scope`, `event`, and `request_id` visible in Vercel logs.
- Critical Admin AI issues generate Slack alerts within seconds (no third‑party cost).
- Operators can trace any Admin AI run using `X-Request-ID`/`request_id`.
- Sensitive values are redacted in logs and alerts.

## Constraints & Assumptions
- Hosting: Vercel Pro (~7 days log retention in Vercel Logs UI/CLI).
- Budget: minimize costs; avoid paid drains/APM; Slack webhook is acceptable.
- Existing toggles are honored: `DEBUG_LOGS`, `ADMIN_AI_TRACE_SENSITIVE`, `ADMIN_AI_TRACE_DISABLED`.
- All logging stays on the server (API routes, orchestrator, OpenAI wrappers) so it’s visible on Vercel.

---

## Phase 0 — Baseline (Diagnose)
Why: Confirm current signals and correlation to target improvements precisely.

What to do:
- Inventory current Admin AI logs and toggles (already done):
  - Route lifecycle and errors: `src/app/api/admin/ai-chat/stream/orchestrated/route.ts:33,50,59,71,97,130,159`
  - Orchestrator events: `src/lib/admin/chat/orchestrator-agentkit.ts:62..210`
  - OpenAI wrapper logs: `src/lib/openai/logging.ts:1..20`
  - Request context (ID, caches): `src/lib/runtime/request-context.ts:1..24`
  - Toggles: `src/lib/observability/toggle.ts:1..24`

Outcome (validation): We have scattered `console.*` logs, partial `request_id` coverage, and varied formats.

---

## Phase 1 — Central Structured Logger (Design + Deliver)
Why: One voice for all logs. Makes filtering/alerting trivial and redacts secrets.

Deliverable:
- New: `src/lib/logging.ts`

What to do:
- Provide API: `log.info|warn|error|debug(scope, event, fields)`.
- Auto‑attach: `timestamp`, `level`, `scope`, `event`, `request_id` (from `getRequestId()`), `env`.
- Redact sensitive keys recursively (case‑insensitive): `apiKey`, `authorization`, `password`, `token`, `secret`, `key`.
- Format: JSON lines by default; pretty print in dev if `LOG_FORMAT=pretty`.
- Levels: governed by `LOG_LEVEL` (prod `info`, dev `debug`).
- Respect existing toggles: suppress debug if `DEBUG_LOGS=0|false`.
- Install process‑level handlers once: `unhandledRejection` / `uncaughtException` → `log.error('process','unhandled', {...})`.

Acceptance:
- `npm run build` passes.
- Emitting a sample log in dev shows pretty output; in prod (simulate) shows JSON line.

---

## Phase 2 — Adopt Logger in Admin AI + OpenAI (Deliver)
Why: Highest‑value paths first. Admin AI is where early visibility matters most.

Files to update (exact spots):
- Route (server logs go to Vercel automatically)
  - `src/app/api/admin/ai-chat/stream/orchestrated/route.ts`
    - `request_start`: line `33` → `log.info('admin_ai_route','request_start', {...})`
    - `ratelimit`: line `50` → `log.info('admin_ai_route','ratelimit', {...})`
    - `concurrency`: line `59` → `log.info('admin_ai_route','concurrency', {...})`
    - `sse_out` (debug): line `71` → `log.debug('admin_ai_route','sse_out', {...})`
    - `stream_complete`: line `97` → `log.info('admin_ai_route','stream_complete', {...})`
    - `orchestrator_error`: line `130` → `log.error('admin_ai_route','orchestrator_error', {...})`
    - `route_error`: line `159` → `log.error('admin_ai_route','route_error', {...})`
- Orchestrator
  - `src/lib/admin/chat/orchestrator-agentkit.ts`
    - Agent handoffs, run items, tool lifecycle, assistant preview/summary, raw model compact → map current `console.*` (around `62..210`) to `log.debug|info('admin_ai_orchestrator','<event>', {...})`.
- OpenAI wrapper
  - `src/lib/openai/logging.ts:1..20` → use `log.info|error('openai', operation.toLowerCase(), {...})` and include errors.

Acceptance:
- Vercel Logs show JSON lines with `scope`=`admin_ai_*` and `openai`, with `request_id` present.
- A test error in the route produces exactly one `admin_ai_route:orchestrator_error` entry.

---

## Phase 3 — Free Slack Alerts (Deliver)
Why: Fast operator signal without added cost.

Deliverable:
- New: `src/lib/alerts.ts`

What to do:
- If `process.env.LOG_ALERTS_ENABLED` and `process.env.OPS_SLACK_WEBHOOK_URL` are set:
  - Post compact Slack messages for critical events:
    - `scope=admin_ai_route` with `event in { orchestrator_error, route_error }`
    - `scope=openai` with `event in { error, vision_error }`
  - Include: `request_id`, `message`, `tool`/`path` if present, and a short link hint to Vercel Logs.
  - Dedupe/cooldown per `(request_id,event)` for ~60s (best‑effort; serverless can duplicate).
  - Redact payload with the same redactor used by the logger.

Acceptance:
- Trigger a synthetic Admin AI error; receive a single Slack notification within seconds.
- No secrets visible in Slack messages.

---

## Phase 4 — Early Warning Health Check (Optional, Deliver)
Why: Detect upstream outages before admins experience failures.

Deliverables:
- New route: `src/app/api/admin/health/route.ts` (guarded by `ADMIN_TASK_TOKEN`).
- Vercel Cron to call it every 5–10 minutes.

What to do:
- Perform a minimal OpenAI ping (fast, tiny tokens).
- On failure: `log.error('admin_ai_health','degraded', {...})` and send Slack alert.

Acceptance:
- For a simulated failure, logs show `admin_ai_health:degraded` and Slack receives an alert.

---

## Phase 5 — Optional Log Drain (Retain/Alert) (Design for later)
Why: Longer retention/dashboards/advanced alerting if needed.

What to do (later, no code change required):
- In Vercel → Project → Settings → Logs → Drains, add a provider (Better Stack/Datadog) when needed.
- Use our structured fields to define alerts (e.g., `level:error AND (scope:admin_ai_* OR scope:openai)`).

Acceptance:
- Provider receives JSON logs and alerts match queries.

---

## Operations Runbook (Verify + Audit)
Common tasks:
- Trace a request: copy response header `X-Request-ID` and filter Vercel logs for `request_id:"<id>"`.
- See all Admin AI errors: filter `scope:admin_ai_* level:error`.
- See OpenAI errors: filter `scope:openai level:error`.
- Temporarily reduce noise: set `LOG_LEVEL=warn` or `DEBUG_LOGS=0`.

Redaction policy:
- Keys (any depth, case‑insensitive): `apiKey`, `authorization`, `password`, `token`, `secret`, `key`.

Backout plan:
- Disable alerts: unset `OPS_SLACK_WEBHOOK_URL` or `LOG_ALERTS_ENABLED`.
- Reduce detail: set `LOG_LEVEL=info|warn` and `ADMIN_AI_TRACE_SENSITIVE=false`.
- Revert adoption incrementally (per file) — the central logger is dependency‑free.

Risks & Mitigations:
- Spammy alerts → cooldown + limit to critical events.
- PII in logs → redaction + `ADMIN_AI_TRACE_SENSITIVE=false` in prod.
- Too much debug noise → use `LOG_LEVEL` and `DEBUG_LOGS=0`.

---

## Environment Variables
- `LOG_LEVEL` (prod `info`; dev `debug`): `debug|info|warn|error`.
- `LOG_FORMAT` (prod `json`; dev `pretty`): `json|pretty`.
- `LOG_ALERTS_ENABLED` (optional): `1|true` to enable Slack alerts.
- `OPS_SLACK_WEBHOOK_URL` (optional): Slack Incoming Webhook URL.
- `ADMIN_AI_TRACE_SENSITIVE` (existing): set `false` in prod to reduce sensitive trace data.
- `ADMIN_AI_TRACE_DISABLED` (existing): set `true` to silence Admin AI traces completely (rarely needed).
- `DEBUG_LOGS` (existing): set `0|false` to disable deep debug logs.
- `ADMIN_TASK_TOKEN` (optional): protects the health route.

---

## Validation Steps
1) Build: `npm run lint && npm run build` — passes.
2) Local dev: start, hit Admin AI route; see pretty logs with `request_id` and `scope:event` pairs.
3) Production (preview deploy): verify Vercel logs show JSON lines; trigger a handled error; see `admin_ai_route:orchestrator_error`.
4) Slack (if enabled): confirm a single alert arrives for the error.
5) Health (if enabled): force a failure; see `admin_ai_health:degraded` and Slack alert.

---

## Notes on Retention and Cost
- Vercel Pro log retention ≈ 7 days (check your project’s settings for exact value).
- Slack Incoming Webhooks have no extra Slack fee; subject to Slack rate limits and your workspace plan’s message retention.
- No paid services required for this plan; log drains can be added later if you need longer retention.

