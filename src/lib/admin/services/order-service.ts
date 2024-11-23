import { prisma } from '@/lib/prisma'
import { OrderStatus } from '@prisma/client'
import type { Order, Prisma } from '@prisma/client'
import { AppError } from '../utils/error-handler'

// Add logging utility
const log = {
  db: (message: string, data?: any) => {
    console.log(`💾 [Order DB] ${message}`, data ? data : '')
  },
  status: (message: string, data?: any) => {
    console.log(`📦 [Order Status] ${message}`, data ? data : '')
  },
  inventory: (message: string, data?: any) => {
    console.log(`📊 [Inventory] ${message}`, data ? data : '')
  },
  error: (message: string, error: any) => {
    console.error(`❌ [Order Error] ${message}`, error)
  },
  perf: (message: string, data?: any) => {
    console.log(`⚡ [Order Perf] ${message}`, data ? data : '')
  }
}

export class OrderService {
  async getNewOrders() {
    const startTime = Date.now()
    try {
      log.db('Fetching new orders')
      const orders = await prisma.order.findMany({
        where: {
          status: 'NEW' as OrderStatus
        },
        include: {
          order_items: {
            include: {
              book: {
                include: {
                  category: true
                }
              }
            }
          },
          address: true,
          user: true
        },
        orderBy: {
          created_at: 'desc'
        }
      })

      const duration = Date.now() - startTime
      log.perf(`Fetched ${orders.length} new orders in ${duration}ms`)
      log.db('New orders found:', {
        count: orders.length,
        orderIds: orders.map(o => o.id)
      })

      return orders
    } catch (error) {
      log.error('Failed to fetch new orders:', error)
      throw new AppError({
        type: 'DATABASE_ERROR',
        message: 'Failed to fetch new orders',
        originalError: error
      })
    }
  }

  async updateOrderStatus(
    id: string, 
    status: OrderStatus,
    adminEmail: string,
    metadata?: any
  ) {
    const startTime = Date.now()
    try {
      log.status('Updating order status:', {
        orderId: id,
        newStatus: status,
        adminEmail
      })

      const order = await prisma.order.update({
        where: { id },
        data: {
          status,
          processed_by: adminEmail,
          processing_started_at: status === 'PROCESSING' ? new Date() : undefined,
          llm_processing_log: metadata ? {
            ...metadata,
            timestamp: new Date()
          } : undefined
        },
        include: {
          order_items: {
            include: {
              book: true
            }
          },
          address: true
        }
      })

      log.status('Order status updated:', {
        orderId: id,
        status,
        itemCount: order.order_items.length
      })

      // Update inventory quantities if order is shipped
      if (status === 'SHIPPED') {
        log.inventory('Updating inventory for shipped order:', {
          orderId: id,
          items: order.order_items.map(item => ({
            bookId: item.book_id,
            quantity: item.quantity
          }))
        })

        await Promise.all(
          order.order_items.map(item =>
            prisma.book.update({
              where: { id: item.book_id },
              data: {
                quantity: {
                  decrement: item.quantity
                },
                last_quantity_update: new Date()
              }
            })
          )
        )
        log.inventory('Inventory updated for all items')
      }

      const duration = Date.now() - startTime
      log.perf(`Order status update completed in ${duration}ms`)

      return order
    } catch (error) {
      log.error('Failed to update order status:', error)
      throw new AppError({
        type: 'DATABASE_ERROR',
        message: 'Failed to update order status',
        originalError: error
      })
    }
  }

  async searchOrders(query: {
    status?: OrderStatus[]
    fromDate?: Date
    toDate?: Date
    userId?: string
  }) {
    const startTime = Date.now()
    try {
      log.db('Searching orders with criteria:', query)

      const orders = await prisma.order.findMany({
        where: {
          status: query.status?.length ? {
            in: query.status
          } : undefined,
          created_at: {
            gte: query.fromDate,
            lte: query.toDate
          },
          user_id: query.userId
        },
        include: {
          order_items: {
            include: {
              book: {
                include: {
                  category: true
                }
              }
            }
          },
          address: true
        },
        orderBy: {
          created_at: 'desc'
        }
      })

      const duration = Date.now() - startTime
      log.perf(`Order search completed in ${duration}ms`, {
        resultCount: orders.length
      })
      log.db('Search results:', {
        count: orders.length,
        statusBreakdown: orders.reduce((acc, order) => {
          acc[order.status] = (acc[order.status] || 0) + 1
          return acc
        }, {} as Record<string, number>)
      })

      return orders
    } catch (error) {
      log.error('Failed to search orders:', error)
      throw new AppError({
        type: 'DATABASE_ERROR',
        message: 'Failed to search orders',
        originalError: error
      })
    }
  }

  async addTrackingNumber(id: string, trackingNumber: string) {
    const startTime = Date.now()
    try {
      log.status('Adding tracking number:', {
        orderId: id,
        trackingNumber
      })

      const order = await prisma.order.update({
        where: { id },
        data: {
          tracking_number: trackingNumber
        }
      })

      const duration = Date.now() - startTime
      log.perf(`Tracking number added in ${duration}ms`)
      log.status('Tracking number added successfully')

      return order
    } catch (error) {
      log.error('Failed to add tracking number:', error)
      throw new AppError({
        type: 'DATABASE_ERROR',
        message: 'Failed to add tracking number',
        originalError: error
      })
    }
  }
}

export const orderService = new OrderService() 