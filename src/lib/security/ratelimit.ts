import { Redis } from '@upstash/redis'
import { Ratelimit } from '@upstash/ratelimit'
import { env } from '@/lib/config/env'
import { getPolicy, type RateLimitPolicy } from '@/lib/security/limits'

let redis: Redis | null = null
const limiters: Map<string, Ratelimit> = new Map()

function ensureRedis(): Redis | null {
  try {
    const url = env.upstashUrl()
    const token = env.upstashToken()
    if (!url || !token) {
      if (process.env.NODE_ENV === 'production') {
        throw new Error('Missing UPSTASH_REDIS_REST_URL or UPSTASH_REDIS_REST_TOKEN in production')
      }
      return null
    }
    if (!redis) redis = new Redis({ url, token })
    return redis
  } catch (e) {
    if (process.env.NODE_ENV === 'production') throw e as Error
    return null
  }
}

function ensureLimiter(policy: RateLimitPolicy, route: string): Ratelimit | null {
  const client = ensureRedis()
  if (!client) return null
  const key = `${route}:${policy.window}:${policy.limit}:${policy.weight}`
  let limiter = limiters.get(key)
  if (!limiter) {
    limiter = new Ratelimit({
      redis: client,
      limiter: Ratelimit.slidingWindow(policy.limit, `${policy.window} s`),
      analytics: false,
    })
    limiters.set(key, limiter)
  }
  return limiter
}

export type RateLimitCheckOptions = {
  route: string
  userId?: string
  ip?: string
  weight?: number
}

export type RateLimitResult = {
  allowed: boolean
  remaining: number
  limit: number
  reset: number
  enabled: boolean
}

export async function checkRateLimit(opts: RateLimitCheckOptions): Promise<RateLimitResult> {
  const policy = getPolicy(opts.route)
  const limiter = ensureLimiter(policy, opts.route)
  const weight = Math.max(1, opts.weight ?? policy.weight)
  const keyOwner = opts.userId || opts.ip || 'anon'
  const key = `${keyOwner}:${opts.route}`

  const now = Date.now()
  const resetMs = now + policy.window * 1000

  if (!limiter) {
    return { allowed: true, remaining: policy.limit, limit: policy.limit, reset: resetMs, enabled: false }
  }

  // Consume tokens; some versions of @upstash/ratelimit do not support 'cost'
  type LimitResponse = { success: boolean; remaining: number; limit: number; reset: number }
  let last: LimitResponse | null = null
  let allowed = true
  for (let i = 0; i < weight; i++) {
    const r = (await (limiter as unknown as { limit(k: string): Promise<LimitResponse> }).limit(key))
    last = r
    if (!r.success) {
      allowed = false
      break
    }
  }

  return {
    allowed,
    remaining: last ? last.remaining : 0,
    limit: last ? last.limit : policy.limit,
    reset: ((last ? last.reset : Math.ceil(resetMs / 1000)) as number) * 1000,
    enabled: true,
  }
}

export function rateLimitHeaders(result: RateLimitResult): Record<string, string> {
  return {
    'X-RateLimit-Limit': String(result.limit),
    'X-RateLimit-Remaining': String(result.remaining),
    'X-RateLimit-Reset': String(Math.floor(result.reset / 1000)),
  }
}

type ConcurrencyOpts = {
  route: string
  userId?: string
  ip?: string
  ttlSeconds: number
}

function semKey(route: string, owner: string) {
  return `sema:${owner}:${route}`
}

export async function acquireConcurrency(opts: ConcurrencyOpts): Promise<{ acquired: boolean, enabled: boolean, current: number, limit: number }> {
  const client = ensureRedis()
  const owner = opts.userId || opts.ip || 'anon'
  const policy = getPolicy(opts.route)
  if (!client) return { acquired: true, enabled: false, current: 0, limit: policy.concurrency }

  const key = semKey(opts.route, owner)
  const current = await client.incr(key)
  if (current === 1) {
    await client.expire(key, opts.ttlSeconds)
  }
  if (current > policy.concurrency) {
    // Roll back and deny
    await client.decr(key)
    return { acquired: false, enabled: true, current: current - 1, limit: policy.concurrency }
  }
  return { acquired: true, enabled: true, current, limit: policy.concurrency }
}

export async function releaseConcurrency(opts: ConcurrencyOpts): Promise<void> {
  const client = ensureRedis()
  const owner = opts.userId || opts.ip || 'anon'
  if (!client) return
  const key = semKey(opts.route, owner)
  try {
    const left = await client.decr(key)
    if (left <= 0) {
      await client.del(key)
    }
  } catch {
    // no-op
  }
}
