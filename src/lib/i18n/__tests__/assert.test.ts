import { describe, it, expect, vi } from 'vitest'

// Mock next/navigation notFound to throw a recognizable error
vi.mock('next/navigation', () => ({
  notFound: () => {
    const err: any = new Error('NEXT_NOT_FOUND')
    err.digest = 'NEXT_NOT_FOUND'
    throw err
  },
}))

import { isLocale, assertLocaleParam, InvalidLocaleError } from '@/lib/i18n/assert'

describe('i18n assert helpers', () => {
  it('isLocale guards for supported values', () => {
    expect(isLocale('en')).toBe(true)
    expect(isLocale('zh')).toBe(true)
    expect(isLocale('EN')).toBe(false)
    expect(isLocale('zh-cn')).toBe(false)
    expect(isLocale(undefined)).toBe(false)
  })

  it('assertLocaleParam returns typed value for valid inputs', () => {
    const en = assertLocaleParam('en')
    const zh = assertLocaleParam('zh')
    // type-level: ensure the values are inferred as the union; at runtime, check equality
    expect(en).toBe('en')
    expect(zh).toBe('zh')
  })

  it('assertLocaleParam throws InvalidLocaleError for invalid value', () => {
    expect(() => assertLocaleParam('xx')).toThrow(InvalidLocaleError)
  })

  it('assertLocaleParam notFoundOnError triggers NEXT_NOT_FOUND', () => {
    try {
      assertLocaleParam('xx', { notFoundOnError: true })
      throw new Error('expected notFound to throw')
    } catch (e: any) {
      expect(e?.digest || e?.message).toBe('NEXT_NOT_FOUND')
    }
  })
})

