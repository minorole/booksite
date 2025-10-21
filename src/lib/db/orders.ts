import { createRouteSupabaseClient } from '@/lib/supabase'

type OrderItemProjection = {
  book: {
    title_en: string | null
    title_zh: string | null
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

type ShippingAddress = {
  address1?: string | null
  address2?: string | null
  city?: string | null
  state?: string | null
  zip?: string | null
  country?: string | null
  recipient_name?: string | null
  phone?: string | null
}

function formatAddress(addr: ShippingAddress | null | undefined): string {
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
  const db = await createRouteSupabaseClient()

  const sel = `
    id, status, total_items, created_at,
    order_shipping_addresses:order_shipping_addresses!orders_order_shipping_address_id_fkey (
      recipient_name, phone, address1, address2, city, state, zip, country
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

  type Row = {
    id: string
    status: string
    total_items: number
    created_at: string
    order_shipping_addresses: ShippingAddress | null
    order_items: Array<{ quantity: number; books: { title_en: string | null; title_zh: string | null } | null }>
  }

  const orders = ((data ?? []) as Row[]).map((o) => ({
    id: o.id,
    status: o.status,
    total_items: o.total_items,
    created_at: o.created_at,
    shipping_address: formatAddress(o.order_shipping_addresses),
    order_items: Array.isArray(o.order_items)
      ? o.order_items.map((oi) => ({
          book: {
            // Normalize missing English title to empty string to match UI/tests
            title_en: oi.books?.title_en ?? '',
            title_zh: oi.books?.title_zh ?? null,
          },
          quantity: oi.quantity,
        }))
      : [],
  })) satisfies UserOrderProjection[]

  return orders
}
