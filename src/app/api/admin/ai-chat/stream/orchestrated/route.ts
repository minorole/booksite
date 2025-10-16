import { NextResponse } from 'next/server'
import { assertAdmin, UnauthorizedError } from '@/lib/security/guards'
import type { Message } from '@/lib/admin/types'
import { runChatWithAgentsStream } from '@/lib/admin/chat/orchestrator-agentkit'
import { checkRateLimit, rateLimitHeaders, acquireConcurrency, releaseConcurrency } from '@/lib/security/ratelimit'

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

    const { messages, imageUrl, confirmedInfo }: { messages: Message[]; imageUrl?: string; confirmedInfo?: Record<string, unknown> } = await request.json()
    if (!Array.isArray(messages) || messages.length === 0) {
      return new NextResponse('Invalid request', { status: 400 })
    }

    const routeKey = '/api/admin/ai-chat/stream/orchestrated'

    // Rate limit per user
    const rl = await checkRateLimit({ route: routeKey, userId: user.id })
    if (rl.enabled && !rl.allowed) {
      return new NextResponse('Rate limit exceeded', { status: 429, headers: rateLimitHeaders(rl) })
    }

    // Concurrency control per user
    const sem = await acquireConcurrency({ route: routeKey, userId: user.id, ttlSeconds: 120 })
    if (sem.enabled && !sem.acquired) {
      return new NextResponse('Rate limit exceeded', { status: 429, headers: rateLimitHeaders(rl) })
    }

    const stream = new ReadableStream({
      start(controller) {
        const encoder = new TextEncoder()
        const write = (event: any) => {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`))
        }
        // imageUrl / confirmedInfo are no longer used; agents decide next steps from messages
        runChatWithAgentsStream({ messages, userEmail: user.email!, write })
          .then(async () => {
            try { await releaseConcurrency({ route: routeKey, userId: user.id, ttlSeconds: 120 }) } catch {}
            controller.close()
          })
          .catch((err) => {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'error', message: (err as Error).message })}\n\n`))
            releaseConcurrency({ route: routeKey, userId: user.id, ttlSeconds: 120 }).finally(() => controller.close())
          })
      },
    })

    return new NextResponse(stream as any, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
        ...rateLimitHeaders(rl),
      },
    })
  } catch (error) {
    return new NextResponse('Stream error', { status: 500 })
  }
}
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const revalidate = 0
