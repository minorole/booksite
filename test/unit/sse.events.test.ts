import { describe, it, expect } from 'vitest'
import { parseSSEEvent } from '@/lib/admin/types/events'

describe('SSE events parser (v1)', () => {
  it('parses assistant_delta with v1 + request_id', () => {
    const raw = {
      version: '1',
      request_id: 'req_abc123',
      type: 'assistant_delta',
      content: 'hello',
    }
    const evt = parseSSEEvent(raw)
    expect(evt).not.toBeNull()
    expect(evt!.type).toBe('assistant_delta')
    expect(evt!.request_id).toBe('req_abc123')
  })

  it('parses tool_result with required fields', () => {
    const raw = {
      version: '1',
      request_id: 'req_x',
      type: 'tool_result',
      id: 'call_1',
      name: 'check_duplicates',
      success: true,
      result: { duplicate_detection: { matches: [], analysis: { has_duplicates: false, confidence: 1, recommendation: 'create_new' } } },
      finishedAt: new Date().toISOString(),
    }
    const evt = parseSSEEvent(raw)
    expect(evt).not.toBeNull()
    expect(evt!.type).toBe('tool_result')
    // @ts-expect-error narrow type for test
    expect(evt!.name).toBe('check_duplicates')
  })

  it('rejects invalid shape', () => {
    const raw = { version: '1', type: 'assistant_delta' }
    const evt = parseSSEEvent(raw)
    expect(evt).toBeNull()
  })

  it('rejects non-v1 versions when provided', () => {
    const raw = { version: '2', type: 'assistant_done' }
    const evt = parseSSEEvent(raw)
    expect(evt).toBeNull()
  })
})

