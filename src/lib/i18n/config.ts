export type Locale = 'en' | 'zh'

export const SUPPORTED_LOCALES: Locale[] = ['en', 'zh']
export const COOKIE_NAME = 'ui_locale'

export function normalizeLocale(input: string | null | undefined): Locale | null {
  if (!input) return null
  const v = input.toLowerCase()
  if (v === 'zh' || v.startsWith('zh')) return 'zh'
  if (v === 'en' || v.startsWith('en')) return 'en'
  return null
}

export function detectLocaleFromHeader(acceptLanguage: string | null | undefined): Locale {
  const header = (acceptLanguage || '').toLowerCase()
  // quick check for any zh variant
  if (/(^|,|\s)zh(-[a-z0-9-]+)?/.test(header)) return 'zh'
  return 'en'
}

