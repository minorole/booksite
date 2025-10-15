"use client"

import { useCallback } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useLocale } from '@/contexts/LocaleContext'
import { Switch } from '@/components/ui/switch'
import { cn } from '@/lib/utils'
import { HOVER_LIFT_SHADOW } from '@/lib/ui'

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
    <Switch name="ui-language" size="small">
      <div
        onClick={() => switchTo('zh')}
        className={cn(HOVER_LIFT_SHADOW, 'rounded-md px-1 py-0.5')}
      >
        <Switch.Control label="中文" value="zh" defaultChecked={locale === 'zh'} />
      </div>
      <div
        onClick={() => switchTo('en')}
        className={cn(HOVER_LIFT_SHADOW, 'rounded-md px-1 py-0.5')}
      >
        <Switch.Control label="English" value="en" defaultChecked={locale === 'en'} />
      </div>
    </Switch>
  )
}

export default LanguageSwitch
