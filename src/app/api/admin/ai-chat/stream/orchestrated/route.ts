import { NextResponse } from 'next/server'
import { assertAdmin, UnauthorizedError } from '@/lib/security/guards'
import type { Message } from '@/lib/admin/types'
import { runChatWithAgentsStream } from '@/lib/admin/chat/orchestrator-agentkit'

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

    const stream = new ReadableStream({
      start(controller) {
        const encoder = new TextEncoder()
        const write = (event: any) => {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`))
        }
        // imageUrl / confirmedInfo are no longer used; agents decide next steps from messages
        runChatWithAgentsStream({ messages, userEmail: user.email!, write })
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
