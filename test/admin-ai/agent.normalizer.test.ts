import { describe, it, expect } from 'vitest'
import { extractAssistantTextDeltas, normalizeRunItemToAssistantEvents } from '@/lib/admin/chat/normalize-agent-events'

describe('Agent event normalizer', () => {
  it('extracts from content array with output_text segments', () => {
    const raw = {
      content: [
        { type: 'output_text', text: 'Hello ' },
        { type: 'output_text', text: 'world' },
      ],
    }
    const pieces = extractAssistantTextDeltas(raw)
    expect(pieces).toEqual(['Hello ', 'world'])
  })

  it('extracts from top-level output_text.delta', () => {
    const raw = { type: 'output_text.delta', delta: 'Hi' }
    const pieces = extractAssistantTextDeltas(raw)
    expect(pieces).toEqual(['Hi'])
  })

  it('extracts from nested delta object', () => {
    const raw = { delta: { type: 'output_text.delta', delta: 'There' } }
    const pieces = extractAssistantTextDeltas(raw)
    expect(pieces).toEqual(['There'])
  })

  it('normalizes non-tool run items to assistant_delta events', () => {
    const input = {
      name: 'message_output_created',
      raw: {
        content: [
          { type: 'output_text', text: 'A' },
          { type: 'output_text', text: 'B' },
        ],
      },
    }
    const events = normalizeRunItemToAssistantEvents(input)
    expect(events).toEqual([
      { type: 'assistant_delta', content: 'A' },
      { type: 'assistant_delta', content: 'B' },
    ])
  })

  it('returns empty for tool events', () => {
    const events1 = normalizeRunItemToAssistantEvents({ name: 'tool_called', raw: {} })
    const events2 = normalizeRunItemToAssistantEvents({ name: 'tool_output', raw: {} })
    expect(events1.length).toBe(0)
    expect(events2.length).toBe(0)
  })

  it('is resilient to unknown shapes', () => {
    const events = normalizeRunItemToAssistantEvents({ name: 'unknown_event', raw: { foo: 'bar' } })
    expect(events).toEqual([])
  })
})

