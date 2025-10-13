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

export async function createViaResponses(
  client: OpenAI,
  model: string,
  payload: { instructions?: string; input: string },
  temperature: number,
  max_tokens: number
): Promise<ChatCompletion> {
  const rsp: any = await (client as any).responses.create({
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
    usage: rsp.usage || { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
    choices: [
      {
        index: 0,
        finish_reason: 'stop',
        logprobs: null as any,
        message: { role: 'assistant', content: rsp.output_text || '' } as any,
      },
    ],
  }
  return synthetic
}

