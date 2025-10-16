import { notFound } from 'next/navigation'
import { SUPPORTED_LOCALES, type Locale } from '@/lib/i18n/config'

export class InvalidLocaleError extends Error {
  locale: string
  constructor(locale: unknown) {
    const value = String(locale)
    super(`Invalid locale: ${value}`)
    this.name = 'InvalidLocaleError'
    this.locale = value
  }
}

export function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && (SUPPORTED_LOCALES as readonly string[]).includes(value)
}

export function assertLocaleParam(value: unknown, opts?: { notFoundOnError?: boolean }): Locale {
  if (isLocale(value)) return value
  if (opts?.notFoundOnError) {
    notFound()
  }
  throw new InvalidLocaleError(value)
}
