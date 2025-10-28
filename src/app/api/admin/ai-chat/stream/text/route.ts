import { NextResponse } from 'next/server'
import { assertAdmin, UnauthorizedError } from '@/lib/security/guards'
import type { Message as AdminMessage } from '@/lib/admin/types'
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions'
import { createChatCompletion } from '@/lib/openai'
import { checkRateLimit, rateLimitHeaders, acquireConcurrency, releaseConcurrency } from '@/lib/security/ratelimit'
import { adminAiLogsEnabled } from '@/lib/observability/toggle'
import { withRequestContext } from '@/lib/runtime/request-context'

function toOpenAIMessages(messages: AdminMessage[] | ChatCompletionMessageParam[]): ChatCompletionMessageParam[] {
  const arr = Array.isArray(messages) ? messages : []
  const out: ChatCompletionMessageParam[] = []
  for (const m of arr as any[]) {
    if (!m || typeof m !== 'object') continue
    const role = (m as any).role
    if (role !== 'system' && role !== 'user' && role !== 'assistant') continue
    const content = (m as any).content
    if (typeof content === 'string') {
      out.push({ role, content })
      continue
    }
    if (Array.isArray(content)) {
      // Map admin content parts to OpenAI parts (compatible shape)
      const parts: Array<{ type: 'text' | 'image_url'; text?: string; image_url?: { url: string } }> = []
      for (const c of content) {
        if (!c || typeof c !== 'object') continue
        if ((c as any).type === 'text' && typeof (c as any).text === 'string') {
          parts.push({ type: 'text', text: (c as any).text })
        } else if ((c as any).type === 'image_url' && (c as any).image_url && typeof (c as any).image_url.url === 'string') {
          parts.push({ type: 'image_url', image_url: { url: (c as any).image_url.url } })
        }
      }
      if (parts.length > 0) out.push({ role, content: parts as any })
    }
  }
  return out
}

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

    const { messages, temperature, max_tokens }: { messages: AdminMessage[] | ChatCompletionMessageParam[]; temperature?: number; max_tokens?: number } = await request.json()
    if (!Array.isArray(messages) || messages.length === 0) {
      return new NextResponse('Invalid request', { status: 400 })
    }

    const routeKey = '/api/admin/ai-chat/stream/text'
    const requestId = (globalThis.crypto?.randomUUID?.() || Math.random().toString(36).slice(2)) as string

    if (adminAiLogsEnabled()) {
      try {
        console.log('[AdminAI text-stream] request_start', {
          requestId,
          route: routeKey,
          userEmail: user.email,
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
      try { console.log('[AdminAI text-stream] ratelimit', { requestId, enabled: rl.enabled, allowed: rl.allowed, remaining: rl.remaining }) } catch {}
    }

    // Concurrency control per user
    const sem = await acquireConcurrency({ route: routeKey, userId: user.id, ttlSeconds: 120 })
    if (sem.enabled && !sem.acquired) {
      return new NextResponse('Rate limit exceeded', { status: 429, headers: rateLimitHeaders(rl) })
    }
    if (adminAiLogsEnabled()) {
      try { console.log('[AdminAI text-stream] concurrency', { requestId, enabled: sem.enabled, acquired: sem.acquired, current: sem.current, limit: sem.limit }) } catch {}
    }

    const openaiMessages = toOpenAIMessages(messages)

    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        const enc = new TextEncoder()
        const dec = new TextDecoder()
        try {
          const rs = await withRequestContext(requestId, async () => (
            (await createChatCompletion({ messages: openaiMessages as any, stream: true, temperature, max_tokens })) as unknown as ReadableStream<Uint8Array>
          ))
          const reader = rs.getReader()
          while (true) {
            const { value, done } = await reader.read()
            if (done) break
            if (value && value.byteLength > 0) {
              const text = dec.decode(value, { stream: true })
              controller.enqueue(enc.encode(`data: ${JSON.stringify({ version: '1', request_id: requestId, type: 'assistant_delta', content: text })}\n\n`))
            }
          }
          // flush decoder
          const rest = dec.decode()
          if (rest) {
            controller.enqueue(enc.encode(`data: ${JSON.stringify({ version: '1', request_id: requestId, type: 'assistant_delta', content: rest })}\n\n`))
          }
          controller.enqueue(enc.encode(`data: ${JSON.stringify({ version: '1', request_id: requestId, type: 'assistant_done' })}\n\n`))
          await releaseConcurrency({ route: routeKey, userId: user.id, ttlSeconds: 120 })
          if (adminAiLogsEnabled()) {
            try { console.log('[AdminAI text-stream] stream_complete', { requestId }) } catch {}
          }
          controller.close()
        } catch (err) {
          const msg = (err as Error)?.message || 'stream error'
          if (adminAiLogsEnabled()) {
            try { console.error('[AdminAI text-stream] error', { requestId, message: msg }) } catch {}
          }
          controller.enqueue(enc.encode(`data: ${JSON.stringify({ version: '1', request_id: requestId, type: 'error', message: msg })}\n\n`))
          await releaseConcurrency({ route: routeKey, userId: user.id, ttlSeconds: 120 })
          controller.close()
        }
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
      try { console.error('[AdminAI text-stream] route_error', error) } catch {}
    }
    return new NextResponse('Stream error', { status: 500 })
  }
}

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const revalidate = 0
