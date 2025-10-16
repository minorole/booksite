import type { Locale } from '@/lib/i18n/config'

export function makeLocalePrefixRegex(supported: readonly string[]): RegExp {
  const escaped = supported.map((s) => s.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&'))
  return new RegExp(`^/(${escaped.join('|')})(?:/|$)`) // match full segment only
}

export function stripLocalePrefix(pathname: string, supported: readonly string[]): { locale: string | null; path: string } {
  const re = makeLocalePrefixRegex(supported)
  const m = pathname.match(re)
  if (!m) return { locale: null, path: pathname }
  const rest = pathname.slice(m[0].length)
  const path = rest ? (rest.startsWith('/') ? rest : '/' + rest) : '/'
  return { locale: m[1], path }
}

export function resolveBest({ cookie, acceptLanguage, supported, detect }: { cookie?: string | null; acceptLanguage?: string | null; supported: readonly string[]; detect: (hdr: string | null | undefined) => Locale }): Locale {
  const c = (cookie || '').toLowerCase()
  if (supported.includes(c)) return c as Locale
  return detect(acceptLanguage)
}
