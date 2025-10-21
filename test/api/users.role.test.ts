import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/security/guards', async () => {
  const UnauthorizedError = class extends Error { status = 401 }
  return {
    UnauthorizedError,
    assertAdmin: vi.fn(async () => ({ id: 'req-1', email: 'super@example.com' })),
  }
})

vi.mock('@/lib/security/ratelimit', () => ({
  checkRateLimit: vi.fn(async () => ({ allowed: true, enabled: true, remaining: 10, limit: 20, reset: Date.now() + 1000 })),
  rateLimitHeaders: () => ({}),
}))

vi.mock('@/lib/db/admin', () => ({
  logAdminAction: vi.fn(async () => {}),
}))

// Will be overridden per test
const dbFactory = (opts: { targetRole?: 'USER' | 'ADMIN' | 'SUPER_ADMIN'; rpcError?: string | null }) => ({
  from() {
    return {
      select() {
        return {
          eq() {
            return {
              async single<T>() {
                if (!opts.targetRole) return { data: null, error: { message: 'not found' } }
                return { data: { role: opts.targetRole } as unknown as T, error: null }
              },
            }
          },
        }
      },
    }
  },
  async rpc(name: string) {
    if (name === 'update_user_role_secure') {
      if (opts.rpcError) return { error: { message: opts.rpcError } }
      return { error: null }
    }
    throw new Error('unexpected rpc ' + name)
  },
})

describe('PUT /api/users/role', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('forbids non-super touching SUPER_ADMIN', async () => {
    vi.doMock('@/lib/db/client', () => ({ getServerDb: vi.fn(async () => dbFactory({ targetRole: 'SUPER_ADMIN', rpcError: 'forbidden_super' })) }))
    const mod = await import('@/app/api/users/role/route')
    const req = new Request('http://localhost/api/users/role', { method: 'PUT', body: JSON.stringify({ userId: 't1', role: 'ADMIN' }), headers: { 'Content-Type': 'application/json' } })
    const rsp = await mod.PUT(req)
    expect(rsp.status).toBe(403)
  })

  it('blocks self-demotion', async () => {
    vi.doMock('@/lib/db/client', () => ({ getServerDb: vi.fn(async () => dbFactory({ targetRole: 'SUPER_ADMIN', rpcError: 'self_demote_forbidden' })) }))
    const mod = await import('@/app/api/users/role/route')
    const req = new Request('http://localhost/api/users/role', { method: 'PUT', body: JSON.stringify({ userId: 'req-1', role: 'ADMIN' }), headers: { 'Content-Type': 'application/json' } })
    const rsp = await mod.PUT(req)
    expect(rsp.status).toBe(400)
  })

  it('blocks last SUPER_ADMIN demotion', async () => {
    vi.doMock('@/lib/db/client', () => ({ getServerDb: vi.fn(async () => dbFactory({ targetRole: 'SUPER_ADMIN', rpcError: 'last_super_forbidden' })) }))
    const mod = await import('@/app/api/users/role/route')
    const req = new Request('http://localhost/api/users/role', { method: 'PUT', body: JSON.stringify({ userId: 't2', role: 'ADMIN' }), headers: { 'Content-Type': 'application/json' } })
    const rsp = await mod.PUT(req)
    expect(rsp.status).toBe(400)
  })

  it('returns 404 when target not found', async () => {
    vi.doMock('@/lib/db/client', () => ({ getServerDb: vi.fn(async () => dbFactory({ targetRole: undefined, rpcError: null })) }))
    const mod = await import('@/app/api/users/role/route')
    const req = new Request('http://localhost/api/users/role', { method: 'PUT', body: JSON.stringify({ userId: 'missing', role: 'ADMIN' }), headers: { 'Content-Type': 'application/json' } })
    const rsp = await mod.PUT(req)
    expect(rsp.status).toBe(404)
  })

  it('updates role successfully', async () => {
    vi.doMock('@/lib/db/client', () => ({ getServerDb: vi.fn(async () => dbFactory({ targetRole: 'ADMIN', rpcError: null })) }))
    const mod = await import('@/app/api/users/role/route')
    const req = new Request('http://localhost/api/users/role', { method: 'PUT', body: JSON.stringify({ userId: 't3', role: 'USER' }), headers: { 'Content-Type': 'application/json' } })
    const rsp = await mod.PUT(req)
    expect(rsp.status).toBe(200)
    const body = await rsp.json()
    expect(body.ok).toBe(true)
  })
})

