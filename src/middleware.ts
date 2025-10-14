import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
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
      return NextResponse.redirect(new URL('/', req.url))
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
  matcher: [
    '/api/:path*',
    '/admin/:path*',
    '/super-admin/:path*',
    '/dashboard/:path*',
    '/profile/:path*',
    '/orders/:path*',
    '/users/:path*',
    '/auth/:path*',
  ],
}
