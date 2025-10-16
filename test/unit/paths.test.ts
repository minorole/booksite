import { describe, it, expect } from 'vitest'
import { replaceLeadingLocale } from '@/lib/i18n/paths'

describe('replaceLeadingLocale', () => {
  it('replaces existing en with zh', () => {
    expect(replaceLeadingLocale('/en/foo', 'zh')).toBe('/zh/foo')
    expect(replaceLeadingLocale('/en', 'zh')).toBe('/zh')
    expect(replaceLeadingLocale('/en/', 'zh')).toBe('/zh/')
  })

  it('replaces existing zh with en', () => {
    expect(replaceLeadingLocale('/zh', 'en')).toBe('/en')
    expect(replaceLeadingLocale('/zh/', 'en')).toBe('/en/')
    expect(replaceLeadingLocale('/zh/admin/ai-chat', 'en')).toBe('/en/admin/ai-chat')
  })

  it('prefixes when no locale segment is present', () => {
    expect(replaceLeadingLocale('/auth/signin', 'zh')).toBe('/zh/auth/signin')
    expect(replaceLeadingLocale('/users/orders', 'en')).toBe('/en/users/orders')
  })

  it('handles pathnames without leading slash defensively', () => {
    expect(replaceLeadingLocale('auth/signin', 'zh')).toBe('/zh/auth/signin')
  })

  it('ignores query strings (expects pathname input)', () => {
    expect(replaceLeadingLocale('/en/foo?x=1', 'zh')).toBe('/zh/foo')
  })

  it('preserves trailing slashes', () => {
    expect(replaceLeadingLocale('/en/foo/', 'zh')).toBe('/zh/foo/')
    expect(replaceLeadingLocale('/zh/', 'en')).toBe('/en/')
  })

  it('handles root and empty path', () => {
    expect(replaceLeadingLocale('/', 'zh')).toBe('/zh/')
    expect(replaceLeadingLocale('', 'en')).toBe('/en/')
  })

  it('keeps double slashes in middle segments (non-normalizing)', () => {
    expect(replaceLeadingLocale('/en//foo', 'zh')).toBe('/zh//foo')
  })
})
