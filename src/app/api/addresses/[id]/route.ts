import { NextResponse } from 'next/server';
import { assertUser, UnauthorizedError } from '@/lib/security/guards';
import { createRouteSupabaseClient } from '@/lib/supabase';

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await assertUser();
    const { id } = await context.params;
    const db = await createRouteSupabaseClient();
    const body = await request.json().catch(() => ({}));
    const { recipient_name, phone, address1, address2, city, state, zip, country } = body || {};

    // Only allow updating the user's active address
    const { data: current, error: curErr } = await db
      .from('shipping_addresses')
      .select('id')
      .eq('id', id)
      .eq('user_id', user.id)
      .eq('is_archived', false)
      .maybeSingle();
    if (curErr) throw curErr;
    if (!current) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const update: Record<string, unknown> = {};
    if (recipient_name !== undefined) update.recipient_name = recipient_name;
    if (phone !== undefined) update.phone = phone;
    if (address1 !== undefined) update.address1 = address1;
    if (address2 !== undefined) update.address2 = address2;
    if (city !== undefined) update.city = city;
    if (state !== undefined) update.state = state;
    if (zip !== undefined) update.zip = zip;
    if (country !== undefined) update.country = country;

    const { error } = await db
      .from('shipping_addresses')
      .update(update)
      .eq('id', id)
      .eq('user_id', user.id)
      .eq('is_archived', false);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof UnauthorizedError)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    console.error('addresses [id] PUT error', e);
    return NextResponse.json({ error: 'Failed to update address' }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const revalidate = 0;
