export type RateLimitPolicy = {
  // Window in seconds
  window: number
  // Max requests allowed per window
  limit: number
  // Cost per request (for weighted endpoints)
  weight: number
  // Max concurrent operations per user/IP for the route
  concurrency: number
}

const DEFAULT_POLICY: RateLimitPolicy = {
  window: 60,
  limit: 60,
  weight: 1,
  concurrency: 4,
}

const ROUTE_POLICIES: Record<string, Partial<RateLimitPolicy>> = {
  '/api/admin/ai-chat/stream/orchestrated': {
    window: 60,
    limit: 10,
    weight: 2,
    concurrency: 2,
  },
  '/api/upload': {
    window: 60,
    limit: 10,
    weight: 3,
    concurrency: 1,
  },
  '/api/users/role': {
    window: 60,
    limit: 20,
    weight: 1,
    concurrency: 2,
  },
  '/api/auth/magic-link': {
    window: 60,
    limit: 5,
    weight: 1,
    concurrency: 1,
  },
}

export function getPolicy(route: string): RateLimitPolicy {
  const override = ROUTE_POLICIES[route] || {}
  return {
    ...DEFAULT_POLICY,
    ...override,
  }
}
