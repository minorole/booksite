import { prisma } from '@/lib/prisma'
import type { Book, Category, CategoryType, Prisma } from '@prisma/client'
import { AppError } from '../utils/error-handler'
import type { BookAnalysis, ConfidenceScores } from '@/types/admin/chat'

// Add logging utility
const log = {
  db: (message: string, data?: any) => {
    console.log(`💾 [Book DB] ${message}`, data ? data : '')
  },
  ai: (message: string, data?: any) => {
    console.log(`🤖 [Book AI] ${message}`, data ? data : '')
  },
  error: (message: string, error: any) => {
    console.error(`❌ [Book Error] ${message}`, error)
  },
  perf: (message: string, data?: any) => {
    console.log(`⚡ [Book Perf] ${message}`, data ? data : '')
  }
}

export class BookService {
  async createBook(data: {
    title_zh: string
    title_en?: string | null
    category_id: string
    cover_image?: string
    quantity: number
    search_tags: string[]
    ai_metadata?: Prisma.InputJsonValue
    image_analysis_data?: Prisma.InputJsonValue
  }) {
    const startTime = Date.now()
    try {
      log.db('Creating new book:', {
        title_zh: data.title_zh,
        title_en: data.title_en,
        category_id: data.category_id
      })

      const bookData: Prisma.BookCreateInput = {
        title_zh: data.title_zh,
        title_en: data.title_en,
        description_zh: '',  // Required field, can be updated later
        description_en: null,
        cover_image: data.cover_image,
        quantity: data.quantity,
        search_tags: data.search_tags,
        auto_tags: [],
        pending_tags: [],
        rejected_tags: [],
        ai_metadata: data.ai_metadata,
        image_analysis_data: data.image_analysis_data,
        category: {
          connect: {
            id: data.category_id
          }
        }
      }

      const book = await prisma.book.create({
        data: bookData,
        include: {
          category: true
        }
      })

      const duration = Date.now() - startTime
      log.perf(`Book created in ${duration}ms`, { bookId: book.id })
      log.db('Book created successfully:', {
        id: book.id,
        title_zh: book.title_zh,
        category: book.category.type
      })

      return book
    } catch (error) {
      log.error('Failed to create book:', error)
      throw new AppError({
        type: 'DATABASE_ERROR',
        message: 'Failed to create book',
        originalError: error
      })
    }
  }

  async updateBook(id: string, data: Prisma.BookUpdateInput) {
    try {
      return await prisma.book.update({
        where: { id },
        data,
        include: {
          category: true
        }
      })
    } catch (error) {
      throw new AppError({
        type: 'DATABASE_ERROR',
        message: 'Failed to update book',
        originalError: error
      })
    }
  }

  async findDuplicates(data: {
    title_zh?: string
    title_en?: string
    image_analysis_data?: any
  }) {
    const startTime = Date.now()
    try {
      log.db('Checking for duplicates:', {
        title_zh: data.title_zh,
        title_en: data.title_en
      })

      // Exact title match
      const exactMatches = await prisma.book.findMany({
        where: {
          OR: [
            { title_zh: data.title_zh },
            { title_en: data.title_en }
          ]
        },
        include: {
          category: true
        }
      })

      log.db('Exact matches found:', {
        count: exactMatches.length,
        ids: exactMatches.map(m => m.id)
      })

      // Similar titles using fuzzy match
      const similarMatches = await prisma.book.findMany({
        where: {
          OR: [
            {
              title_zh: {
                contains: data.title_zh?.substring(0, Math.floor(data.title_zh.length * 0.7))
              }
            },
            {
              title_en: {
                contains: data.title_en?.substring(0, Math.floor(data.title_en?.length * 0.7))
              }
            }
          ],
          NOT: {
            id: {
              in: exactMatches.map(m => m.id)
            }
          }
        },
        include: {
          category: true
        }
      })

      log.db('Similar matches found:', {
        count: similarMatches.length,
        ids: similarMatches.map(m => m.id)
      })

      const duration = Date.now() - startTime
      log.perf(`Duplicate check completed in ${duration}ms`, {
        exactCount: exactMatches.length,
        similarCount: similarMatches.length
      })

      return {
        exact: exactMatches[0] || null,
        similar: similarMatches
      }
    } catch (error) {
      log.error('Failed to check duplicates:', error)
      throw new AppError({
        type: 'DATABASE_ERROR',
        message: 'Failed to check duplicates',
        originalError: error
      })
    }
  }

