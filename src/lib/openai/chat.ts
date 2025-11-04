import OpenAI from 'openai';
import type { ChatCompletion } from 'openai/resources/chat/completions';
import { getAdminClient } from './client';
import { getModel } from './models';
import { logOperation } from './logging';
import { OpenAIError } from './errors';
import { createViaResponsesFromMessages, streamViaResponsesFromMessages } from './responses';
import { OPENAI_CONFIG } from './config';
import type { ChatOptions, ChatResponse } from './types';

export async function createChatCompletion({
  messages,
  stream,
  temperature = 0.7,
  max_tokens,
}: ChatOptions): Promise<ChatResponse> {
  const startTime = Date.now();
  const maxTokens = max_tokens ?? OPENAI_CONFIG.TOKENS.MAX_OUTPUT;

  try {
    const MODEL = getModel('text');
    logOperation('REQUEST', {
      messageCount: messages.length,
      model: MODEL,
    });

    const client = getAdminClient('text');
    // Streaming branch: return a ReadableStream of UTF-8 assistant text deltas
    if (stream === true) {
      const rs = await streamViaResponsesFromMessages(client, MODEL, messages as any, {
        temperature,
        max_tokens: maxTokens,
      });
      logOperation('RESPONSE_STREAMING_START', { model: MODEL, messageCount: messages.length });
      return rs as unknown as ChatResponse;
    }
    // Non-streaming: use Responses API and synthesize a ChatCompletion-shaped object
    const response = await createViaResponsesFromMessages(client, MODEL, messages as any, {
      temperature,
      max_tokens: maxTokens,
    });

    const duration = Date.now() - startTime;
    logOperation('RESPONSE', { duration, status: 'success' });

    return response as ChatCompletion;
  } catch (error: unknown) {
    const duration = Date.now() - startTime;
    logOperation('ERROR', {
      duration,
      error,
    });

    if (error instanceof OpenAI.APIError) {
      throw new OpenAIError(error.message, 'api_error', error.status, {
        totalTokens: 0,
        promptTokens: 0,
        responseTokens: 0,
        timestamp: new Date().toISOString(),
        operation: 'chat_completion',
        model: OPENAI_CONFIG.MODELS.GPT5_MINI,
      });
    }
    throw new OpenAIError('Unknown error occurred', 'unknown_error');
  }
}
