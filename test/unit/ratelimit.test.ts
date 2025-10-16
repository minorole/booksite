import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { checkRateLimit } from '@/lib/security/ratelimit'

const ORIGINAL_ENV = { ...process.env }

describe('rateLimit (fallback behavior)', () => {
  beforeEach(() => { process.env = { ...ORIGINAL_ENV } })
  afterEach(() => { process.env = { ...ORIGINAL_ENV } })

  it('is disabled and allows when Upstash env is not set', async () => {
    delete process.env.UPSTASH_REDIS_REST_URL
    delete process.env.UPSTASH_REDIS_REST_TOKEN
    const res = await checkRateLimit({ route: '/test/ratelimit', ip: '127.0.0.1' })
    expect(res.enabled).toBe(false)
    expect(res.allowed).toBe(true)
  })
})
