import { prisma } from '@/lib/prisma'
import type { AdminAction, Prisma } from '@prisma/client'
import { AppError } from '../utils/error-handler'

const SYSTEM_ADMIN = 'system'

export class AdminLogService {
  async logAction(data: {
    action: AdminAction
    bookId?: string
    bookTitle?: string
    metadata?: any
    llmContext?: any
    relatedItems?: string[]
    confidence?: number
    sessionId?: string
    promptVersion?: number
  }) {
    try {
      return await prisma.adminLog.create({
        data: {
          action: data.action,
          admin_email: SYSTEM_ADMIN,
          book_id: data.bookId,
          book_title: data.bookTitle,
          metadata: data.metadata,
          llm_context: data.llmContext,
          related_items: data.relatedItems || [],
          confidence: data.confidence,
          session_id: data.sessionId,
          prompt_version: data.promptVersion
        }
      })
    } catch (error) {
      throw new AppError({
        type: 'DATABASE_ERROR',
        message: 'Failed to log admin action',
        originalError: error
      })
    }
  }

  async getRecentLogs(adminEmail: string, limit: number = 50) {
    try {
      return await prisma.adminLog.findMany({
        where: {
          admin_email: adminEmail
        },
        orderBy: {
          created_at: 'desc'
        },
        take: limit
      })
    } catch (error) {
      throw new AppError({
        type: 'DATABASE_ERROR',
        message: 'Failed to fetch admin logs',
        originalError: error
      })
    }
  }
}

export const adminLogService = new AdminLogService() 