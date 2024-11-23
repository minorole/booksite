import { prisma } from '@/lib/prisma'
import type { 
  Book, 
  Order, 
  SessionType, 
  Category, 
  OrderItem, 
  ShippingAddress,
  BookAnalysis as PrismaBookAnalysis
} from '@prisma/client'
import { SYSTEM_PROMPTS } from './prompt-templates'
import type { BookAnalysis, ConfidenceScores } from '@/types/admin/chat'
import { CATEGORY_NAMES } from '../constants/categories'

// Add logging utility
const log = {
  context: (message: string, data?: any) => {
    console.log(`🔍 [Context] ${message}`, data ? data : '')
  },
  db: (message: string, data?: any) => {
    console.log(`💾 [DB] ${message}`, data ? data : '')
  },
  error: (message: string, error: any) => {
    console.error(`❌ [Error] ${message}`, error)
  }
}

// Update interface to match centralized types
interface TagHistory {
  tag: string
  added_at: Date
  confidence: number | null
}

interface LoadedBook extends Omit<Book, 'tag_history'> {
  category: Category
  analyses: PrismaBookAnalysis[]
  tag_history: TagHistory[]
}

interface LoadedOrder extends Order {
  order_items: Array<OrderItem & {
    book: Book & {
      category: Category
    }
  }>
  address: ShippingAddress
  user: {
    email: string
    name: string | null
    language_preference: string | null
  }
}

interface ContextOptions {
  sessionType: SessionType
  bookIds?: string[]
  orderIds?: string[]
  imageAnalysis?: BookAnalysis
  confidenceThreshold?: number
  language?: string
}

export class ContextBuilder {
  private sessionType: SessionType
  private books: LoadedBook[] = []
  private orders: LoadedOrder[] = []
  private imageAnalysis?: BookAnalysis
  private confidenceThreshold: number = 0.8
  private language?: string

  constructor(options: {
    sessionType: SessionType;
    confidenceThreshold?: number;
    language?: string;
  }) {
    this.sessionType = options.sessionType;
    this.confidenceThreshold = options.confidenceThreshold || 0.8;
    this.language = options.language;
    log.context('Initializing context builder:', {
      sessionType: options.sessionType,
      confidenceThreshold: this.confidenceThreshold,
      language: this.language
    })
  }

