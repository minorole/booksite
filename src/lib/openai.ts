import OpenAI from 'openai'
import { type ChatCompletion } from 'openai/resources/chat/completions'
import { type ChatCompletionCreateParamsBase } from 'openai/resources/chat/completions'

/**
 * OpenAI Configuration Constants - Single source of truth for all OpenAI related configs
 */
export const OPENAI_CONFIG = {
  MODELS: {
    GPT4O: 'gpt-4o' as const,
    GPT4O_MINI: 'gpt-4o-mini' as const
  },
  TOKENS: {
    MAX_CONTEXT: 128_000,
    MAX_OUTPUT: 16_384
  },
  TIMEOUT: 30_000,
  MAX_RETRIES: 3,
  ROLES: {
    ADMIN: 'ADMIN' as const,
    USER: 'USER' as const
  }
} as const

/**
 * Context tracking interface for OpenAI operations
 */
interface ContextMetadata {
  totalTokens: number
  promptTokens: number
  responseTokens: number
  images?: number
  functions?: number
  timestamp: string
  operation: string
  model: string
}

/**
 * Centralized logging function for all OpenAI related operations
 */
export function logOperation(operation: string, details: Record<string, any>, error?: Error) {
  const logEntry = {
    operation,
    timestamp: new Date().toISOString(),
    ...details,
    ...(error && {
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack
      }
    })
  }
  console.log(`[OpenAI ${operation}]`, logEntry)
  return logEntry
}

export class OpenAIError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly status?: number,
    public readonly context?: ContextMetadata
  ) {
    super(message)
    this.name = 'OpenAIError'
    logOperation('ERROR', { code, status, context }, this)
  }
}

if (!process.env.OPENAI_API_KEY) {
  throw new OpenAIError('OPENAI_API_KEY is not defined', 'config_error')
}

export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  maxRetries: OPENAI_CONFIG.MAX_RETRIES,
  timeout: OPENAI_CONFIG.TIMEOUT
})

type ChatCompletionMessage = ChatCompletionCreateParamsBase['messages'][number]

export interface ChatOptions {
  messages: ChatCompletionMessage[]
  stream?: boolean
  tools?: ChatCompletionCreateParamsBase['tools']
  tool_choice?: ChatCompletionCreateParamsBase['tool_choice']
  temperature?: number
  max_tokens?: number
}

type ChatResponse = ChatCompletion | ReadableStream

/**
 * Creates a ReadableStream from an async iterator with enhanced error handling
 */
function iteratorToStream(iterator: AsyncIterator<Uint8Array>) {
  return new ReadableStream({
    async pull(controller) {
      try {
        const { value, done } = await iterator.next()
        console.log('🔄 Stream pull:', { done, hasValue: !!value })
        
        if (done) {
          console.log('🏁 Stream complete')
          controller.close()
        } else {
          const chunk = new TextDecoder().decode(value)
          console.log('📦 Stream chunk:', chunk)
          controller.enqueue(value)
        }
      } catch (error) {
        console.error('❌ Stream error:', error)
        logOperation('STREAM_ERROR', { error })
        controller.error(error)
      }
    },
  })
}

/**
 * Creates a streaming iterator for OpenAI responses
 * Handles content, function calls, and tool responses
 */
async function* createResponseIterator(response: AsyncIterable<any>) {
  const encoder = new TextEncoder()
  for await (const chunk of response) {
    console.log('🔄 Processing response chunk:', chunk)
    
    const { delta } = chunk.choices[0]
    console.log('📝 Delta:', delta)
    
    // Handle regular content
    if (delta?.content) {
      console.log('📝 Content delta:', delta.content)
      yield encoder.encode(`data: ${JSON.stringify({ message: { content: delta.content } })}\n\n`)
    }
    
    // Handle function calls
    if (delta?.function_call) {
      console.log('🔧 Function call delta:', delta.function_call)
      yield encoder.encode(`data: ${JSON.stringify({ message: { function_call: delta.function_call } })}\n\n`)
    }
    
    // Handle tool responses
    if (delta?.tool_calls) {
      console.log('🔨 Tool calls delta:', delta.tool_calls)
      yield encoder.encode(`data: ${JSON.stringify({ message: { tool_calls: delta.tool_calls } })}\n\n`)
    }
  }
}

