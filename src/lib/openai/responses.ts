import type OpenAI from 'openai'
import type { ChatCompletion } from 'openai/resources/chat/completions'
import type { ChatCompletionMessage } from './types'

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

type ResponsesCreate = {
  id?: string
  usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number }
  output_text?: string
}

export async function createViaResponses(
  client: OpenAI,
  model: string,
  payload: { instructions?: string; input: string },
  temperature: number,
  max_tokens: number
): Promise<ChatCompletion> {
  const rsp: ResponsesCreate = await (client as unknown as { responses: { create: (p: unknown) => Promise<ResponsesCreate> } }).responses.create({
    model,
    instructions: payload.instructions,
    input: payload.input,
    max_output_tokens: max_tokens,
    temperature,
  })

  const synthetic: ChatCompletion = {
    id: rsp.id || 'rsp_' + Date.now(),
    object: 'chat.completion',
    created: Math.floor(Date.now() / 1000),
    model,
    usage: (rsp.usage && rsp.usage.prompt_tokens !== undefined && rsp.usage.completion_tokens !== undefined && rsp.usage.total_tokens !== undefined)
      ? { prompt_tokens: rsp.usage.prompt_tokens!, completion_tokens: rsp.usage.completion_tokens!, total_tokens: rsp.usage.total_tokens! }
      : { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
    choices: [
      {
        index: 0,
        finish_reason: 'stop',
        logprobs: null,
        message: { role: 'assistant', content: rsp.output_text || '' } as ChatCompletion['choices'][number]['message'],
      },
    ],
  }
  return synthetic
}
