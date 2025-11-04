'use client';

import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { Locale } from '@/lib/i18n/config';

type LocaleContextType = {
  locale: Locale;
  setLocale: (next: Locale) => void;
};

const LocaleContext = createContext<LocaleContextType | null>(null);

export function LocaleProvider({
  initialLocale = 'en',
  children,
}: {
  initialLocale?: Locale;
  children: React.ReactNode;
}) {
  const [locale, setLocale] = useState<Locale>(initialLocale);

  // Keep internal state in sync if the prop changes across navigations
  useEffect(() => {
    setLocale(initialLocale);
  }, [initialLocale]);

  // Keep document language in sync on client navigations
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.lang = locale;
    }
  }, [locale]);

  const value = useMemo(() => ({ locale, setLocale }), [locale]);

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale(): LocaleContextType {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error('useLocale must be used within a LocaleProvider');
  return ctx;
}
