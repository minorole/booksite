import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  const supabase = createMiddlewareClient({ req, res })
  const { data: { session } } = await supabase.auth.getSession()

  // Auth pages are public
  if (req.nextUrl.pathname.startsWith('/auth')) {
    // If user is already logged in and tries to access auth pages
    if (session) {
      return NextResponse.redirect(new URL('/', req.url))
    }
    return res
  }

  // API routes that don't require auth
  if (req.nextUrl.pathname.startsWith('/api/public')) {
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

  // Protected pages
  const protectedPaths = ['/dashboard', '/profile', '/orders']
  if (protectedPaths.some(path => req.nextUrl.pathname.startsWith(path))) {
    if (!session) {
      return NextResponse.redirect(new URL('/auth/signin', req.url))
    }
  }

  return res
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|public/).*)',
  ],
} 