  async updateTags(id: string, {
    add = [],
    remove = [],
    auto_tags = [],
    confidence_threshold = 0.8
  }: {
    add?: string[]
    remove?: string[]
    auto_tags?: string[]
    confidence_threshold?: number
  }) {
    const startTime = Date.now()
    try {
      log.db('Updating tags for book:', {
        bookId: id,
        add,
        remove,
        auto_tags,
        confidence_threshold
      })

      const book = await prisma.book.findUnique({
        where: { id },
        select: { 
          search_tags: true,
          auto_tags: true,
          pending_tags: true,
          rejected_tags: true
        }
      })

      if (!book) {
        log.error('Book not found:', { bookId: id })
        throw new Error('Book not found')
      }

      // Handle manual tags
      const updatedTags = [
        ...book.search_tags.filter(tag => !remove.includes(tag)),
        ...add.filter(tag => !book.search_tags.includes(tag))
      ]

      // Handle auto-generated tags
      const newAutoTags = auto_tags.filter(tag => 
        !book.rejected_tags.includes(tag) && 
        !book.auto_tags.includes(tag)
      )

      log.db('Tag updates calculated:', {
        originalTagCount: book.search_tags.length,
        newTagCount: updatedTags.length,
        newAutoTagCount: newAutoTags.length
      })

      const updatedBook = await prisma.book.update({
        where: { id },
        data: { 
          search_tags: updatedTags,
          auto_tags: [...book.auto_tags, ...newAutoTags],
          pending_tags: newAutoTags // New auto tags start as pending
        },
        include: { category: true }
      })

      const duration = Date.now() - startTime
      log.perf(`Tags updated in ${duration}ms`, {
        bookId: id,
        tagCount: updatedTags.length
      })

      return updatedBook
    } catch (error) {
      log.error('Failed to update tags:', error)
      throw new AppError({
        type: 'DATABASE_ERROR',
        message: 'Failed to update tags',
        originalError: error
      })
    }
  }

  async searchBooks(query: {
    title?: string
    category?: CategoryType
    tags?: string[]
    minQuantity?: number
    maxQuantity?: number
    discontinued?: boolean
  }) {
    try {
      return await prisma.book.findMany({
        where: {
          OR: query.title ? [
            { title_zh: { contains: query.title } },
            { title_en: { contains: query.title } }
          ] : undefined,
          category: query.category ? {
            type: query.category
          } : undefined,
          search_tags: query.tags?.length ? {
            hasEvery: query.tags
          } : undefined,
          quantity: {
            gte: query.minQuantity,
            lte: query.maxQuantity
          },
          discontinued: query.discontinued
        },
        include: {
          category: true
        },
        orderBy: {
          updated_at: 'desc'
        }
      })
    } catch (error) {
      throw new AppError({
        type: 'DATABASE_ERROR',
        message: 'Failed to search books',
        originalError: error
      })
    }
  }

  async recordAnalysis(bookId: string, analysis: BookAnalysis) {
    const startTime = Date.now()
    try {
      log.ai('Recording book analysis:', {
        bookId,
        analysisType: analysis.analysis_type
      })

      const scores: ConfidenceScores = analysis.confidence_scores

      const analysisData: Prisma.BookAnalysisCreateInput = {
        book: {
          connect: { id: bookId }
        },
        analysis_type: analysis.analysis_type,
        result: analysis as unknown as Prisma.InputJsonValue,
        confidence: Math.max(
          scores.title,
          scores.language_detection,
          scores.category,
          scores.tags
        ),
        prompt_used: 'Image Analysis v1',
        prompt_version: analysis.prompt_version
      }

      const savedAnalysis = await prisma.bookAnalysis.create({
        data: analysisData
      })

      const duration = Date.now() - startTime
      log.perf(`Analysis recorded in ${duration}ms`, {
        bookId,
        analysisId: savedAnalysis.id
      })

      return savedAnalysis
    } catch (error) {
      log.error('Failed to record analysis:', error)
      throw new AppError({
        type: 'DATABASE_ERROR',
        message: 'Failed to record analysis',
        originalError: error
      })
    }
  }
}

export const bookService = new BookService() 