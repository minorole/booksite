import { createChatCompletion, logOperation } from '@/lib/openai';
import { NextResponse } from 'next/server';
import { getAuthUser, isAdmin } from '@/lib/security/guards'
import { checkRateLimit, rateLimitHeaders, acquireConcurrency, releaseConcurrency } from '@/lib/security/ratelimit'
import { 
  type Message
} from '@/lib/admin/types';
import { adminTools } from '@/lib/admin/function-definitions';
import { 
  ADMIN_SYSTEM_PROMPT, 
  VISION_ANALYSIS_PROMPT, 
  ORDER_PROCESSING_PROMPT 
} from '@/lib/admin/system-prompts';
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions';
import { type CategoryType } from '@prisma/client'

/**
 * Converts our Message type to OpenAI's ChatCompletionMessageParam
 */
function convertMessage(message: Message): ChatCompletionMessageParam {
  // For array content (like image messages)
  if (Array.isArray(message.content)) {
    console.log('📝 Converting array content message:', message)
    return {
      role: message.role,
      content: message.content.map(c => {
        if (c.type === 'text') {
          return { type: 'text', text: c.text }
        }
        if (c.type === 'image_url' && c.image_url) {
          console.log('🖼️ Processing image URL:', c.image_url.url)
          return { 
            type: 'image_url',
            image_url: {
              url: c.image_url.url
            }
          }
        }
        return c
      }),
      ...(message.name && { name: message.name }),
      ...(message.tool_call_id && { tool_call_id: message.tool_call_id })
    } as ChatCompletionMessageParam;
  }

  // For tool messages
  if (message.role === 'tool') {
    if (!message.name) {
      throw new Error('Tool messages must have a name');
    }
    return {
      role: 'tool',
      content: (message.content || '') as string,
      ...(message.tool_call_id && { tool_call_id: message.tool_call_id })
    } as ChatCompletionMessageParam;
  }

  // For regular messages
  return {
    role: message.role,
    content: message.content || '',
    ...(message.name && { name: message.name }),
    ...(message.tool_call_id && { tool_call_id: message.tool_call_id })
  } as ChatCompletionMessageParam;
}

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
    const user = await getAuthUser()
    if (!user || !isAdmin(user)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
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

    // Convert messages to OpenAI format
    const openAIMessages = messages.map(convertMessage)
    console.log('📤 Converted messages:', JSON.stringify(openAIMessages, null, 2))

    // Convert tools to functions format
    const tools = adminTools

    // Determine analysis stage from messages
    const lastUserMessage = messages.filter(m => m.role === 'user').pop()
    const isConfirmation = lastUserMessage?.content === 'Yes, the information is correct. Please proceed with the analysis.'
    
    // If this is a confirmation message, set tool_choice to force structured analysis
    const tool_choice = isConfirmation && confirmedInfo ? {
      type: "function" as const,
      function: {
        name: "analyze_book_cover",
        parameters: {
          image_url: imageUrl,
          stage: "structured" as const,
          confirmed_info: confirmedInfo
        }
      }
    } : "auto" as const

    // Use non-streaming completion
    const completion = await createChatCompletion({
      messages: openAIMessages,
      tools,
      tool_choice
    })

    console.log('📥 OpenAI response:', completion)

    // Extract the message from the completion
    const message = completion.choices[0].message
    console.log('📝 Extracted message:', message)

    // When creating chat completion, ensure tool calls use correct URL
    if (message.tool_calls?.[0] && imageUrl && 
        message.tool_calls[0].function.name === 'analyze_book_cover') {
      try {
        const toolCall = message.tool_calls[0]
        const args = JSON.parse(toolCall.function.arguments)
        if (args.image_url) {
          args.image_url = imageUrl
          toolCall.function.arguments = JSON.stringify(args)
          console.log('🔧 Updated tool call with correct image URL:', imageUrl)
        }
      } catch (e) {
        console.error('❌ Failed to update tool arguments:', e)
      }
    }

    // Format the response based on message type
    const formattedMessage: Message = {
      role: message.role,
      content: message.content,
      ...(message.tool_calls && {
        tool_calls: message.tool_calls.map(toolCall => ({
          id: toolCall.id,
          function: {
            name: toolCall.function.name,
            arguments: toolCall.function.arguments
          },
          type: 'function'
        }))
      })
    }

    console.log('📤 Formatted response message:', formattedMessage)

    return NextResponse.json(
      { message: formattedMessage },
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