/**
 * Core chat completion function with streaming support
 * Handles both regular chat and function calling
 */
export async function createChatCompletion({
  messages,
  tools,
  tool_choice,
  temperature = 0.7,
  max_tokens = OPENAI_CONFIG.TOKENS.MAX_OUTPUT,
}: ChatOptions): Promise<ChatCompletion> {
  const startTime = Date.now()
  
  try {
    logOperation('REQUEST', {
      messageCount: messages.length,
      hasTools: !!tools,
      model: OPENAI_CONFIG.MODELS.GPT4O
    })

    const response = await openai.chat.completions.create({
      model: OPENAI_CONFIG.MODELS.GPT4O,
      messages,
      tools,
      tool_choice,
      temperature,
      max_tokens,
    })

    const duration = Date.now() - startTime
    logOperation('RESPONSE', {
      duration,
      status: 'success',
      usage: response.usage
    })

    return response

  } catch (error) {
    const duration = Date.now() - startTime
    logOperation('ERROR', {
      duration,
      error
    })

    if (error instanceof OpenAI.APIError) {
      throw new OpenAIError(error.message, 'api_error', error.status, {
        totalTokens: 0,
        promptTokens: 0,
        responseTokens: 0,
        timestamp: new Date().toISOString(),
        operation: 'chat_completion',
        model: OPENAI_CONFIG.MODELS.GPT4O
      })
    }
    throw new OpenAIError('Unknown error occurred', 'unknown_error')
  }
}

/**
 * Vision-specific chat completion with book cover analysis
 */
export async function createVisionChatCompletion({
  messages,
  stream = false,
  max_tokens = OPENAI_CONFIG.TOKENS.MAX_OUTPUT,
}: Omit<ChatOptions, 'functions' | 'function_call'>): Promise<ChatResponse> {
  const startTime = Date.now()
  const imageCount = messages.reduce((count, message) => {
    if (Array.isArray(message.content)) {
      return count + message.content.filter(c => 'image_url' in c).length
    }
    return count
  }, 0)

  if (imageCount === 0) {
    throw new OpenAIError('No image found in messages', 'validation_error')
  }

  try {
    logOperation('VISION_REQUEST', {
      messageCount: messages.length,
      imageCount,
      stream,
      model: OPENAI_CONFIG.MODELS.GPT4O
    })

    const response = await openai.chat.completions.create({
      model: OPENAI_CONFIG.MODELS.GPT4O,
      messages,
      stream,
      max_tokens,
    })

    const duration = Date.now() - startTime
    logOperation('VISION_RESPONSE', {
      duration,
      stream,
      imageCount,
      status: 'success',
      usage: (response as ChatCompletion).usage
    })

    if (stream) {
      return iteratorToStream(createResponseIterator(response as any))
    }

    return response as ChatCompletion
  } catch (error) {
    const duration = Date.now() - startTime
    logOperation('VISION_ERROR', {
      duration,
      imageCount,
      error
    })

    if (error instanceof OpenAI.APIError) {
      throw new OpenAIError(error.message, 'vision_api_error', error.status, {
        totalTokens: 0,  // We don't have usage info in error
        promptTokens: 0,
        responseTokens: 0,
        images: imageCount,
        timestamp: new Date().toISOString(),
        operation: 'vision_completion',
        model: OPENAI_CONFIG.MODELS.GPT4O
      })
    }
    throw new OpenAIError('Unknown error occurred in vision API', 'unknown_vision_error')
  }
}

export type {
  ChatCompletionMessage,
  ChatResponse,
  ContextMetadata
} 