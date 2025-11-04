import OpenAI from 'openai';
import type { ChatCompletion } from 'openai/resources/chat/completions';
import type { ChatCompletionMessage } from './types';
import { OpenAIError } from './errors';
import { responsesEventsToTextStream } from './stream';

// (Removed unused toResponsesPayload helper)

// Convert Chat Completions style messages into Responses API input array
export function messagesToResponsesInput(messages: ChatCompletionMessage[]) {
  // Responses API expects an array of items; we’ll collapse to a single user message
  // with mixed content: text + images.
  // - System content becomes `instructions` at call site, so we do not include it here.
  // - Assistant messages (if any) are included as user content to preserve context minimally.
  const items: any[] = [];
  for (const m of messages) {
    if (m.role === 'system') continue;
    const role = m.role === 'assistant' ? 'user' : (m.role as 'user' | 'developer' | 'system');
    if (typeof m.content === 'string') {
      items.push({ type: 'message', role, content: [{ type: 'input_text', text: m.content }] });
    } else if (Array.isArray(m.content)) {
      const content: Array<{
        type: 'input_text' | 'input_image';
        text?: string;
        image_url?: string;
        detail?: 'auto' | 'low' | 'high';
      }> = [];
      for (const c of m.content as any[]) {
        if (!c) continue;
        if (c.type === 'text' && typeof c.text === 'string') {
          content.push({ type: 'input_text', text: c.text });
        } else if (c.type === 'image_url' && c.image_url?.url) {
          content.push({ type: 'input_image', image_url: c.image_url.url, detail: 'auto' });
        }
      }
      if (content.length > 0) {
        items.push({ type: 'message', role, content });
      }
    }
  }
  return items;
}

// Create a ChatCompletion-shaped response via Responses API from chat-style messages.
export async function createViaResponsesFromMessages(
  client: OpenAI,
  model: string,
  messages: ChatCompletionMessage[],
  opts?: {
    temperature?: number;
    max_tokens?: number;
    response_format?: unknown;
  },
): Promise<ChatCompletion> {
  const system = messages.find((m) => m.role === 'system');
  const instructions =
    typeof system?.content === 'string' ? (system!.content as string) : undefined;
  const input = messagesToResponsesInput(messages);

  // Map legacy response_format (json_schema) into Responses text.format
  let textConfig: any | undefined;
  const rf = opts?.response_format as any;
  if (rf && rf.type === 'json_schema' && rf.json_schema) {
    textConfig = {
      format: {
        type: 'json_schema',
        name: rf.json_schema.name ?? 'OutputSchema',
        schema: rf.json_schema.schema ?? rf.json_schema,
        strict: rf.json_schema.strict ?? true,
      },
    };
  }

  // Only include temperature when there are no image inputs.
  // Some vision models via Responses API reject top-level `temperature` when images are present.
  const hasImage =
    Array.isArray(input) &&
    input.some((it: any) => {
      const content = it && Array.isArray((it as any).content) ? (it as any).content : [];
      return content.some((c: any) => c && c.type === 'input_image');
    });

  const payload: any = {
    model,
    input,
    instructions,
    max_output_tokens: opts?.max_tokens,
    ...(textConfig ? { text: textConfig } : {}),
  };
  if (!hasImage && typeof opts?.temperature === 'number') {
    payload.temperature = opts.temperature;
  }

  const rsp = await client.responses.create(payload as any);

  if (!rsp.id) throw new OpenAIError('Responses API returned no id', 'api_error');

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
        message: {
          role: 'assistant',
          content: rsp.output_text ?? '',
        } as ChatCompletion['choices'][number]['message'],
      },
    ],
  };
  return synthetic;
}

// Stream assistant text via Responses API from chat-style messages
export async function streamViaResponsesFromMessages(
  client: OpenAI,
  model: string,
  messages: ChatCompletionMessage[],
  opts?: {
    temperature?: number;
    max_tokens?: number;
    response_format?: unknown;
  },
): Promise<ReadableStream<Uint8Array>> {
  const system = messages.find((m) => m.role === 'system');
  const instructions =
    typeof system?.content === 'string' ? (system!.content as string) : undefined;
  const input = messagesToResponsesInput(messages);

  // Map legacy response_format (json_schema) into Responses text.format
  let textConfig: any | undefined;
  const rf = opts?.response_format as any;
  if (rf && rf.type === 'json_schema' && rf.json_schema) {
    textConfig = {
      format: {
        type: 'json_schema',
        name: rf.json_schema.name ?? 'OutputSchema',
        schema: rf.json_schema.schema ?? rf.json_schema,
        strict: rf.json_schema.strict ?? true,
      },
    };
  }

  // Only include temperature when there are no image inputs.
  const hasImage =
    Array.isArray(input) &&
    input.some((it: any) => {
      const content = it && Array.isArray((it as any).content) ? (it as any).content : [];
      return content.some((c: any) => c && c.type === 'input_image');
    });

  const payload: any = {
    model,
    input,
    instructions,
    max_output_tokens: opts?.max_tokens,
    ...(textConfig ? { text: textConfig } : {}),
    stream: true,
  };
  if (!hasImage && typeof opts?.temperature === 'number') {
    payload.temperature = opts.temperature;
  }

  // The SDK returns an async iterable of events when stream: true
  const events = await client.responses.create(payload as any);
  return responsesEventsToTextStream(events as unknown as AsyncIterable<unknown>);
}
