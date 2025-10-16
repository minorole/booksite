import { describe, it, expect } from 'vitest'
import { replaceLeadingLocale } from '@/lib/i18n/paths'

describe('replaceLeadingLocale (extra cases)', () => {
  it('replaces existing en with zh', () => {
    expect(replaceLeadingLocale('/en', 'zh')).toBe('/zh')
    expect(replaceLeadingLocale('/en/books', 'zh')).toBe('/zh/books')
    expect(replaceLeadingLocale('/en/books/abc', 'zh')).toBe('/zh/books/abc')
  })

  it('replaces existing zh with en', () => {
    expect(replaceLeadingLocale('/zh', 'en')).toBe('/en')
    expect(replaceLeadingLocale('/zh/items', 'en')).toBe('/en/items')
  })

  it('prefixes non-localized path', () => {
    expect(replaceLeadingLocale('/', 'zh')).toBe('/zh/')
    expect(replaceLeadingLocale('/books', 'en')).toBe('/en/books')
    expect(replaceLeadingLocale('/other/path', 'zh')).toBe('/zh/other/path')
  })

  it('handles query strings correctly', () => {
    expect(replaceLeadingLocale('/en/books?x=1', 'zh')).toBe('/zh/books')
    expect(replaceLeadingLocale('/zh/items?a=b#hash', 'en')).toBe('/en/items')
  })

  it('is stable for already-correct locale', () => {
    expect(replaceLeadingLocale('/en/books', 'en')).toBe('/en/books')
    expect(replaceLeadingLocale('/zh', 'zh')).toBe('/zh')
  })
})
