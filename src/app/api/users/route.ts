import { NextResponse } from 'next/server'
import { assertAdmin, UnauthorizedError } from '@/lib/security/guards'
import { getServerDb } from '@/lib/db/client'

export async function GET() {
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

    const db = await getServerDb()
    const { data, error } = await db.rpc('list_users')
    if (error) {
      return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 })
    }

    type UserRow = { id: string; email: string; name: string | null; role: 'USER' | 'ADMIN' | 'SUPER_ADMIN'; created_at: string }
    const rows = (data ?? []) as UserRow[]
    const users = rows.map((u) => ({
      id: u.id,
      email: u.email,
      name: u.name ?? null,
      role: u.role,
      created_at: u.created_at,
    }))

    return NextResponse.json({ users })
  } catch (error) {
    console.error('❌ Failed to list users:', error)
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 })
  }
}
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const revalidate = 0
