import { NextResponse } from 'next/server'
import { assertAdmin, UnauthorizedError } from '@/lib/security/guards'
import { getServerDb } from '@/lib/db/client'
import { ROLES, type Role } from '@/lib/db/enums'

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

    const db = await getServerDb()
    const { error } = await db.rpc('update_user_role', { uid: userId, new_role: role })
    if (error) {
      return NextResponse.json({ error: 'Failed to update role' }, { status: 500 })
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
