import { NextResponse } from 'next/server'
import { assertUser, UnauthorizedError } from '@/lib/security/guards'
import { createRouteSupabaseClient } from '@/lib/supabase'

export async function GET() {
  try {
    const user = await assertUser()
    const db = await createRouteSupabaseClient()
    const { data, error } = await db
      .from('shipping_addresses')
      .select('id, recipient_name, phone, address1, address2, city, state, zip, country, is_default, is_valid, validation_log, created_at')
      .eq('user_id', user.id)
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: false })
    if (error) throw error
    return NextResponse.json({ addresses: data ?? [] })
  } catch (e) {
    if (e instanceof UnauthorizedError) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    console.error('addresses GET error', e)
    return NextResponse.json({ error: 'Failed to fetch addresses' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const user = await assertUser()
    const db = await createRouteSupabaseClient()
    const body = await request.json()
    const {
      recipient_name,
      phone,
      address1,
      address2,
      city,
      state,
      zip,
      country = 'US',
      is_default = false,
    } = body || {}

    if (!address1 || !city || !state || !zip) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Simple normalized hash for dedupe (lowercase + trim)
    const norm = (v: unknown) => typeof v === 'string' ? v.trim().toLowerCase() : ''
    const address_hash = [recipient_name, phone, address1, address2, city, state, zip, country].map(norm).join('|')

    // If setting default, clear previous default first (best-effort)
    if (is_default) {
      await db.from('shipping_addresses').update({ is_default: false }).eq('user_id', user.id).eq('is_default', true)
    }

    const { data, error } = await db
      .from('shipping_addresses')
      .insert({
        user_id: user.id,
        recipient_name: recipient_name ?? null,
        phone: phone ?? null,
        address1,
        address2: address2 ?? null,
        city,
        state,
        zip,
        country,
        is_default: Boolean(is_default),
        is_valid: false,
        address_hash,
      })
      .select('id')
      .single()
    if (error) throw error
    return NextResponse.json({ id: data?.id })
  } catch (e) {
    if (e instanceof UnauthorizedError) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    console.error('addresses POST error', e)
    return NextResponse.json({ error: 'Failed to save address' }, { status: 500 })
  }
}

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const revalidate = 0

