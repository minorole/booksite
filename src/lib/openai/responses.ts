import OpenAI from 'openai'
import type { ChatCompletion } from 'openai/resources/chat/completions'
import type { ChatCompletionMessage } from './types'
import { OpenAIError } from './errors'

export function isResponsesAPIEnabled() {
  return process.env.OPENAI_USE_RESPONSES === '1'
}

export function toResponsesPayload(messages: ChatCompletionMessage[]) {
  const system = messages.find((m) => m.role === 'system')
  const instructions = typeof system?.content === 'string' ? (system!.content as string) : undefined
  const text = messages
    .filter((m) => typeof m.content === 'string')
    .map((m) => `${m.role}: ${m.content}`)
    .join('\n')
  return { instructions, input: text }
}

export async function createViaResponses(
  client: OpenAI,
  model: string,
  payload: { instructions?: string; input: string },
  temperature: number,
  max_tokens: number
): Promise<ChatCompletion> {
  const rsp = await client.responses.create({
    model,
    instructions: payload.instructions,
    input: payload.input,
    max_output_tokens: max_tokens,
    temperature,
  })

  if (!rsp.id) {
    throw new OpenAIError('Responses API returned no id', 'api_error')
  }
  if (!rsp.output_text || !rsp.output_text.trim()) {
    throw new OpenAIError('Responses API returned empty output', 'api_error')
  }

  const synthetic: ChatCompletion = {
    id: rsp.id,
    object: 'chat.completion',
    created: Math.floor(Date.now() / 1000),
    model,
    choices: [
      {
        index: 0,
        finish_reason: 'stop',
        logprobs: null,
        message: { role: 'assistant', content: rsp.output_text } as ChatCompletion['choices'][number]['message'],
      },
    ],
  }
  return synthetic
}
