import { getServerDb } from '@/lib/db/client'

type OrderItemProjection = {
  book: {
    title_en: string
    title_zh: string
  }
  quantity: number
}

export type UserOrderProjection = {
  id: string
  status: string
  total_items: number
  created_at: string
  shipping_address: string
  order_items: OrderItemProjection[]
}

function formatAddress(addr: any | null | undefined): string {
  if (!addr) return ''
  const lines: string[] = []
  if (addr.address1) lines.push(addr.address1)
  if (addr.address2) lines.push(addr.address2)
  const cityState = [addr.city, addr.state].filter(Boolean).join(', ')
  if (cityState) lines.push(cityState)
  const zipCountry = [addr.zip, addr.country].filter(Boolean).join(' ')
  if (zipCountry) lines.push(zipCountry)
  return lines.filter(Boolean).join('\n')
}

export async function getUserOrders(userId: string): Promise<UserOrderProjection[]> {
  const db = await getServerDb()

  const sel = `
    id, status, total_items, created_at,
    shipping_addresses:shipping_addresses!orders_shipping_address_id_fkey (
      address1, address2, city, state, zip, country
    ),
    order_items (
      quantity,
      books:books!order_items_book_id_fkey ( title_en, title_zh )
    )
  `

  const { data, error } = await db
    .from('orders')
    .select(sel)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(`Failed to fetch user orders: ${error.message}`)
  }

  const orders = (data ?? []).map((o: any) => ({
    id: o.id as string,
    status: o.status as string,
    total_items: o.total_items as number,
    created_at: o.created_at as string,
    shipping_address: formatAddress(o.shipping_addresses),
    order_items: Array.isArray(o.order_items)
      ? o.order_items.map((oi: any) => ({
          book: {
            title_en: oi?.books?.title_en ?? '',
            title_zh: oi?.books?.title_zh ?? '',
          },
          quantity: oi.quantity as number,
        }))
      : [],
  })) satisfies UserOrderProjection[]

  return orders
}

