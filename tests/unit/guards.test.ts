import { describe, it, expect } from 'vitest'
import { UnauthorizedError } from '@/lib/security/guards'
import { ROLES } from '@/lib/db/enums'

describe('guards (basics)', () => {
  it('UnauthorizedError has status and name', () => {
    const err = new UnauthorizedError('nope')
    expect(err).toBeInstanceOf(Error)
    expect(err.name).toBe('UnauthorizedError')
    expect(err.status).toBe(401)
    expect(err.message).toBe('nope')
  })

  it('roles include USER/ADMIN/SUPER_ADMIN', () => {
    expect(ROLES).toEqual(['USER', 'ADMIN', 'SUPER_ADMIN'])
  })
})
