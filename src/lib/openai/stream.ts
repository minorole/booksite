import { logOperation } from './logging';

export function iteratorToStream(iterator: AsyncIterator<Uint8Array>) {
  return new ReadableStream({
    async pull(controller) {
      try {
        const { value, done } = await iterator.next();
        if (done) {
          controller.close();
        } else {
          controller.enqueue(value);
        }
      } catch (error) {
        logOperation('STREAM_ERROR', { error });
        controller.error(error);
      }
    },
  });
}

// (Removed deprecated Chat Completions streaming iterator)

// Responses API streaming helpers
// Convert an AsyncIterable of OpenAI Responses events to an iterator of UTF-8 text deltas
export async function* responsesTextDeltaIterator(events: AsyncIterable<unknown>) {
  const encoder = new TextEncoder();
  for await (const ev of events) {
    try {
      const type = (ev as any)?.type;
      if (type === 'response.output_text.delta') {
        const delta = (ev as any)?.delta;
        if (typeof delta === 'string' && delta.length > 0) {
          yield encoder.encode(delta);
        }
      }
    } catch (error) {
      logOperation('STREAM_ERROR', { error });
      // propagate as stream error for the consumer
      throw error;
    }
  }
}

// Create a ReadableStream<Uint8Array> of assistant text deltas from Responses events
export function responsesEventsToTextStream(
  events: AsyncIterable<unknown>,
): ReadableStream<Uint8Array> {
  return iteratorToStream(responsesTextDeltaIterator(events));
}
