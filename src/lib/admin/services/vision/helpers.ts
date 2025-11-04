import { createVisionChatCompletion } from '@/lib/openai';
import {
  type ChatCompletion,
  type ChatCompletionMessageParam,
} from 'openai/resources/chat/completions';
import { visionStructuredResponseFormat } from './schemas';

export async function callVisionJSON<T>(
  schemaName: string,
  schema: Record<string, unknown>,
  messages: ChatCompletionMessageParam[],
): Promise<T> {
  const response = (await createVisionChatCompletion({
    messages,
    response_format: visionStructuredResponseFormat(schemaName, schema),
  })) as ChatCompletion;
  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error('No analysis received from vision model');
  return JSON.parse(content) as T;
}
