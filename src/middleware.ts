import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

function detectFromAccept(acceptLanguage: string | null | undefined): 'en' | 'zh' {
  const header = (acceptLanguage || '').toLowerCase()
  if (/(^|,|\s)zh(-[a-z0-9-]+)?/.test(header)) return 'zh'
  return 'en'
}

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  const pathname = req.nextUrl.pathname

  // Locale prefix handling for public pages
  const isLocalePrefixed = /^\/(en|zh)(?:\/|$)/.test(pathname)
  const RESERVED_PREFIXES = ['/api', '/admin', '/super-admin', '/auth', '/dashboard', '/profile', '/orders', '/users', '/models', '/draco']
  const isReserved = RESERVED_PREFIXES.some((p) => pathname.startsWith(p))

  // If visiting a locale-prefixed route, align cookie and continue
  if (!isReserved && isLocalePrefixed) {
    const locale = (pathname.split('/')[1] === 'zh' ? 'zh' : 'en') as 'en' | 'zh'
    const cookieLocale = req.cookies.get('ui_locale')?.value
    if (cookieLocale !== locale) {
      res.cookies.set('ui_locale', locale, { path: '/' })
    }
    return res
  }

  // For non-reserved, non-prefixed pages, redirect to best locale
  if (!isReserved && !isLocalePrefixed) {
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

  // Auth gating for reserved routes remains as before
  const supabase = createMiddlewareClient({ req, res })
  const { data: { session } } = await supabase.auth.getSession()

  // Allow auth callback and magic-link routes
  if (req.nextUrl.pathname.startsWith('/api/auth/callback') ||
      req.nextUrl.pathname.startsWith('/api/auth/magic-link')) {
    return res
  }

  // Auth pages are public
  if (req.nextUrl.pathname.startsWith('/auth')) {
    if (session) {
      const best = (req.cookies.get('ui_locale')?.value === 'zh' ? 'zh' : detectFromAccept(req.headers.get('accept-language')))
      return NextResponse.redirect(new URL(`/${best}`, req.url))
    }
    return res
  }

  // Protected API routes
  if (req.nextUrl.pathname.startsWith('/api')) {
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    return res
  }

  // Admin routes
  if (req.nextUrl.pathname.startsWith('/admin')) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      const returnTo = `${req.nextUrl.pathname}${req.nextUrl.search}`
      return NextResponse.redirect(new URL(`/auth/signin?returnTo=${encodeURIComponent(returnTo)}`, req.url))
    }

    // Check DB-authored role via RPC
    const { data: isAdmin, error } = await supabase.rpc('is_admin')
    if (error || !isAdmin) {
      return NextResponse.redirect(new URL('/', req.url))
    }
  }

  // Super Admin routes
  if (req.nextUrl.pathname.startsWith('/super-admin')) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      const returnTo = `${req.nextUrl.pathname}${req.nextUrl.search}`
      return NextResponse.redirect(new URL(`/auth/signin?returnTo=${encodeURIComponent(returnTo)}`, req.url))
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

  // Protected pages
  const protectedPaths = ['/dashboard', '/profile', '/orders', '/users']
  if (protectedPaths.some(path => req.nextUrl.pathname.startsWith(path))) {
    if (!session) {
      const returnTo = `${req.nextUrl.pathname}${req.nextUrl.search}`
      return NextResponse.redirect(new URL(`/auth/signin?returnTo=${encodeURIComponent(returnTo)}`, req.url))
    }
  }

  return res
}

export const config = {
  // Run on all routes except Next internals and static asset files
  matcher: ['/((?!_next|.*\..*).*)'],
}