  async loadContext(bookIds?: string[], orderIds?: string[]) {
    try {
      if (bookIds?.length) {
        log.db('Loading book context...', { bookIds })
        const books = await prisma.book.findMany({
          where: { id: { in: bookIds } },
          include: {
            category: true,
            analyses: {
              orderBy: { created_at: 'desc' },
              take: 1
            },
            tag_history: {
              orderBy: { added_at: 'desc' },
              take: 5,
              select: {
                tag: true,
                added_at: true,
                confidence: true
              }
            }
          }
        })
        log.db(`Loaded ${books.length} books`)

        // Transform the Prisma result to match LoadedBook type
        this.books = books.map(book => ({
          ...book,
          tag_history: book.tag_history.map(th => ({
            tag: th.tag,
            added_at: th.added_at,
            confidence: th.confidence || null
          }))
        }))
        log.context('Book context loaded:', {
          bookCount: this.books.length,
          bookIds: this.books.map(b => b.id)
        })
      }

      if (orderIds?.length) {
        log.db('Loading order context...', { orderIds })
        this.orders = await prisma.order.findMany({
          where: { id: { in: orderIds } },
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
            user: {
              select: {
                email: true,
                name: true,
                language_preference: true
              }
            }
          }
        })
        log.db(`Loaded ${this.orders.length} orders`)
        log.context('Order context loaded:', {
          orderCount: this.orders.length,
          orderIds: this.orders.map(o => o.id)
        })
      }
    } catch (error) {
      log.error('Failed to load context:', error)
      throw error
    }
  }

  buildSystemPrompt(): string {
    log.context('Building system prompt for session type:', this.sessionType)
    let prompt = SYSTEM_PROMPTS.chatAssistant

    if (this.language) {
      prompt += `\nPreferred response language: ${this.language}`
    }

    let contextPrompt = ''
    switch (this.sessionType) {
      case 'INVENTORY_MANAGEMENT':
        contextPrompt = this.buildInventoryContext()
        break
      case 'ORDER_PROCESSING':
        contextPrompt = this.buildOrderContext()
        break
      case 'CUSTOMER_SERVICE':
        contextPrompt = this.buildCustomerServiceContext()
        break
      default:
        contextPrompt = this.buildGeneralContext()
    }

    log.context('Final prompt built:', {
      baseLength: prompt.length,
      contextLength: contextPrompt.length,
      totalLength: prompt.length + contextPrompt.length
    })

    return prompt + contextPrompt
  }

  private buildInventoryContext(): string {
    log.context('Building inventory context', {
      booksCount: this.books.length,
      hasImageAnalysis: !!this.imageAnalysis
    })

    if (!this.books.length && !this.imageAnalysis) {
      return '\nNo specific inventory context.'
    }

    let context = '\n\nCurrent inventory context:'

    if (this.imageAnalysis) {
      const scores: ConfidenceScores = this.imageAnalysis.confidence_scores
      
      context += `\nAnalyzing book cover with confidence scores:
Title detection: ${scores.title}
Language detection: ${scores.language_detection}
Category suggestion: ${scores.category}
Tag suggestions: ${scores.tags}
Only suggest tags or categories if confidence exceeds ${this.confidenceThreshold}.`

      log.context('Added image analysis context', {
        confidenceScores: scores
      })
    }

    if (this.books.length) {
      context += '\n\nRelevant books:'
      this.books.forEach(book => {
        const category = CATEGORY_NAMES[book.category.type]
        context += `\n- ${book.title_zh} / ${book.title_en || 'No English title'}
Category: ${category.zh} / ${category.en}
Quantity: ${book.quantity}
Current tags: ${book.search_tags.join(', ')}
Pending tags: ${book.pending_tags.join(', ')}
Auto-generated tags: ${book.auto_tags.join(', ')}
${book.discontinued ? 'DISCONTINUED' : ''}`
      })
      log.context('Added book context', {
        bookCount: this.books.length,
        totalTags: this.books.reduce((acc, book) => acc + book.search_tags.length, 0)
      })
    }

    return context
  }

  private buildOrderContext(): string {
    if (!this.orders.length) {
      return '\nNo specific order context.'
    }

    let context = '\n\nCurrent order context:'
    
    this.orders.forEach(order => {
      context += `\nOrder #${order.id}:
Status: ${order.status}
Customer: ${order.user.name || 'Unknown'} (${order.user.email})
Language: ${order.user.language_preference || 'Not specified'}
Items:${order.order_items.map(item => `
- ${item.book.title_zh} / ${item.book.title_en || 'No English title'} (${item.quantity})`)}
Shipping to: ${order.address.address1}, ${order.address.city}, ${order.address.state}
${order.notes ? `Notes: ${order.notes}` : ''}`
    })

    return context
  }

  private buildCustomerServiceContext(): string {
    let context = '\n\nCustomer service context:'
    
    if (this.books.length) {
      context += '\nRelevant books:'
      this.books.forEach(book => {
        context += `\n- ${book.title_zh} / ${book.title_en || 'No English title'}`
      })
    }

    if (this.orders.length) {
      context += '\nRelevant orders:'
      this.orders.forEach(order => {
        context += `\n- Order #${order.id} (${order.status})`
      })
    }

    return context
  }

  private buildGeneralContext(): string {
    let context = '\n\nGeneral context:'
    
    if (this.books.length) {
      context += `\n${this.books.length} books in current context`
    }
    
    if (this.orders.length) {
      context += `\n${this.orders.length} orders in current context`
    }

    return context
  }

  getBooks(): LoadedBook[] {
    log.context('Retrieving loaded books', {
      count: this.books.length
    })
    return this.books
  }

  getOrders(): LoadedOrder[] {
    log.context('Retrieving loaded orders', {
      count: this.orders.length
    })
    return this.orders
  }

  setConfidenceThreshold(threshold: number) {
    log.context('Updating confidence threshold', {
      old: this.confidenceThreshold,
      new: threshold
    })
    this.confidenceThreshold = threshold
  }

  setImageAnalysis(analysis: BookAnalysis) {
    log.context('Setting image analysis', {
      hasTitle: !!analysis.title_zh || !!analysis.title_en,
      confidenceScores: analysis.confidence_scores
    })
    this.imageAnalysis = analysis
  }

  setLanguage(language: string) {
    log.context('Setting language preference', {
      old: this.language,
      new: language
    })
    this.language = language
  }
} 