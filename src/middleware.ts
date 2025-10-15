import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import type { Database } from '@/types/supabase.generated'

function detectFromAccept(acceptLanguage: string | null | undefined): 'en' | 'zh' {
  const header = (acceptLanguage || '').toLowerCase()
  if (/(^|,|\s)zh(-[a-z0-9-]+)?/.test(header)) return 'zh'
  return 'en'
}

function stripLocalePrefix(pathname: string): { locale: 'en' | 'zh' | null; path: string } {
  const m = pathname.match(/^\/(en|zh)(?:\/|$)/)
  if (!m) return { locale: null, path: pathname }
  const path = pathname.replace(/^\/(en|zh)/, '') || '/'
  return { locale: (m[1] === 'zh' ? 'zh' : 'en'), path }
}

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  const pathname = req.nextUrl.pathname
  const { locale, path: normalizedPath } = stripLocalePrefix(pathname)

  // Align cookie if locale is present in the URL
  if (locale) {
    const cookieLocale = req.cookies.get('ui_locale')?.value
    if (cookieLocale !== locale) {
      res.cookies.set('ui_locale', locale, { path: '/' })
    }
  }

  // Redirect all non-API, non-prefixed paths to best-locale prefixed
  if (!locale && !normalizedPath.startsWith('/api')) {
    let best = req.cookies.get('ui_locale')?.value as 'en' | 'zh' | undefined
    if (best !== 'en' && best !== 'zh') {
      best = detectFromAccept(req.headers.get('accept-language'))
    }
    const url = req.nextUrl.clone()
    url.pathname = `/${best}${pathname}`
    const redirect = NextResponse.redirect(url)
    redirect.cookies.set('ui_locale', best, { path: '/' })
    return redirect
  }

  // Auth gating and role checks (on normalized path)
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return req.cookies.get(name)?.value ?? ''
        },
        set(name: string, value: string, options?: any) {
          res.cookies.set(name, value, options)
        },
        remove(name: string, options?: any) {
          res.cookies.delete(name)
        },
      },
    }
  )
  const { data: { session } } = await supabase.auth.getSession()

  // Allow auth callback and magic-link routes
  if (normalizedPath.startsWith('/api/auth/callback') ||
      normalizedPath.startsWith('/api/auth/magic-link')) {
    return res
  }

  // Auth pages are public; if already signed in, send to localized home
  if (normalizedPath.startsWith('/auth')) {
    if (session) {
      const best = (req.cookies.get('ui_locale')?.value === 'zh' ? 'zh' : detectFromAccept(req.headers.get('accept-language')))
      return NextResponse.redirect(new URL(`/${best}`, req.url))
    }
    return res
  }

  // Protected API routes
  if (normalizedPath.startsWith('/api')) {
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    return res
  }

  // Admin routes (locale-agnostic)
  if (normalizedPath.startsWith('/admin')) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      const returnTo = `${req.nextUrl.pathname}${req.nextUrl.search}`
      let best = req.cookies.get('ui_locale')?.value as 'en' | 'zh' | undefined
      if (best !== 'en' && best !== 'zh') best = detectFromAccept(req.headers.get('accept-language'))
      const redirect = NextResponse.redirect(new URL(`/${best}/auth/signin?returnTo=${encodeURIComponent(returnTo)}`, req.url))
      redirect.cookies.set('ui_locale', best, { path: '/' })
      return redirect
    }

    // Check DB-authored role via RPC
    const { data: isAdmin, error } = await supabase.rpc('is_admin')
    if (error || !isAdmin) {
      return NextResponse.redirect(new URL('/', req.url))
    }
  }

  // Super Admin routes (locale-agnostic)
  if (normalizedPath.startsWith('/super-admin')) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      const returnTo = `${req.nextUrl.pathname}${req.nextUrl.search}`
      let best = req.cookies.get('ui_locale')?.value as 'en' | 'zh' | undefined
      if (best !== 'en' && best !== 'zh') best = detectFromAccept(req.headers.get('accept-language'))
      const redirect = NextResponse.redirect(new URL(`/${best}/auth/signin?returnTo=${encodeURIComponent(returnTo)}`, req.url))
      redirect.cookies.set('ui_locale', best, { path: '/' })
      return redirect
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || profile.role !== 'SUPER_ADMIN') {
      return NextResponse.redirect(new URL('/', req.url))
    }
  }

  // Protected pages (locale-agnostic)
  const protectedPaths = ['/dashboard', '/profile', '/orders', '/users']
  if (protectedPaths.some(path => normalizedPath.startsWith(path))) {
    if (!session) {
      const returnTo = `${req.nextUrl.pathname}${req.nextUrl.search}`
      let best = req.cookies.get('ui_locale')?.value as 'en' | 'zh' | undefined
      if (best !== 'en' && best !== 'zh') best = detectFromAccept(req.headers.get('accept-language'))
      const redirect = NextResponse.redirect(new URL(`/${best}/auth/signin?returnTo=${encodeURIComponent(returnTo)}`, req.url))
      redirect.cookies.set('ui_locale', best, { path: '/' })
      return redirect
    }
  }

  return res
}

export const config = {
  // Run on all routes except Next internals and static asset files
  matcher: ['/((?!_next|.*\..*).*)'],
}
