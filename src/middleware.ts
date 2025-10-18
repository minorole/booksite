import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import type { Session } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase.generated'
import { detectLocaleFromHeader, COOKIE_NAME, SUPPORTED_LOCALES, type Locale } from '@/lib/i18n/config'
import { stripLocalePrefix as stripLocalePrefixDynamic, resolveBest as resolveBestLocale } from '@/lib/i18n/middleware-helpers'
import { env } from '@/lib/config/env'

export async function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname
  const { locale, path: normalizedPath } = stripLocalePrefixDynamic(pathname, SUPPORTED_LOCALES)
  // Compute best locale for this request (used for SSR hints and fallbacks)
  const best: Locale = (locale as Locale) || resolveBestLocale({
    cookie: req.cookies.get(COOKIE_NAME)?.value,
    acceptLanguage: req.headers.get('accept-language'),
    supported: SUPPORTED_LOCALES,
    detect: detectLocaleFromHeader,
  })

  // Prepare a NextResponse with a request header to hint SSR about locale
  const reqHeaders = new Headers(req.headers)
  if (best) reqHeaders.set('x-ui-locale', best)
  const res = NextResponse.next({ request: { headers: reqHeaders } })

  // Align cookie if locale is present in the URL
  if (locale) {
    const cookieLocale = req.cookies.get(COOKIE_NAME)?.value
    if (cookieLocale !== locale) {
      res.cookies.set(COOKIE_NAME, locale, { path: '/' })
    }
  }

  // Redirect all non-API, non-prefixed paths to best-locale prefixed
  if (!locale && !normalizedPath.startsWith('/api')) {
    const url = req.nextUrl.clone()
    url.pathname = `/${best}${pathname}`
    const redirect = NextResponse.redirect(url)
    redirect.cookies.set(COOKIE_NAME, best, { path: '/' })
    return redirect
  }

  // Canonicalize locale-prefixed API paths to locale-agnostic /api
  if (locale && normalizedPath.startsWith('/api')) {
    const url = req.nextUrl.clone()
    url.pathname = normalizedPath // drop the locale prefix
    const redirect = NextResponse.redirect(url)
    redirect.cookies.set(COOKIE_NAME, (locale as Locale), { path: '/' })
    return redirect
  }

  // Auth gating and role checks (on normalized path)
  const getSupabase = () => createServerClient<Database>(
    env.supabaseUrl(),
    env.supabaseAnonKey(),
    {
      cookieOptions: {
        path: '/',
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
      },
      cookies: {
        getAll() {
          return req.cookies.getAll().map(c => ({ name: c.name, value: c.value }))
        },
        setAll(setCookies: Array<{ name: string; value: string; options?: Record<string, unknown> }>) {
          for (const { name, value, options } of setCookies) {
            res.cookies.set({ name, value, ...(options as Record<string, unknown> | undefined) })
          }
        },
      },
    }
  )
  let session: Session | null = null

  // Allow auth callback and magic-link routes
  if (normalizedPath.startsWith('/api/auth/callback') ||
      normalizedPath.startsWith('/api/auth/magic-link')) {
    return res
  }

  // Auth pages are public; if already signed in, send to localized home
  if (normalizedPath.startsWith('/auth')) {
    const supabase = getSupabase()
    const { data: s } = await supabase.auth.getSession()
    session = s.session
    if (session) return NextResponse.redirect(new URL(`/${best}`, req.url))
    return res
  }

  // Protected API routes
  if (normalizedPath.startsWith('/api')) {
    if (!session) {
      const supabase = getSupabase()
      const { data: s } = await supabase.auth.getSession()
      session = s.session
    }
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
    const supabase = getSupabase()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      const returnTo = `${req.nextUrl.pathname}${req.nextUrl.search}`
      const redirect = NextResponse.redirect(new URL(`/${best}/auth/signin?returnTo=${encodeURIComponent(returnTo)}`, req.url))
      redirect.cookies.set(COOKIE_NAME, best, { path: '/' })
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
    const supabase = getSupabase()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      const returnTo = `${req.nextUrl.pathname}${req.nextUrl.search}`
      const redirect = NextResponse.redirect(new URL(`/${best}/auth/signin?returnTo=${encodeURIComponent(returnTo)}`, req.url))
      redirect.cookies.set(COOKIE_NAME, best, { path: '/' })
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
      const supabase = getSupabase()
      const { data: s } = await supabase.auth.getSession()
      session = s.session
    }
    if (!session) {
      const returnTo = `${req.nextUrl.pathname}${req.nextUrl.search}`
      const redirect = NextResponse.redirect(new URL(`/${best}/auth/signin?returnTo=${encodeURIComponent(returnTo)}`, req.url))
      redirect.cookies.set(COOKIE_NAME, best, { path: '/' })
      return redirect
    }
  }

  return res
}

export const config = {
  // Run on all routes except Next internals and static asset files
  matcher: ['/((?!_next|.*\..*).*)'],
}
