import { kv as vercelKv } from '@vercel/kv';
import { getPolicy } from '@/lib/security/limits';

export type RateLimitCheckOptions = {
  route: string;
  userId?: string;
  ip?: string;
  weight?: number;
};

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  limit: number;
  reset: number;
  enabled: boolean;
};

type KVClient = {
  incr(key: string): Promise<number>;
  decr(key: string): Promise<number>;
  expire(key: string, seconds: number): Promise<number>;
  ttl(key: string): Promise<number>;
  del(key: string): Promise<number>;
};

function getKV(): KVClient {
  const useMemory = (process.env.KV_USE_MEMORY || '').toLowerCase();
  if (useMemory === '1' || useMemory === 'true') {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('KV_USE_MEMORY is not allowed in production');
    }
    const store = new Map<string, { value: number; expiresAt?: number }>();
    const now = () => Date.now();
    const isExpired = (key: string) => {
      const rec = store.get(key);
      if (!rec) return false;
      if (rec.expiresAt && rec.expiresAt <= now()) {
        store.delete(key);
        return true;
      }
      return false;
    };
    const mem: KVClient = {
      incr(key) {
        isExpired(key);
        const rec = store.get(key);
        if (!rec) {
          const next = { value: 1 };
          store.set(key, next);
          return Promise.resolve(next.value);
        }
        rec.value += 1;
        return Promise.resolve(rec.value);
      },
      decr(key) {
        isExpired(key);
        const rec = store.get(key);
        if (!rec) {
          const next = { value: -1 };
          store.set(key, next);
          return Promise.resolve(next.value);
        }
        rec.value -= 1;
        return Promise.resolve(rec.value);
      },
      expire(key, seconds) {
        const rec = store.get(key) || { value: 0 };
        rec.expiresAt = now() + seconds * 1000;
        store.set(key, rec);
        return Promise.resolve(1);
      },
      ttl(key) {
        isExpired(key);
        const rec = store.get(key);
        if (!rec?.expiresAt) return Promise.resolve(-1);
        const ms = rec.expiresAt - now();
        return Promise.resolve(ms > 0 ? Math.ceil(ms / 1000) : -2);
      },
      del(key) {
        store.delete(key);
        return Promise.resolve(1);
      },
    };
    return mem;
  }
  return vercelKv as KVClient;
}

export async function checkRateLimit(opts: RateLimitCheckOptions): Promise<RateLimitResult> {
  const kv = getKV();
  const policy = getPolicy(opts.route);
  const weight = Math.max(1, opts.weight ?? policy.weight);
  const owner = opts.userId || opts.ip || 'anon';

  const windowSec = policy.window;
  const bucket = Math.floor(Date.now() / 1000 / windowSec);
  const key = `rl:${opts.route}:${owner}:${bucket}`;

  // Increment counter by weight. Loop to avoid relying on incrby support.
  let count = 0;
  for (let i = 0; i < weight; i++) {
    count = await kv.incr(key);
  }
  // Set TTL on first use of this window
  if (count === weight) {
    await kv.expire(key, windowSec + 1);
  }

  const allowed = count <= policy.limit;
  const remaining = Math.max(0, policy.limit - count);
  let resetMs: number;
  try {
    const ttl = await kv.ttl(key);
    resetMs = ttl > 0 ? Date.now() + ttl * 1000 : (bucket + 1) * windowSec * 1000;
  } catch {
    resetMs = (bucket + 1) * windowSec * 1000;
  }

  return { allowed, remaining, limit: policy.limit, reset: resetMs, enabled: true };
}

export function rateLimitHeaders(result: RateLimitResult): Record<string, string> {
  return {
    'X-RateLimit-Limit': String(result.limit),
    'X-RateLimit-Remaining': String(result.remaining),
    'X-RateLimit-Reset': String(Math.floor(result.reset / 1000)),
  };
}

type ConcurrencyOpts = {
  route: string;
  userId?: string;
  ip?: string;
  ttlSeconds: number;
};

function semKey(route: string, owner: string) {
  return `sema:${owner}:${route}`;
}

export async function acquireConcurrency(
  opts: ConcurrencyOpts,
): Promise<{ acquired: boolean; enabled: boolean; current: number; limit: number }> {
  const kv = getKV();
  const owner = opts.userId || opts.ip || 'anon';
  const policy = getPolicy(opts.route);
  const key = semKey(opts.route, owner);

  const current = await kv.incr(key);
  if (current === 1) {
    await kv.expire(key, opts.ttlSeconds);
  }
  if (current > policy.concurrency) {
    await kv.decr(key);
    return { acquired: false, enabled: true, current: current - 1, limit: policy.concurrency };
  }
  return { acquired: true, enabled: true, current, limit: policy.concurrency };
}

export async function releaseConcurrency(opts: ConcurrencyOpts): Promise<void> {
  const kv = getKV();
  const owner = opts.userId || opts.ip || 'anon';
  const key = semKey(opts.route, owner);
  try {
    const left = await kv.decr(key);
    if (left <= 0) {
      await kv.del(key);
    }
  } catch {
    // no-op
  }
}
