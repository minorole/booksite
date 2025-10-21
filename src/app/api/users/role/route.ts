import { NextResponse } from 'next/server'
import { assertAdmin, UnauthorizedError } from '@/lib/security/guards'
import { createRouteSupabaseClient } from '@/lib/supabase'
import { ROLES, type Role } from '@/lib/db/enums'
import { checkRateLimit, rateLimitHeaders } from '@/lib/security/ratelimit'
import { logAdminAction } from '@/lib/db/admin'

export async function PUT(request: Request) {
  try {
    let user
    try {
      user = await assertAdmin()
    } catch (e) {
      if (e instanceof UnauthorizedError) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
      throw e
    }

    const body = await request.json()
    const userId = body?.userId as string | undefined
    const role = body?.role as Role | undefined

    if (!userId || !role || !ROLES.includes(role)) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
    }

    // Rate limit per admin (lightweight guardrail)
    const rl = await checkRateLimit({ route: '/api/users/role', userId: user.id })
    if (rl.enabled && !rl.allowed) {
      return NextResponse.json({ error: 'Too Many Requests' }, { status: 429, headers: rateLimitHeaders(rl) })
    }
    if (!rl.enabled && process.env.NODE_ENV === 'production') {
      return NextResponse.json({ error: 'Rate limiting unavailable' }, { status: 503 })
    }

    const db = await createRouteSupabaseClient()
    // Fetch target's current role for audit logging
    const { data: targetProfile, error: targetErr } = await db
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single<{ role: Role }>()
    if (targetErr || !targetProfile) {
      return NextResponse.json({ error: 'Target user not found' }, { status: 404 })
    }

    // Delegate all guardrails to SQL function
    const { error } = await db.rpc('update_user_role_secure', { uid: userId, new_role: role })
    if (error) {
      const msg = (error.message || '').toLowerCase()
      if (msg.includes('forbidden_super')) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
      if (msg.includes('self_demote_forbidden')) {
        return NextResponse.json({ error: 'Cannot demote your own SUPER_ADMIN role' }, { status: 400 })
      }
      if (msg.includes('last_super_forbidden')) {
        return NextResponse.json({ error: 'Cannot demote the last SUPER_ADMIN' }, { status: 400 })
      }
      if (msg.includes('forbidden')) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
      if (msg.includes('invalid role')) {
        return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
      }
      return NextResponse.json({ error: 'Failed to update role' }, { status: 500 })
    }

    // Admin audit log for role updates
    try {
      await logAdminAction({
        action: 'UPDATE_USER_ROLE',
        admin_email: user.email!,
        metadata: { target_user_id: userId, from_role: targetProfile.role, to_role: role },
      })
    } catch (e) {
      // Non-blocking
      console.warn('Admin log failed for UPDATE_USER_ROLE', e)
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('❌ Failed to update user role:', error)
    return NextResponse.json({ error: 'Failed to update user role' }, { status: 500 })
  }
}
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const revalidate = 0
