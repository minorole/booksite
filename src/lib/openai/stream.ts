import { logOperation } from './logging'
import type { ChatCompletionChunk } from 'openai/resources/chat/completions'

export function iteratorToStream(iterator: AsyncIterator<Uint8Array>) {
  return new ReadableStream({
    async pull(controller) {
      try {
        const { value, done } = await iterator.next()
        if (done) {
          controller.close()
        } else {
          controller.enqueue(value)
        }
      } catch (error) {
        logOperation('STREAM_ERROR', { error })
        controller.error(error)
      }
    },
  })
}

export async function* createResponseIterator(response: AsyncIterable<ChatCompletionChunk>) {
  const encoder = new TextEncoder()
  for await (const chunk of response) {
    const { delta } = chunk.choices[0]

    if (delta?.content) {
      yield encoder.encode(`data: ${JSON.stringify({ message: { content: delta.content } })}\n\n`)
    }

    if (delta?.function_call) {
      yield encoder.encode(
        `data: ${JSON.stringify({ message: { function_call: delta.function_call } })}\n\n`
      )
    }

    if (delta?.tool_calls) {
      yield encoder.encode(`data: ${JSON.stringify({ message: { tool_calls: delta.tool_calls } })}\n\n`)
    }
  }
}
