import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/security/guards';
import { getUserOrders } from '@/lib/db/orders';

export async function GET() {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const orders = await getUserOrders(user.id);
    return NextResponse.json({ orders });
  } catch (error) {
    console.error('❌ Failed to fetch user orders:', error);
    return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 });
  }
}
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const revalidate = 0;
