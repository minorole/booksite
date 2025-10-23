import { describe, it, expect, vi, beforeEach } from 'vitest'
import { installRouteSupabaseMock } from '../utils/supabase'

const control = installRouteSupabaseMock()
import { getUserOrders } from '@/lib/db/orders'

describe('getUserOrders', () => {
  beforeEach(() => {
    vi.resetModules()
    control.setResponse([])
  })

  it('maps orders with shipping address and items correctly', async () => {
    const sample = [
      {
        id: 'o1',
        status: 'PENDING',
        total_items: 3,
        created_at: '2025-01-01T00:00:00.000Z',
        order_shipping_addresses: {
          address1: '123 Main St',
          address2: 'Apt 5',
          city: 'Springfield',
          state: 'IL',
          zip: '62701',
          country: 'US'
        },
        order_items: [
          { quantity: 1, books: { title_en: 'Title EN', title_zh: '标题ZH' } },
          { quantity: 2, books: { title_en: null, title_zh: '另一本' } },
        ]
      }
    ]

    control.setResponse(sample)
    const orders = await getUserOrders('user-1')

    expect(orders).toHaveLength(1)
    const o = orders[0]
    expect(o.id).toBe('o1')
    expect(o.status).toBe('PENDING')
    expect(o.total_items).toBe(3)
    expect(o.created_at).toBe('2025-01-01T00:00:00.000Z')
    expect(o.shipping_address).toBe('123 Main St\nApt 5\nSpringfield, IL\n62701 US')
    expect(o.order_items).toEqual([
      { book: { title_en: 'Title EN', title_zh: '标题ZH' }, quantity: 1 },
      { book: { title_en: '', title_zh: '另一本' }, quantity: 2 },
    ])
  })

  it('handles missing address fields and empty items', async () => {
    const sample = [
      {
        id: 'o2',
        status: 'COMPLETED',
        total_items: 0,
        created_at: '2025-02-02T00:00:00.000Z',
        order_shipping_addresses: {
          address1: '456 Side Rd',
          address2: null,
          city: 'Metropolis',
          state: null,
          zip: null,
          country: 'US'
        },
        order_items: []
      }
    ]

    control.setResponse(sample)
    const orders = await getUserOrders('user-2')
    expect(orders).toHaveLength(1)
    const o = orders[0]
    expect(o.shipping_address).toBe('456 Side Rd\nMetropolis\nUS')
    expect(o.order_items).toEqual([])
  })
})
