import OpenAI from 'openai'
import type { ChatCompletion, ChatCompletionChunk, ChatCompletionCreateParamsBase } from 'openai/resources/chat/completions'
import { getAdminClient } from './client'
import { getModel } from './models'
import { logOperation } from './logging'
import { OpenAIError } from './errors'
import { iteratorToStream, createResponseIterator } from './stream'
import { OPENAI_CONFIG } from './config'
import type { ChatOptions, ChatResponse } from './types'

export async function createVisionChatCompletion({
  messages,
  stream = false,
  max_tokens,
  response_format,
}: Omit<ChatOptions, 'tools' | 'tool_choice' | 'temperature'> & { response_format?: unknown }): Promise<ChatResponse> {
  const startTime = Date.now()
  const maxTokens = max_tokens ?? OPENAI_CONFIG.TOKENS.MAX_OUTPUT
  const imageCount = messages.reduce((count, message) => {
    if (Array.isArray(message.content)) {
      return count + message.content.filter((c) => typeof c === 'object' && c !== null && 'image_url' in c).length
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
      model: getModel('vision'),
    })

    const client = getAdminClient()
    const params: Pick<ChatCompletionCreateParamsBase, 'messages'> & { model: string; stream?: boolean; max_tokens?: number; temperature?: number; response_format?: unknown } = {
      model: getModel('vision'),
      messages,
      stream,
      max_tokens: maxTokens,
      temperature: 0,
      ...(response_format ? { response_format } : {}),
    }
    const response = await client.chat.completions.create(params as unknown as ChatCompletionCreateParamsBase)

    const duration = Date.now() - startTime
    logOperation('VISION_RESPONSE', { duration, stream, imageCount, status: 'success' })

    if (stream) {
      const streamResp = response as unknown as AsyncIterable<ChatCompletionChunk>
      return iteratorToStream(createResponseIterator(streamResp))
    }

    return response as ChatCompletion
  } catch (error: unknown) {
    const duration = Date.now() - startTime
    logOperation('VISION_ERROR', {
      duration,
      imageCount,
      error,
    })

    if (error instanceof OpenAI.APIError) {
      throw new OpenAIError(error.message, 'vision_api_error', error.status, {
        totalTokens: 0,
        promptTokens: 0,
        responseTokens: 0,
        images: imageCount,
        timestamp: new Date().toISOString(),
        operation: 'vision_completion',
        model: getModel('vision'),
      })
    }
    throw new OpenAIError('Unknown error occurred in vision API', 'unknown_vision_error')
  }
}
