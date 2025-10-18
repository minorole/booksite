import { describe, it, expect } from 'vitest'
import { normalizeAgentUpdatedToSSEEvents } from '@/lib/admin/chat/normalize-agent-events'

describe('Agent event normalizer - handoff', () => {
  it('normalizes agent_updated_stream_event to handoff', () => {
    const events = normalizeAgentUpdatedToSSEEvents({ agent: { name: 'Vision' } })
    expect(events).toEqual([{ type: 'handoff', to: 'Vision' }])
  })

  it('handles missing name gracefully', () => {
    const events = normalizeAgentUpdatedToSSEEvents({ agent: {} })
    expect(events).toEqual([{ type: 'handoff', to: undefined }])
  })
})

