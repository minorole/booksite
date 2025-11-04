import { getRequestId } from '@/lib/runtime/request-context'

function isTruthy(v: string | undefined): boolean {
  const s = (v || '').toLowerCase()
  return s === '1' || s === 'true'
}

const REDACT_KEYS = new Set(['apikey', 'authorization', 'password', 'token', 'secret', 'key'])

function isRedactionKey(key: string): boolean {
  return REDACT_KEYS.has(key.toLowerCase())
}

function sanitize(value: unknown, seen = new WeakSet<object>(), depth = 0): unknown {
  if (value === null || value === undefined) return value
  if (depth > 5) return '[max-depth]'
  if (Array.isArray(value)) return value.map((v) => sanitize(v, seen, depth + 1))
  if (typeof value === 'object') {
    if (seen.has(value as object)) return '[circular]'
    seen.add(value as object)
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = isRedactionKey(k) ? '[redacted]' : sanitize(v, seen, depth + 1)
    }
    return out
  }
  return value
}

declare global {
  // Cache of recent alerts to dedupe by (scope,event,request_id)
  var __BOOKSITE_ALERT_CACHE__: Map<string, number> | undefined
}

const cache: Map<string, number> = (globalThis.__BOOKSITE_ALERT_CACHE__ ||= new Map())
const TTL_MS = 60_000

function dedupeKey(scope: string, event: string, requestId?: string): string {
  return `${scope}:${event}:${requestId || '(unknown)'}`
}

function shouldSkip(scope: string, event: string, requestId?: string): boolean {
  const now = Date.now()
  const key = dedupeKey(scope, event, requestId)
  const last = cache.get(key)
  // Clean old entries opportunistically
  for (const [k, ts] of cache.entries()) if (now - ts > TTL_MS) cache.delete(k)
  if (last && now - last < TTL_MS) return true
  cache.set(key, now)
  return false
}

export async function maybeSendAlert(
  scope: 'admin_ai_route' | 'openai',
  event: string,
  fields?: Record<string, unknown>
): Promise<void> {
  try {
    if (!isTruthy(process.env.LOG_ALERTS_ENABLED)) return
    const webhook = process.env.OPS_SLACK_WEBHOOK_URL
    if (!webhook) return

    // Only alert on error-class events
    const ev = event.toLowerCase()
    const isErrorEvent =
      (scope === 'admin_ai_route' && (ev === 'orchestrator_error' || ev === 'route_error')) ||
      (scope === 'openai' && (ev === 'error' || ev === 'vision_error'))
    if (!isErrorEvent) return

    const rid = (fields?.request_id as string | undefined) || getRequestId()
    if (shouldSkip(scope, event, rid)) return

    // Compact summary
    const safe = fields ? (sanitize(fields) as Record<string, unknown>) : undefined
    const summaryParts: string[] = []
    const add = (k: string, v: unknown) => {
      if (v === undefined || v === null) return
      const s = typeof v === 'string' ? v : JSON.stringify(v)
      if (s && s !== '""' && s !== '{}') summaryParts.push(`${k}=${s}`)
    }
    add('message', (safe as any)?.message)
    add('tool', (safe as any)?.tool)
    add('path', (safe as any)?.path)
    add('code', (safe as any)?.code)
    add('status', (safe as any)?.status)
    const summary = summaryParts.join(' ')

    const text = `:rotating_light: [${scope}:${event}] ${summary || ''}\nrequest_id=${rid || '(unknown)'}\n`;

    await fetch(webhook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    }).catch(() => {})
  } catch {
    // Never throw on alerting
  }
}
