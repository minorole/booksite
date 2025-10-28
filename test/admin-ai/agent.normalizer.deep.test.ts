import { describe, it, expect } from 'vitest'
import { extractAssistantTextDeltas, normalizeRunItemToAssistantEvents } from '@/lib/admin/chat/normalize-agent-events'

describe('Agent event normalizer – deep shapes', () => {
  it('extracts from nested message.content with output_text.delta', () => {
    const raw = {
      message: {
        content: [
          { type: 'output_text.delta', delta: 'Hello' },
          { type: 'output_text.delta', delta: ' world' },
        ],
      },
    }
    const pieces = extractAssistantTextDeltas(raw)
    expect(pieces).toEqual(['Hello', ' world'])
  })

  it('extracts from message.delta tree', () => {
    const raw = {
      message: {
        delta: { type: 'output_text.delta', delta: 'Hi there' },
      },
    }
    const pieces = extractAssistantTextDeltas(raw)
    expect(pieces).toEqual(['Hi there'])
  })

  it('works through normalizeRunItemToAssistantEvents for message_output_delta', () => {
    const input = {
      name: 'message_output_delta',
      raw: { message: { delta: { type: 'output_text.delta', delta: 'Streamed' } } },
    }
    const events = normalizeRunItemToAssistantEvents(input)
    expect(events).toEqual([{ type: 'assistant_delta', content: 'Streamed' }])
  })
})

