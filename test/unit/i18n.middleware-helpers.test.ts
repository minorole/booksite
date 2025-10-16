import { describe, it, expect } from 'vitest'
import { stripLocalePrefix, makeLocalePrefixRegex, resolveBest } from '@/lib/i18n/middleware-helpers'
import { detectLocaleFromHeader } from '@/lib/i18n/config'

const supported = ['en', 'zh'] as const

describe('i18n middleware helpers', () => {
  it('makeLocalePrefixRegex builds correct pattern', () => {
    const re = makeLocalePrefixRegex(supported)
    expect('/en'.match(re)).toBeTruthy()
    expect('/en/'.match(re)).toBeTruthy()
    expect('/zh/foo'.match(re)).toBeTruthy()
    expect('/xx'.match(re)).toBeNull()
  })

  it('stripLocalePrefix extracts locale and normalized path', () => {
    expect(stripLocalePrefix('/en', supported)).toEqual({ locale: 'en', path: '/' })
    expect(stripLocalePrefix('/en/', supported)).toEqual({ locale: 'en', path: '/' })
    expect(stripLocalePrefix('/en/books', supported)).toEqual({ locale: 'en', path: '/books' })
    expect(stripLocalePrefix('/zh/admin/ai-chat', supported)).toEqual({ locale: 'zh', path: '/admin/ai-chat' })
    expect(stripLocalePrefix('/', supported)).toEqual({ locale: null, path: '/' })
    expect(stripLocalePrefix('/foo', supported)).toEqual({ locale: null, path: '/foo' })
    expect(stripLocalePrefix('/xx/auth/signin', supported)).toEqual({ locale: null, path: '/xx/auth/signin' })
  })

  it('resolveBest prefers valid cookie then accept-language', () => {
    expect(resolveBest({ cookie: 'zh', acceptLanguage: 'en-US,en;q=0.8', supported, detect: detectLocaleFromHeader })).toBe('zh')
    expect(resolveBest({ cookie: 'en', acceptLanguage: 'zh-CN,zh;q=0.9', supported, detect: detectLocaleFromHeader })).toBe('en')
    expect(resolveBest({ cookie: 'xx', acceptLanguage: 'zh-CN,zh;q=0.9', supported, detect: detectLocaleFromHeader })).toBe('zh')
    expect(resolveBest({ cookie: undefined, acceptLanguage: 'en-GB,en;q=0.9', supported, detect: detectLocaleFromHeader })).toBe('en')
  })
})

