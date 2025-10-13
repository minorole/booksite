import { logOperation } from '@/lib/openai';
import { NextResponse } from 'next/server';
import { assertAdmin, UnauthorizedError, getAuthUser } from '@/lib/security/guards'
import { checkRateLimit, rateLimitHeaders, acquireConcurrency, releaseConcurrency } from '@/lib/security/ratelimit'
import { 
  type Message
} from '@/lib/admin/types';
import { runChatWithTools } from '@/lib/admin/chat/orchestrator'
import { 
  ADMIN_SYSTEM_PROMPT, 
  VISION_ANALYSIS_PROMPT, 
  ORDER_PROCESSING_PROMPT 
} from '@/lib/admin/system-prompts';
import { type CategoryType } from '@/lib/db/enums'

// (removed unused convertToolsToFunctions helper)

function getSystemPrompt(messages: Message[]): string {
  const hasImage = messages.some(msg => 
    Array.isArray(msg.content) && 
    msg.content.some(c => c.type === 'image_url')
  );
  
  const isOrderRelated = messages.some(msg => 
    typeof msg.content === 'string' && 
    (msg.content.toLowerCase().includes('order') || 
     msg.content.includes('订单') ||
     msg.content.includes('發貨'))
  );

  if (hasImage) {
    return `${ADMIN_SYSTEM_PROMPT}\n\n${VISION_ANALYSIS_PROMPT}`;
  } else if (isOrderRelated) {
    return `${ADMIN_SYSTEM_PROMPT}\n\n${ORDER_PROCESSING_PROMPT}`;
  }
  
  return ADMIN_SYSTEM_PROMPT;
}

export async function POST(request: Request) {
  try {
    // Auth + rate limit
    let user
    try {
      user = await assertAdmin()
    } catch (e) {
      if (e instanceof UnauthorizedError) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
      throw e
    }
    const rl = await checkRateLimit({ route: '/api/admin/ai-chat', userId: user.id })
    if (rl.enabled && !rl.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        { status: 429, headers: rateLimitHeaders(rl) }
      )
    }

    const sem = await acquireConcurrency({ route: '/api/admin/ai-chat', userId: user.id, ttlSeconds: 30 })
    if (sem.enabled && !sem.acquired) {
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        { status: 429, headers: rateLimitHeaders(rl) }
      )
    }

    logOperation('CHAT_REQUEST', {
      timestamp: new Date().toISOString()
    })

    const { messages, imageUrl, confirmedInfo }: { 
      messages: Message[], 
      imageUrl?: string,
      confirmedInfo?: {
        title_zh?: string
        title_en?: string | null
        author_zh?: string | null
        author_en?: string | null
        publisher_zh?: string | null
        publisher_en?: string | null
        category_type?: CategoryType
      }
    } = await request.json()

    console.log(' Received messages:', messages)
    console.log(' Image URL:', imageUrl)
    if (confirmedInfo) {
      console.log(' Confirmed Info:', confirmedInfo)
    }

    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: 'Invalid request: messages array required' },
        { status: 400 }
      )
    }

    // Add system prompt if not present
    if (!messages.find(m => m.role === 'system')) {
      messages.unshift({
        role: 'system',
        content: getSystemPrompt(messages)
      })
    }

    // Delegate conversation to server orchestrator which executes tools
    const { messages: delta } = await runChatWithTools({
      messages,
      userEmail: user.email!,
      imageUrl,
      confirmedInfo,
    })

    return NextResponse.json(
      { messages: delta },
      { headers: rl.enabled ? rateLimitHeaders(rl) : undefined }
    )

  } catch (error) {
    console.error('❌ Chat API Error:', error)
    logOperation('CHAT_ERROR', {
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    })

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  } finally {
    try {
      const user = await getAuthUser()
      if (user) {
        await releaseConcurrency({ route: '/api/admin/ai-chat', userId: user.id, ttlSeconds: 30 })
      }
    } catch {}
  }
} 
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const revalidate = 0
