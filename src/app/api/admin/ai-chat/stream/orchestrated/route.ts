import { NextResponse } from 'next/server'
import { assertAdmin, UnauthorizedError } from '@/lib/security/guards'
import type { Message } from '@/lib/admin/types'
import { runChatWithAgentsStream } from '@/lib/admin/chat/orchestrator-agentkit'
import { withRequestContext } from '@/lib/runtime/request-context'
import { checkRateLimit, rateLimitHeaders, acquireConcurrency, releaseConcurrency } from '@/lib/security/ratelimit'
import { adminAiLogsEnabled, debugLogsEnabled } from '@/lib/observability/toggle'
import { ADMIN_AGENT_MAX_TURNS_DEFAULT } from '@/lib/admin/constants'

export async function POST(request: Request) {
  try {
    let user
    try {
      user = await assertAdmin()
    } catch (e) {
      if (e instanceof UnauthorizedError) {
        return new NextResponse('Unauthorized', { status: 401 })
      }
      throw e
    }

    const { messages, uiLanguage }: { messages: Message[]; uiLanguage?: 'en' | 'zh' } = await request.json()
    if (!Array.isArray(messages) || messages.length === 0) {
      return new NextResponse('Invalid request', { status: 400 })
    }

    const routeKey = '/api/admin/ai-chat/stream/orchestrated'
    const requestId = (globalThis.crypto?.randomUUID?.() || Math.random().toString(36).slice(2)) as string

    // Request start log
    if (adminAiLogsEnabled()) {
      try {
        console.log('[AdminAI route] request_start', {
          requestId,
          route: routeKey,
          userEmail: user.email,
          uiLanguage: uiLanguage || 'en',
          messageCount: messages.length,
        })
      } catch {}
    }

    // Rate limit per user
    const rl = await checkRateLimit({ route: routeKey, userId: user.id })
    if (rl.enabled && !rl.allowed) {
      return new NextResponse('Rate limit exceeded', { status: 429, headers: rateLimitHeaders(rl) })
    }
    
    if (adminAiLogsEnabled()) {
      try { console.log('[AdminAI route] ratelimit', { requestId, enabled: rl.enabled, allowed: rl.allowed, remaining: rl.remaining }) } catch {}
    }

    // Concurrency control per user
    const sem = await acquireConcurrency({ route: routeKey, userId: user.id, ttlSeconds: 120 })
    if (sem.enabled && !sem.acquired) {
      return new NextResponse('Rate limit exceeded', { status: 429, headers: rateLimitHeaders(rl) })
    }
    if (adminAiLogsEnabled()) {
      try { console.log('[AdminAI route] concurrency', { requestId, enabled: sem.enabled, acquired: sem.acquired, current: sem.current, limit: sem.limit }) } catch {}
    }

    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        const encoder = new TextEncoder()
        let metrics = { turns: 0, toolCalls: 0, handoffs: 0 }
        const write = (event: Record<string, unknown>) => {
          const enriched = { version: '1', request_id: requestId, ...event }
          if (adminAiLogsEnabled() && debugLogsEnabled()) {
            try {
              const t = (event as any)?.type
              if (t !== 'assistant_delta') console.log('[AdminAI route] sse_out', { requestId, type: t })
            } catch {}
          }
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(enriched)}\n\n`))
        }
        // Agents decide next steps based solely on messages (including any user-confirmed info embedded in prior turns)
        // Wrap the run in a request-scoped context to enable per-request caches (e.g., URL validation)
        void withRequestContext(requestId, () =>
          runChatWithAgentsStream({
            messages,
            userEmail: user.email!,
            write,
            uiLanguage,
            requestId,
            onMetrics: (m) => {
              metrics = { ...metrics, ...m }
            },
          })
        )
          .then(async () => {
            try {
              await releaseConcurrency({ route: routeKey, userId: user.id, ttlSeconds: 120 })
            } catch (e) {
              console.error('releaseConcurrency failed', e)
            }
            if (adminAiLogsEnabled()) {
              try { console.log('[AdminAI route] stream_complete', { requestId }) } catch {}
            }
            controller.close()
          })
          .catch((err) => {
            const e = err as any
            const msg = (e?.message as string) || 'orchestrator error'
            // Best-effort extraction of tool name and JSON path from the error message
            const tool =
              typeof e?.functionName === 'string'
                ? (e.functionName as string)
                : (/function '([^']+)'/.exec(msg)?.[1] || undefined)
            const contextPath = (() => {
              try {
                const m = /context=\(([^)]+)\)/.exec(msg)
                if (!m) return undefined
                const parts = m[1]
                  .split(',')
                  .map((s) => s.replace(/['\s]/g, ''))
                  .filter(Boolean)
                // Drop structural markers like anyOf/properties and numeric indices
                return parts
                  .filter((p) => p !== 'anyOf' && p !== 'properties' && !/^\d+$/.test(p))
                  .join('.') || undefined
              } catch {
                return undefined
              }
            })()
            // Always log a structured error for operators
            try {
              const raw = process.env.AGENT_MAX_TURNS?.trim()
              const envMax = raw ? Number.parseInt(raw, 10) : NaN
              const maxTurns = Number.isFinite(envMax) && envMax > 0 ? envMax : ADMIN_AGENT_MAX_TURNS_DEFAULT
              console.error('[AdminAI route] orchestrator_error', {
                requestId,
                message: msg,
                tool,
                path: contextPath,
                code: e?.code,
                status: e?.status,
                metrics,
                maxTurns,
              })
            } catch {}
            const payload = { version: '1', request_id: requestId, type: 'error', message: msg, tool, path: contextPath }
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`))
            void releaseConcurrency({ route: routeKey, userId: user.id, ttlSeconds: 120 }).finally(() => controller.close())
          })
      },
    })

    return new NextResponse(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
        'X-Request-ID': requestId,
        ...rateLimitHeaders(rl),
      },
    })
  } catch (error) {
    if (adminAiLogsEnabled()) {
      try { console.error('[AdminAI route] route_error', error) } catch {}
    }
    return new NextResponse('Stream error', { status: 500 })
  }
}
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const revalidate = 0
