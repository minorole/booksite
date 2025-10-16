import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock the Supabase server client used by the helper
vi.mock('@/lib/db/client', () => {
  let mockData: any[] = []
  let mockError: { message: string } | null = null

  const api = {
    __setResponse(data: any[], error: { message: string } | null = null) {
      mockData = data
      mockError = error
    },
    getServerDb: async () => {
      return {
        from() {
          return {
            select() {
              return {
                eq() {
                  return {
                    order() {
                      return Promise.resolve({ data: mockData, error: mockError })
                    }
                  }
                }
              }
            }
          }
        }
      } as any
    }
  }

  return api
})

import { getUserOrders } from '@/lib/db/orders'

// Access the mock control API
const clientMock = await import('@/lib/db/client') as any

describe('getUserOrders', () => {
  beforeEach(() => {
    clientMock.__setResponse([])
  })

  it('maps orders with shipping address and items correctly', async () => {
    const sample = [
      {
        id: 'o1',
        status: 'PENDING',
        total_items: 3,
        created_at: '2025-01-01T00:00:00.000Z',
        shipping_addresses: {
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

    clientMock.__setResponse(sample)
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
        shipping_addresses: {
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

    clientMock.__setResponse(sample)
    const orders = await getUserOrders('user-2')
    expect(orders).toHaveLength(1)
    const o = orders[0]
    expect(o.shipping_address).toBe('456 Side Rd\nMetropolis\nUS')
    expect(o.order_items).toEqual([])
  })
})

