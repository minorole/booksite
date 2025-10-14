"use client"

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'

export type Locale = 'en' | 'zh'

type LocaleContextType = {
  locale: Locale
  setLocale: (next: Locale) => void
}

const LocaleContext = createContext<LocaleContextType | null>(null)

function readCookieLocale(defaultLocale: Locale = 'en'): Locale {
  if (typeof document === 'undefined') return defaultLocale
  const match = document.cookie.match(/(?:^|; )ui_locale=([^;]+)/)
  const v = match ? decodeURIComponent(match[1]) : undefined
  return v === 'zh' ? 'zh' : 'en'
}

function writeCookieLocale(locale: Locale) {
  try {
    const maxAge = 60 * 60 * 24 * 365 // 1 year
    document.cookie = `ui_locale=${encodeURIComponent(locale)}; Path=/; Max-Age=${maxAge}; SameSite=Lax`
  } catch {}
}

export function LocaleProvider({ initialLocale = 'en', children }: { initialLocale?: Locale; children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale)

  // In case SSR cookie differs from client cookie (first load), reconcile on mount
  useEffect(() => {
    const client = readCookieLocale(initialLocale)
    if (client !== locale) setLocaleState(client)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next)
    writeCookieLocale(next)
  }, [])

  const value = useMemo(() => ({ locale, setLocale }), [locale, setLocale])

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
}

export function useLocale(): LocaleContextType {
  const ctx = useContext(LocaleContext)
  if (!ctx) throw new Error('useLocale must be used within a LocaleProvider')
  return ctx
}

