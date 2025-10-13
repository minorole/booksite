import { NextResponse } from 'next/server'
import { assertAdmin, UnauthorizedError } from '@/lib/security/guards'
import { runChatWithToolsStream } from '@/lib/admin/chat/orchestrator-stream'
import type { Message } from '@/lib/admin/types'
import { ADMIN_SYSTEM_PROMPT, VISION_ANALYSIS_PROMPT, ORDER_PROCESSING_PROMPT } from '@/lib/admin/system-prompts'

function getSystemPrompt(messages: Message[]): string {
  const hasImage = messages.some((msg) => Array.isArray(msg.content) && msg.content.some((c) => c.type === 'image_url'))
  const isOrderRelated = messages.some(
    (msg) => typeof msg.content === 'string' && (msg.content.toLowerCase().includes('order') || msg.content.includes('订单') || msg.content.includes('發貨'))
  )
  if (hasImage) return `${ADMIN_SYSTEM_PROMPT}\n\n${VISION_ANALYSIS_PROMPT}`
  if (isOrderRelated) return `${ADMIN_SYSTEM_PROMPT}\n\n${ORDER_PROCESSING_PROMPT}`
  return ADMIN_SYSTEM_PROMPT
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

    const { messages, imageUrl, confirmedInfo }: { messages: Message[]; imageUrl?: string; confirmedInfo?: Record<string, unknown> } = await request.json()
    if (!Array.isArray(messages) || messages.length === 0) {
      return new NextResponse('Invalid request', { status: 400 })
    }

    if (!messages.find((m) => m.role === 'system')) {
      messages.unshift({ role: 'system', content: getSystemPrompt(messages) })
    }

    const stream = new ReadableStream({
      start(controller) {
        const encoder = new TextEncoder()
        const write = (event: any) => {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`))
        }
        runChatWithToolsStream({ messages, userEmail: user.email!, imageUrl, confirmedInfo, write })
          .then(() => controller.close())
          .catch((err) => {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'error', message: (err as Error).message })}\n\n`))
            controller.close()
          })
      },
    })

    return new NextResponse(stream as any, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
      },
    })
  } catch (error) {
    return new NextResponse('Stream error', { status: 500 })
  }
}
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const revalidate = 0
