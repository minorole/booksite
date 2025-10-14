import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { getEnv, getOptionalEnv, env } from '@/lib/config/env'

const ORIGINAL_ENV = { ...process.env }

describe('env getters', () => {
  beforeEach(() => {
    process.env = { ...ORIGINAL_ENV }
  })
  afterEach(() => {
    process.env = { ...ORIGINAL_ENV }
  })

  it('returns required vars via getEnv', () => {
    process.env.SUPER_ADMIN_EMAIL = 'admin@example.com'
    expect(getEnv('SUPER_ADMIN_EMAIL')).toBe('admin@example.com')
  })

  it('throws for missing required env', () => {
    delete process.env.OPENAI_API_KEY
    expect(() => getEnv('OPENAI_API_KEY')).toThrowError(/Missing required environment variable: OPENAI_API_KEY/)
  })

  it('returns undefined for missing optional env', () => {
    delete process.env.OPENAI_API_KEY_USER
    expect(getOptionalEnv('OPENAI_API_KEY_USER')).toBeUndefined()
  })

  it('exposes helpers that validate lazily', () => {
    process.env.SUPER_ADMIN_EMAIL = 'admin@example.com'
    expect(env.superAdminEmail()).toBe('admin@example.com')
  })
})
