import { describe, it, expect } from 'vitest'
import { normalizeRunItemToSSEEvents } from '@/lib/admin/chat/normalize-agent-events'

describe('Agent event normalizer - tool events', () => {
  it('normalizes tool_called to tool_start', () => {
    const raw = { type: 'function_call', callId: 'call_1', name: 'check_duplicates', arguments: { title_zh: '佛说阿弥陀经' } }
    const events = normalizeRunItemToSSEEvents({ name: 'tool_called', raw })
    expect(events.length).toBe(1)
    expect(events[0]).toMatchObject({ type: 'tool_start', id: 'call_1', name: 'check_duplicates' })
    // startedAt exists and is ISO-ish
    expect(typeof (events[0] as any).startedAt).toBe('string')
  })

  it('normalizes tool_output to tool_result + tool_append, unwraps { data } envelope', () => {
    const raw = {
      type: 'function_call_result',
      callId: 'call_2',
      name: 'check_duplicates',
      output: { type: 'json', json: { success: true, data: { duplicate_detection: { matches: [], analysis: { recommendation: 'create_new' } } } } },
    }
    const events = normalizeRunItemToSSEEvents({ name: 'tool_output', raw })
    expect(events.length).toBe(2)
    const [r, a] = events
    expect(r).toMatchObject({ type: 'tool_result', id: 'call_2', name: 'check_duplicates', success: true })
    expect((r as any).result).toEqual({ duplicate_detection: { matches: [], analysis: { recommendation: 'create_new' } } })
    expect(a).toMatchObject({ type: 'tool_append', message: { role: 'tool', name: 'check_duplicates', tool_call_id: 'call_2' } })
    expect(typeof (a as any).message.content).toBe('string')
  })
})

