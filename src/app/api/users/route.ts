import { NextResponse } from 'next/server'
import { assertAdmin, UnauthorizedError } from '@/lib/security/guards'
import { createRouteSupabaseClient } from '@/lib/supabase'

export async function GET(request: Request) {
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
    if (process.env.NODE_ENV !== 'production') {
      try { console.log('[users api] admin', { id: (user as any)?.id, email: (user as any)?.email }) } catch {}
    }

    const url = new URL(request.url)
    const q = url.searchParams.get('q') || null
    const hideSuper = url.searchParams.get('hide_super_admin') === 'true'
    const limitParam = Number(url.searchParams.get('limit'))
    const offsetParam = Number(url.searchParams.get('offset'))
    const limit = Number.isFinite(limitParam) ? Math.max(1, Math.min(limitParam, 200)) : 200
    const offset = Number.isFinite(offsetParam) ? Math.max(0, offsetParam) : 0

    const db = await createRouteSupabaseClient()
    // Prefer new paginated RPC; fall back to legacy list_users if unavailable
    let users: Array<{ id: string; email: string; name: string | null; role: 'USER' | 'ADMIN' | 'SUPER_ADMIN'; created_at: string }>
    let total: number | undefined
    try {
      if (process.env.NODE_ENV !== 'production') {
        try { console.log('[users api] rpc list_users_paginated', { q, limit, offset }) } catch {}
      }
      const { data, error } = await db.rpc('list_users_paginated', { q: q ?? undefined, page_limit: limit, page_offset: offset })
      if (error) throw error
      const rows = (data ?? [])
      users = rows.map((u) => ({
        id: u.id,
        email: u.email,
        name: u.name ?? null,
        role: (u.role as 'USER' | 'ADMIN' | 'SUPER_ADMIN') ?? 'USER',
        created_at: u.created_at,
      }))
      if (hideSuper) {
        // When client asks to hide SUPER_ADMINs, filter the current page and omit total to avoid drift.
        users = users.filter(u => u.role !== 'SUPER_ADMIN')
        total = undefined
      } else {
        const tc = rows.length > 0 ? rows[0].total_count : undefined
        total = typeof tc === 'number' ? tc : (typeof tc === 'string' ? Number(tc) : undefined)
      }
    } catch (err) {
      if (process.env.NODE_ENV !== 'production') {
        try { console.error('[users api] list_users_paginated error', err) } catch {}
      }
      const { data, error } = await db.rpc('list_users')
      if (error) {
        if (process.env.NODE_ENV !== 'production') {
          try { console.error('[users api] list_users error', error) } catch {}
        }
        return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 })
      }
      type UserRow = { id: string; email: string; name: string | null; role: 'USER' | 'ADMIN' | 'SUPER_ADMIN'; created_at: string }
      const rows = (data ?? []) as UserRow[]
      let mapped = rows.map((u) => ({
        id: u.id,
        email: u.email,
        name: u.name ?? null,
        role: u.role ?? 'USER',
        created_at: u.created_at,
      }))
      // Apply sorting and in-memory filter as fallback
      mapped.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      if (hideSuper) mapped = mapped.filter(u => u.role !== 'SUPER_ADMIN')
      if (q) {
        const needle = q.toLowerCase()
        users = mapped.filter(u => u.email.toLowerCase().includes(needle) || (u.name ?? '').toLowerCase().includes(needle))
      } else {
        users = mapped
      }
      total = users.length
      users = users.slice(offset, offset + limit)
    }

    return NextResponse.json({ users, total })
  } catch (error) {
    console.error('❌ Failed to list users:', error)
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 })
  }
}
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const revalidate = 0
