import { describe, it, expect } from 'vitest'
import { isAdmin, isSuperAdmin } from '@/lib/security/guards'

const makeUser = (role: string) => ({
  id: 'u1',
  email: 't@example.com',
  user_metadata: { role },
} as any)

describe('guards (role checks)', () => {
  it('identifies super admin', () => {
    expect(isSuperAdmin(makeUser('SUPER_ADMIN'))).toBe(true)
    expect(isSuperAdmin(makeUser('ADMIN'))).toBe(false)
    expect(isSuperAdmin(makeUser('USER'))).toBe(false)
  })

  it('identifies admin (incl super admin)', () => {
    expect(isAdmin(makeUser('SUPER_ADMIN'))).toBe(true)
    expect(isAdmin(makeUser('ADMIN'))).toBe(true)
    expect(isAdmin(makeUser('USER'))).toBe(false)
  })
})

