import { describe, it, expect } from 'vitest'
import { createAgentRegistry } from '@/lib/admin/agents'

describe('AgentKit router registry', () => {
  it('router is created with 3 handoffs', () => {
    const reg = createAgentRegistry()
    // @ts-expect-error - inspecting internal property
    const handoffs = reg.router.handoffs
    expect(Array.isArray(handoffs)).toBe(true)
    expect(handoffs.length).toBe(3)
  })
})

