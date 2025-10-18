import { createRouteSupabaseClient } from '@/lib/supabase'
import { NextResponse } from 'next/server'
import { linkExpired, deriveUserRole, finalizePostLogin, computeRedirect } from '@/lib/auth'

export async function GET(request: Request) {
  try {
    const requestUrl = new URL(request.url)
    const code = requestUrl.searchParams.get('code')
    const returnTo = requestUrl.searchParams.get('returnTo') || undefined
    const tsParam = requestUrl.searchParams.get('ts')
    if (linkExpired(tsParam)) {
      // Treat as expired before attempting to exchange code for session
      return NextResponse.redirect(new URL('/auth/signin?error=LinkExpired', request.url))
    }

    if (!code) {
      throw new Error('No code provided')
    }

    const supabase = await createRouteSupabaseClient()
    // Exchange using the code parameter (works with SSR PKCE storage)
    const { data: { user }, error: authError } = await supabase.auth.exchangeCodeForSession(code)
    if (authError || !user?.id || !user?.email) {
      throw new Error(authError?.message || 'Authentication failed')
    }
    const userRole = deriveUserRole(user.email)
    await finalizePostLogin(supabase, user, userRole)

    // Compute a safe post-login redirect
    const dest = computeRedirect(returnTo || undefined, requestUrl.origin)
    return NextResponse.redirect(dest)
  } catch (error) {
    console.error('Auth error:', error)
    return NextResponse.redirect(
      new URL('/auth/signin?error=AuthError', request.url)
    )
  }
}
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const revalidate = 0
