import { NextResponse } from 'next/server';
import { assertUser, UnauthorizedError } from '@/lib/security/guards';
import { createRouteSupabaseClient } from '@/lib/supabase';

export async function GET() {
  try {
    const user = await assertUser();
    const db = await createRouteSupabaseClient();
    const { data, error } = await db
      .from('shipping_addresses')
      .select(
        'id, recipient_name, phone, address1, address2, city, state, zip, country, is_valid, validation_log, created_at',
      )
      .eq('user_id', user.id)
      .eq('is_archived', false)
      .maybeSingle();
    if (error) throw error;
    return NextResponse.json({ address: data ?? null });
  } catch (e) {
    if (e instanceof UnauthorizedError)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    console.error('addresses GET error', e);
    return NextResponse.json({ error: 'Failed to fetch address' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await assertUser();
    const db = await createRouteSupabaseClient();
    const body = await request.json();
    const {
      recipient_name,
      phone,
      address1,
      address2,
      city,
      state,
      zip,
      country = 'US',
    } = body || {};

    if (!address1 || !city || !state || !zip) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const norm = (v: unknown) => (typeof v === 'string' ? v.trim().toLowerCase() : '');
    const address_hash = [recipient_name, phone, address1, address2, city, state, zip, country]
      .map(norm)
      .join('|');

    // Upsert: update existing active address, else insert new active
    const { data: existing } = await db
      .from('shipping_addresses')
      .select('id')
      .eq('user_id', user.id)
      .eq('is_archived', false)
      .maybeSingle();

    if (existing?.id) {
      const { error: upErr } = await db
        .from('shipping_addresses')
        .update({
          recipient_name: recipient_name ?? null,
          phone: phone ?? null,
          address1,
          address2: address2 ?? null,
          city,
          state,
          zip,
          country,
          address_hash,
          is_archived: false,
        })
        .eq('id', existing.id)
        .eq('user_id', user.id)
        .eq('is_archived', false);
      if (upErr) throw upErr;
      return NextResponse.json({ id: existing.id });
    } else {
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
          is_valid: false,
          address_hash,
          is_archived: false,
          is_default: true,
        })
        .select('id')
        .single();
      if (error) throw error;
      return NextResponse.json({ id: data?.id });
    }
  } catch (e) {
    if (e instanceof UnauthorizedError)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    console.error('addresses POST error', e);
    return NextResponse.json({ error: 'Failed to save address' }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const revalidate = 0;
