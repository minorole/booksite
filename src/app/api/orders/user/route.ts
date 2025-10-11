import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthUser } from '@/lib/security/guards'

export async function GET() {
  try {
    const user = await getAuthUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const orders = await prisma.order.findMany({
      where: { user_id: user.id },
      include: {
        order_items: {
          include: {
            book: {
              select: { title_en: true, title_zh: true }
            }
          }
        },
        address: true,
      },
      orderBy: { created_at: 'desc' }
    })

    const mapped = orders.map(o => ({
      id: o.id,
      status: o.status,
      total_items: o.total_items,
      created_at: o.created_at.toISOString(),
      shipping_address: [
        o.address?.address1,
        o.address?.address2,
        [o.address?.city, o.address?.state].filter(Boolean).join(', '),
        [o.address?.zip, o.address?.country].filter(Boolean).join(' ')
      ].filter(Boolean).join('\n'),
      order_items: o.order_items.map(oi => ({
        book: {
          title_en: oi.book.title_en || '',
          title_zh: oi.book.title_zh || ''
        },
        quantity: oi.quantity
      }))
    }))

    return NextResponse.json({ orders: mapped })
  } catch (error) {
    console.error('❌ Failed to fetch user orders:', error)
    return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 })
  }
}

