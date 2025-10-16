import OpenAI from 'openai'
import type { ChatCompletion, ChatCompletionChunk, ChatCompletionCreateParamsBase } from 'openai/resources/chat/completions'
import { getAdminClient } from './client'
import { getModel } from './models'
import { logOperation } from './logging'
import { OpenAIError } from './errors'
import { isResponsesAPIEnabled, toResponsesPayload, createViaResponses } from './responses'
import { iteratorToStream, createResponseIterator } from './stream'
import { OPENAI_CONFIG } from './config'
import type { ChatOptions, ChatResponse } from './types'

export async function createChatCompletion({
  messages,
  stream,
  tools,
  tool_choice,
  temperature = 0.7,
  max_tokens,
}: ChatOptions): Promise<ChatResponse> {
  const startTime = Date.now()
  const maxTokens = max_tokens ?? OPENAI_CONFIG.TOKENS.MAX_OUTPUT

  try {
    const MODEL = getModel('text')
    logOperation('REQUEST', {
      messageCount: messages.length,
      hasTools: !!tools,
      model: MODEL,
    })

    const client = getAdminClient()
    if (isResponsesAPIEnabled() && !tools && !stream) {
      const payload = toResponsesPayload(messages)
      const synthetic: ChatCompletion = await createViaResponses(
        client,
        MODEL,
        payload,
        temperature,
        maxTokens
      )
      const duration = Date.now() - startTime
      logOperation('RESPONSE', { duration, status: 'success', usage: synthetic.usage })
      return synthetic
    }

    const params: Pick<ChatCompletionCreateParamsBase, 'messages' | 'tools' | 'tool_choice'> & {
      model: string; temperature?: number; max_tokens?: number; stream?: boolean
    } = {
      model: MODEL,
      messages,
      tools,
      tool_choice,
      temperature,
      max_tokens: maxTokens,
      stream,
    }
    const response = await client.chat.completions.create(params as unknown as ChatCompletionCreateParamsBase)

    const duration = Date.now() - startTime
    logOperation('RESPONSE', { duration, status: 'success' })

    if (stream) {
      const streamResp = response as unknown as AsyncIterable<ChatCompletionChunk>
      return iteratorToStream(createResponseIterator(streamResp))
    }
    return response as ChatCompletion
  } catch (error: unknown) {
    const duration = Date.now() - startTime
    logOperation('ERROR', {
      duration,
      error,
    })

    if (error instanceof OpenAI.APIError) {
      throw new OpenAIError(error.message, 'api_error', error.status, {
        totalTokens: 0,
        promptTokens: 0,
        responseTokens: 0,
        timestamp: new Date().toISOString(),
        operation: 'chat_completion',
        model: OPENAI_CONFIG.MODELS.GPT5_MINI,
      })
    }
    throw new OpenAIError('Unknown error occurred', 'unknown_error')
  }
}
