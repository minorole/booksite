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
    process.env.DATABASE_URL = 'postgres://example'
    expect(getEnv('DATABASE_URL')).toBe('postgres://example')
  })

  it('throws for missing required env', () => {
    delete process.env.DIRECT_URL
    expect(() => getEnv('DIRECT_URL')).toThrowError(/Missing required environment variable: DIRECT_URL/)
  })

  it('returns undefined for missing optional env', () => {
    delete process.env.OPENAI_API_KEY_USER
    expect(getOptionalEnv('OPENAI_API_KEY_USER')).toBeUndefined()
  })

  it('exposes helpers that validate lazily', () => {
    process.env.NEXT_PUBLIC_SUPER_ADMIN_EMAIL = 'admin@example.com'
    expect(env.superAdminEmail()).toBe('admin@example.com')
  })
})

