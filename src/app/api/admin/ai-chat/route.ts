import { openai, createChatCompletion, logOperation } from '@/lib/openai';
import { NextResponse } from 'next/server';
import { 
  type Message, 
  type ChatResponse, 
  type OpenAIMessage 
} from '@/lib/admin/types';
import { adminTools } from '@/lib/admin/function-definitions';
import { 
  ADMIN_SYSTEM_PROMPT, 
  VISION_ANALYSIS_PROMPT, 
  ORDER_PROCESSING_PROMPT 
} from '@/lib/admin/system-prompts';
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions';
import { type ChatCompletion } from 'openai/resources/chat/completions'

/**
 * Converts our Message type to OpenAI's ChatCompletionMessageParam
 */
function convertMessage(message: Message): ChatCompletionMessageParam {
  // For array content (like image messages)
  if (Array.isArray(message.content)) {
    return {
      role: message.role === 'tool' ? 'assistant' : message.role,
      content: message.content.map(c => ({
        type: c.type,
        ...(c.type === 'text' ? { text: c.text } : {}),
        ...(c.type === 'image_url' ? { image_url: c.image_url } : {})
      })),
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
      role: 'assistant',
      content: message.content || '',
      name: message.name,
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

/**
 * Convert tools to functions format for OpenAI API
 */
function convertToolsToFunctions() {
  return adminTools.map(tool => ({
    name: tool.function.name,
    description: tool.function.description,
    parameters: tool.function.parameters
  }))
}

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
    logOperation('CHAT_REQUEST', {
      timestamp: new Date().toISOString()
    })

    const { messages }: { messages: Message[] } = await request.json()
    console.log(' Received messages:', messages)
    
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
    console.log('📤 Converted messages:', openAIMessages)

    // Convert tools to functions format
    const functions = convertToolsToFunctions()

    // Use non-streaming completion
    const completion = await createChatCompletion({
      messages: openAIMessages,
      functions,
      function_call: 'auto'
    }) as ChatCompletion

    console.log('📥 OpenAI response:', completion)

    // Extract the message from the completion
    const message = completion.choices[0].message as OpenAIMessage
    console.log('📝 Extracted message:', message)

    // Return the message in our expected format
    return NextResponse.json({ 
      message: {
        role: message.role,
        content: message.content,
        ...(message.function_call && { function_call: message.function_call }),
        ...(message.tool_calls && { tool_calls: message.tool_calls })
      }
    })

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
  }
} 