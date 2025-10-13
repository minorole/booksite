import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  try {
    const requestUrl = new URL(request.url)
    const code = requestUrl.searchParams.get('code')

    if (!code) {
      throw new Error('No code provided')
    }

    const supabase = createRouteHandlerClient({ cookies })
    
    const { data: { user }, error: authError } = await supabase.auth.exchangeCodeForSession(code)
    
    if (authError || !user?.id || !user?.email) {
      throw new Error(authError?.message || 'Authentication failed')
    }

    // Determine role based on configured super admin email
    const isSuperAdmin = user.email === process.env.NEXT_PUBLIC_SUPER_ADMIN_EMAIL
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

    return NextResponse.redirect(new URL('/', requestUrl.origin))
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
