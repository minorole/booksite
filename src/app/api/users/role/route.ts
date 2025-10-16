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

  // Fetch roles to enforce SUPER_ADMIN protections
  const { data: allUsers, error: listErr } = await db.rpc('list_users')
  if (listErr) {
    return NextResponse.json({ error: 'Failed to validate roles' }, { status: 500 })
  }
  type UserRow = { id: string; role: Role }
  const arr = (allUsers ?? []) as UserRow[]
  const me = arr.find((u) => u.id === user.id)
  const target = arr.find((u) => u.id === userId)
    const myRole = (me?.role as Role | undefined) || 'USER'
    const targetRole = (target?.role as Role | undefined) || 'USER'

    // Only a SUPER_ADMIN can change a SUPER_ADMIN or assign SUPER_ADMIN
    const isRequesterSuper = myRole === 'SUPER_ADMIN'
    const touchingSuper = targetRole === 'SUPER_ADMIN' || role === 'SUPER_ADMIN'
    if (!isRequesterSuper && touchingSuper) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    // Prevent accidental self-demotion from SUPER_ADMIN
    if (isRequesterSuper && user.id === userId && role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Cannot demote your own SUPER_ADMIN role' }, { status: 400 })
    }

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
