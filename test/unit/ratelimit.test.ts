import { describe, it, expect, vi } from 'vitest'
import { checkRateLimit } from '@/lib/security/ratelimit'

// Mock Vercel KV with an in-memory store for deterministic tests
vi.mock('@vercel/kv', () => {
  const store = new Map<string, { value: number; expiresAt?: number }>()
  const now = () => Date.now()
  return {
    kv: {
      async incr(key: string): Promise<number> {
        const rec = store.get(key)
        const expired = rec?.expiresAt && rec.expiresAt <= now()
        if (!rec || expired) {
          const next = { value: 1, expiresAt: rec?.expiresAt }
          store.set(key, next)
          return next.value
        }
        rec.value += 1
        return rec.value
      },
      async expire(key: string, seconds: number): Promise<void> {
        const rec = store.get(key) || { value: 0 }
        rec.expiresAt = now() + seconds * 1000
        store.set(key, rec)
      },
      async ttl(key: string): Promise<number> {
        const rec = store.get(key)
        if (!rec?.expiresAt) return -1
        const ms = rec.expiresAt - now()
        return ms > 0 ? Math.ceil(ms / 1000) : -2
      },
      async decr(key: string): Promise<number> {
        const rec = store.get(key) || { value: 0 }
        rec.value -= 1
        store.set(key, rec)
        return rec.value
      },
      async del(key: string): Promise<void> {
        store.delete(key)
      },
    },
  }
})

describe('rateLimit (vercel kv)', () => {
  it('allows first request and reports enabled', async () => {
    const res = await checkRateLimit({ route: '/test/ratelimit', ip: '127.0.0.1' })
    expect(res.enabled).toBe(true)
    expect(res.allowed).toBe(true)
    expect(res.limit).toBeGreaterThan(0)
    expect(res.remaining).toBeGreaterThanOrEqual(0)
  })
})
