import { createVisionChatCompletion } from '@/lib/openai'
import { type ChatCompletion } from 'openai/resources/chat/completions'
import { visionStructuredResponseFormat } from './schemas'

export async function callVisionJSON<T>(schemaName: string, schema: Record<string, any>, messages: any[]): Promise<T> {
  const response = (await createVisionChatCompletion({
    messages,
    stream: false,
    response_format: visionStructuredResponseFormat(schemaName, schema),
  })) as ChatCompletion
  const content = response.choices[0]?.message?.content
  if (!content) throw new Error('No analysis received from vision model')
  return JSON.parse(content) as T
}

