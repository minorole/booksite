import { NextResponse } from 'next/server'
import { assertAdmin, UnauthorizedError } from '@/lib/security/guards'
import type { Message } from '@/lib/admin/types'
import { runChatWithAgentsStream } from '@/lib/admin/chat/orchestrator-agentkit'
import { checkRateLimit, rateLimitHeaders, acquireConcurrency, releaseConcurrency } from '@/lib/security/ratelimit'
import { adminAiLogsEnabled } from '@/lib/observability/toggle'

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
    if (!rl.enabled && process.env.NODE_ENV === 'production') {
      return new NextResponse('Rate limiting unavailable', { status: 503 })
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
        const write = (event: Record<string, unknown>) => {
          const enriched = { version: '1', request_id: requestId, ...event }
          if (adminAiLogsEnabled()) {
            try { console.log('[AdminAI route] sse_out', { requestId, type: (event as any)?.type }) } catch {}
          }
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(enriched)}\n\n`))
        }
        // Agents decide next steps based solely on messages (including any user-confirmed info embedded in prior turns)
        void runChatWithAgentsStream({ messages, userEmail: user.email!, write, uiLanguage, requestId })
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
            const msg = (err as Error)?.message || 'orchestrator error'
            if (adminAiLogsEnabled()) {
              try { console.error('[AdminAI route] orchestrator_error', { requestId, message: msg }) } catch {}
            }
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ version: '1', request_id: requestId, type: 'error', message: msg })}\n\n`))
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
