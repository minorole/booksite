"use client"

import { useCallback } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { useLocale } from '@/contexts/LocaleContext'

function replaceLeadingLocale(pathname: string, next: 'en' | 'zh'): string {
  const segs = pathname.split('?')[0].split('/')
  // ['', maybe-locale, ...]
  if (segs.length > 1 && (segs[1] === 'en' || segs[1] === 'zh')) {
    segs[1] = next
    return segs.join('/') || `/${next}`
  }
  // Non-localized path, just prefix
  return `/${next}${pathname.startsWith('/') ? '' : '/'}${pathname}`
}

export function LanguageSwitch() {
  const { locale, setLocale } = useLocale()
  const router = useRouter()
  const pathname = usePathname()

  const switchTo = useCallback((next: 'en' | 'zh') => {
    if (!pathname) return
    const target = replaceLeadingLocale(pathname, next)
    setLocale(next)
    router.push(target)
  }, [pathname, router, setLocale])

  return (
    <div className="inline-flex rounded-md border border-neutral-200 p-0.5 bg-white/70 backdrop-blur">
      <Button variant={locale === 'zh' ? 'default' : 'ghost'} size="sm" onClick={() => switchTo('zh')} className="px-2">
        中
      </Button>
      <Button variant={locale === 'en' ? 'default' : 'ghost'} size="sm" onClick={() => switchTo('en')} className="px-2">
        EN
      </Button>
    </div>
  )
}

export default LanguageSwitch

