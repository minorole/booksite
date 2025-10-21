import { NextResponse } from 'next/server'
import { assertAdmin, UnauthorizedError } from '@/lib/security/guards'
import { getUserOrders } from '@/lib/db/orders'

export async function GET(_req: Request, context: any) {
  try {
    try {
      await assertAdmin()
    } catch (e) {
      if (e instanceof UnauthorizedError) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
      throw e
    }

    const userId = context?.params?.userId as string | undefined
    if (!userId || typeof userId !== 'string') {
      return NextResponse.json({ error: 'Invalid userId' }, { status: 400 })
    }

    const orders = await getUserOrders(userId)
    return NextResponse.json({ orders })
  } catch (error) {
    console.error('❌ Failed to fetch user orders (admin):', error)
    return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 })
  }
}

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const revalidate = 0
