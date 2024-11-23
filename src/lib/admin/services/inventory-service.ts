import { prisma } from '@/lib/prisma'
import { AppError } from '../utils/error-handler'
import type { CategoryType } from '@prisma/client'

// Add logging utility
const log = {
  inventory: (message: string, data?: any) => {
    console.log(`📦 [Inventory] ${message}`, data ? data : '')
  },
  db: (message: string, data?: any) => {
    console.log(`💾 [Inventory DB] ${message}`, data ? data : '')
  },
  error: (message: string, error: any) => {
    console.error(`❌ [Inventory Error] ${message}`, error)
  },
  perf: (message: string, data?: any) => {
    console.log(`⚡ [Inventory Perf] ${message}`, data ? data : '')
  }
}

export class InventoryService {
  async updateQuantity(id: string, quantity: number, adminEmail: string) {
    const startTime = Date.now()
    try {
      log.inventory('Updating book quantity:', {
        bookId: id,
        newQuantity: quantity,
        adminEmail
      })

      const book = await prisma.book.update({
        where: { id },
        data: {
          quantity,
          last_quantity_update: new Date()
        }
      })

      const duration = Date.now() - startTime
      log.perf(`Quantity updated in ${duration}ms`)
      log.inventory('Quantity updated successfully:', {
        bookId: id,
        oldQuantity: book.quantity,
        newQuantity: quantity
      })

      return book
    } catch (error) {
      log.error('Failed to update quantity:', error)
      throw new AppError({
        type: 'DATABASE_ERROR',
        message: 'Failed to update quantity',
        originalError: error
      })
    }
  }

  async getLowStock(threshold: number = 20) {
    const startTime = Date.now()
    try {
      log.inventory('Checking low stock items:', { threshold })

      const books = await prisma.book.findMany({
        where: {
          quantity: {
            lte: threshold
          },
          discontinued: false
        },
        include: {
          category: true
        },
        orderBy: {
          quantity: 'asc'
        }
      })

      const duration = Date.now() - startTime
      log.perf(`Low stock check completed in ${duration}ms`)
      log.inventory('Low stock items found:', {
        count: books.length,
        itemsBelow10: books.filter(b => b.quantity < 10).length,
        categoryBreakdown: books.reduce((acc, book) => {
          acc[book.category.type] = (acc[book.category.type] || 0) + 1
          return acc
        }, {} as Record<string, number>)
      })

      return books
    } catch (error) {
      log.error('Failed to get low stock items:', error)
      throw new AppError({
        type: 'DATABASE_ERROR',
        message: 'Failed to get low stock items',
        originalError: error
      })
    }
  }

  async discontinueBook(id: string, adminEmail: string, reason?: string) {
    const startTime = Date.now()
    try {
      log.inventory('Discontinuing book:', {
        bookId: id,
        adminEmail,
        reason
      })

      const book = await prisma.book.update({
        where: { id },
        data: {
          discontinued: true,
          discontinued_at: new Date(),
          discontinued_by: adminEmail,
          discontinued_reason: reason,
          quantity: 0
        }
      })

      const duration = Date.now() - startTime
      log.perf(`Book discontinued in ${duration}ms`)
      log.inventory('Book discontinued successfully:', {
        bookId: id,
        title_zh: book.title_zh,
        title_en: book.title_en,
        reason
      })

      return book
    } catch (error) {
      log.error('Failed to discontinue book:', error)
      throw new AppError({
        type: 'DATABASE_ERROR',
        message: 'Failed to discontinue book',
        originalError: error
      })
    }
  }

  async getInventoryByCategory(category: CategoryType) {
    const startTime = Date.now()
    try {
      log.inventory('Fetching inventory by category:', { category })

      const books = await prisma.book.findMany({
        where: {
          category: {
            type: category
          },
          discontinued: false
        },
        include: {
          category: true
        },
        orderBy: {
          title_zh: 'asc'
        }
      })

      const duration = Date.now() - startTime
      log.perf(`Category inventory fetched in ${duration}ms`)
      log.inventory('Category inventory stats:', {
        category,
        totalBooks: books.length,
        totalQuantity: books.reduce((sum, book) => sum + book.quantity, 0),
        lowStockCount: books.filter(b => b.quantity <= 20).length
      })

      return books
    } catch (error) {
      log.error('Failed to get inventory by category:', error)
      throw new AppError({
        type: 'DATABASE_ERROR',
        message: 'Failed to get inventory by category',
        originalError: error
      })
    }
  }
}

export const inventoryService = new InventoryService() 