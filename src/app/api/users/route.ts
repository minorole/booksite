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

    const users = (data ?? []).map((u: any) => ({
      id: u.id as string,
      email: u.email as string,
      name: (u.name as string) ?? null,
      role: u.role as 'USER' | 'ADMIN' | 'SUPER_ADMIN',
      created_at: u.created_at as string,
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
