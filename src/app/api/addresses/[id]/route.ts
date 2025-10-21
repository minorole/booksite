import { NextResponse } from 'next/server'
import { assertUser, UnauthorizedError } from '@/lib/security/guards'
import { createRouteSupabaseClient } from '@/lib/supabase'

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await assertUser()
    const { id } = await context.params
    const db = await createRouteSupabaseClient()
    const body = await request.json().catch(() => ({}))
    const action = body?.action as string | undefined

    if (action === 'set_default') {
      // Clear existing default then set this one
      await db.from('shipping_addresses').update({ is_default: false }).eq('user_id', user.id).eq('is_default', true)
      const { error } = await db
        .from('shipping_addresses')
        .update({ is_default: true })
        .eq('id', id)
        .eq('user_id', user.id)
      if (error) throw error
      return NextResponse.json({ ok: true })
    }

    // Optional: treat edits as new version (insert new row) - not implemented here
    return NextResponse.json({ error: 'Unsupported action' }, { status: 400 })
  } catch (e) {
    if (e instanceof UnauthorizedError) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    console.error('addresses [id] PUT error', e)
    return NextResponse.json({ error: 'Failed to update address' }, { status: 500 })
  }
}

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const revalidate = 0

