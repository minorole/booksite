import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { env } from '@/lib/config/env'

export async function GET(request: Request) {
  try {
    const requestUrl = new URL(request.url)
    const code = requestUrl.searchParams.get('code')
    const returnTo = requestUrl.searchParams.get('returnTo') || undefined
    const tsParam = requestUrl.searchParams.get('ts')
    const ts = tsParam ? Number(tsParam) : undefined
    const now = Date.now()
    const fifteenMinutesMs = 15 * 60 * 1000
    if (ts && (isNaN(ts) || now - ts > fifteenMinutesMs)) {
      // Treat as expired before attempting to exchange code for session
      return NextResponse.redirect(new URL('/auth/signin?error=LinkExpired', request.url))
    }

    if (!code) {
      throw new Error('No code provided')
    }

    const supabase = createRouteHandlerClient({ cookies })
    
    const { data: { user }, error: authError } = await supabase.auth.exchangeCodeForSession(code)
    
    if (authError || !user?.id || !user?.email) {
      throw new Error(authError?.message || 'Authentication failed')
    }

    // Determine role based on configured super admin email (server-only)
    const isSuperAdmin = (() => {
      try {
        return user.email === env.superAdminEmail()
      } catch {
        return false
      }
    })()
    const userRole: 'USER' | 'ADMIN' | 'SUPER_ADMIN' = isSuperAdmin ? 'SUPER_ADMIN' : 'USER'

    // Mirror role in Supabase user metadata for client convenience
    await supabase.auth.updateUser({ data: { role: userRole } })

    // Upsert profile row (source of truth for role)
    // RLS policy allows insert/update when id = auth.uid()
    const { error: profileError } = await supabase
      .from('profiles')
      .upsert(
        {
          id: user.id,
          name: user.user_metadata?.name ?? null,
          role: userRole,
        },
        { onConflict: 'id' }
      )

    if (profileError) {
      // Do not block login on profile upsert issues; log and continue
      console.error('Profile upsert error:', profileError)
    }

    // Compute a safe post-login redirect
    const isSafePath = (p: string | undefined) => !!p && p.startsWith('/') && !p.startsWith('//')
    const dest = isSafePath(returnTo) ? new URL(returnTo!, requestUrl.origin) : new URL('/', requestUrl.origin)
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
