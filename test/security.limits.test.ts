import { describe, it, expect } from 'vitest'
import { getPolicy } from '@/lib/security/limits'

describe('rate limit policies', () => {
  it('has a specific policy for orchestrated SSE route', () => {
    const p = getPolicy('/api/admin/ai-chat/stream/orchestrated')
    expect(p.window).toBe(60)
    expect(p.limit).toBe(10)
    expect(p.weight).toBe(2)
    expect(p.concurrency).toBe(2)
  })
})

