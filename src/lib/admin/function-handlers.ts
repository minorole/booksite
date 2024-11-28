import { prisma } from '@/lib/prisma'
import { type AdminAction, type CategoryType, type Book, type Category, Prisma } from '@prisma/client'
import { 
  type BookCreate, 
  type BookUpdate, 
  type BookSearch,
  type OrderUpdate,
  type AdminOperationResult,
  type BookBase,
  type OrderBase,
  type VisionAnalysisResult
} from './types'

/**
 * Helper function to validate UUID format
 * Only validation we need since we trust GPT-4o for business logic
 */
function isValidUUID(uuid: string) {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

/**
 * Generic error handler for database operations
 * Maintains consistent error structure for GPT-4o to understand
 */
function handleOperationError(error: unknown, operation: string): AdminOperationResult {
  console.error(`❌ Failed to ${operation}:`, error)
  return {
    success: false,
    message: `Failed to ${operation}`,
    error: {
      code: 'database_error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * Transforms database Book object to BookBase type
 * Ensures consistent data structure for GPT-4o interactions
 */
function toBookBase(book: Book & { category: Category }): BookBase {
  // Parse stored JSON data with type safety
  const analysisData = book.image_analysis_data ? 
    (typeof book.image_analysis_data === 'string' ? 
      JSON.parse(book.image_analysis_data) : 
      book.image_analysis_data) as VisionAnalysisResult : 
    undefined;

  return {
    title_zh: book.title_zh,
    title_en: book.title_en,
    description_zh: book.description_zh,
    description_en: book.description_en,
    category_type: book.category.type,
    quantity: book.quantity,
    tags: book.search_tags,
    cover_image: book.cover_image || '',
    analysis_result: analysisData,
    similarity_group: book.similar_books?.join(',')
  }
}

/**
 * Creates a new book in the database
 * Accepts GPT-4o's decisions while ensuring data structure
 */
export async function createBook(args: BookCreate, adminEmail: string): Promise<AdminOperationResult> {
  console.log('📚 Creating new book:', args)
  
  try {
    // Properly handle JSON data for Prisma
    const analysisData = args.analysis_result ? 
      (args.analysis_result as unknown as Prisma.InputJsonValue) : 
      Prisma.JsonNull;

    const book = await prisma.book.create({
      data: {
        title_zh: args.title_zh,
        title_en: args.title_en,
        description_zh: args.description_zh,
        description_en: args.description_en,
        category: {
          connect: {
            type: args.category_type
          }
        },
        quantity: args.quantity,
        search_tags: args.tags,
        cover_image: args.cover_image,
        content_summary_zh: args.content_summary_zh || '',
        content_summary_en: args.content_summary_en,
        author_zh: args.author_zh,
        author_en: args.author_en,
        publisher_zh: args.publisher_zh,
        publisher_en: args.publisher_en,
        image_analysis_data: analysisData,
        similar_books: args.similarity_group ? args.similarity_group.split(',') : []
      },
      include: {
        category: true
      }
    })

    await prisma.adminLog.create({
      data: {
        action: 'CREATE_BOOK' as AdminAction,
        book_id: book.id,
        book_title: args.title_en || args.title_zh,
        admin_email: adminEmail,
        metadata: {
          title_zh: args.title_zh,
          title_en: args.title_en,
          category_type: args.category_type,
          quantity: args.quantity,
          tags: args.tags,
          cover_image: args.cover_image,
          ai_analysis: args.analysis_result ? true : false
        }
      }
    })

    return {
      success: true,
      message: 'Book created successfully',
      data: {
        book: toBookBase(book)
      }
    }
  } catch (error) {
    return handleOperationError(error, 'create book')
  }
}

/**
 * Updates an existing book in the database
 * Trusts GPT-4o's validation of business logic
 */
export async function updateBook(args: BookUpdate, adminEmail: string): Promise<AdminOperationResult> {
  try {
    if (!isValidUUID(args.book_id)) {
      return {
        success: false,
        message: 'Invalid book ID format',
        error: {
          code: 'validation_error',
          details: 'invalid_uuid'
        }
      }
    }

    // Properly handle JSON data for Prisma
    const analysisData = args.analysis_result ? 
      (args.analysis_result as unknown as Prisma.InputJsonValue) : 
      undefined;

    const updateData: Prisma.BookUpdateInput = {
      ...(args.title_zh && { title_zh: args.title_zh }),
      ...(args.title_en && { title_en: args.title_en }),
      ...(args.quantity !== undefined && { quantity: args.quantity }),
      ...(args.tags && { search_tags: args.tags }),
      ...(args.category_type && {
        category: {
          connect: {
            type: args.category_type
          }
        }
      }),
      ...(analysisData !== undefined && { 
        image_analysis_data: analysisData 
      })
    };

    const updatedBook = await prisma.book.update({
      where: { id: args.book_id },
      data: updateData,
      include: {
        category: true
      }
    })

    await prisma.adminLog.create({
      data: {
        action: 'EDIT_BOOK' as AdminAction,
        book_id: updatedBook.id,
        book_title: updatedBook.title_zh,
        admin_email: adminEmail,
        metadata: {
          changes: {
            title_zh: args.title_zh,
            title_en: args.title_en,
            quantity: args.quantity,
            tags: args.tags,
            category_type: args.category_type
          }
        }
      }
    })

    return {
      success: true,
      message: 'Book updated successfully',
      data: {
        book: toBookBase(updatedBook)
      }
    }
  } catch (error) {
    return handleOperationError(error, 'update book')
  }
}

/**
 * Searches books based on various criteria
 * Trusts GPT-4o's search parameter validation
 */
export async function searchBooks(args: BookSearch): Promise<AdminOperationResult> {
  console.log('🔍 Searching books with criteria:', args)

  try {
    const whereConditions: any = {}
    
    if (args.title) {
      whereConditions.OR = [
        { 
          title_zh: { 
            contains: args.title,
            mode: 'insensitive'
          }
        },
        { 
          title_en: { 
            contains: args.title,
            mode: 'insensitive'
          }
        }
      ]
    }

    if (args.tags) {
      whereConditions.search_tags = {
        hasSome: args.tags
      }
    }

    if (args.category_type) {
      whereConditions.category = {
        type: args.category_type
      }
    }

    if (args.min_quantity) {
      whereConditions.quantity = {
        ...whereConditions.quantity,
        gte: args.min_quantity
      }
    }

    if (args.max_quantity) {
      whereConditions.quantity = {
        ...whereConditions.quantity,
        lte: args.max_quantity
      }
    }

    const books = await prisma.book.findMany({
      where: whereConditions,
      include: {
        category: true
      }
    })

    return {
      success: true,
      message: `Found ${books.length} book(s)`,
      data: {
        search: {
          found: books.length > 0,
          books: books.map(toBookBase)
        }
      }
    }
  } catch (error) {
    return handleOperationError(error, 'search books')
  }
}

/**
 * Updates order status and details
 * Trusts GPT-4o's validation of order status transitions
 */
export async function updateOrder(args: OrderUpdate, adminEmail: string): Promise<AdminOperationResult> {
  console.log('🔄 Updating order status:', args)

  try {
    if (!isValidUUID(args.order_id)) {
      return {
        success: false,
        message: 'Invalid order ID format',
        error: {
          code: 'validation_error',
          details: 'invalid_uuid'
        }
      }
    }

    const order = await prisma.order.update({
      where: { id: args.order_id },
      data: {
        status: args.status,
        ...(args.tracking_number && { tracking_number: args.tracking_number }),
        processed_by: adminEmail,
        ...(args.status === 'PROCESSING' && { processing_started_at: new Date() }),
        ...(args.admin_notes && { admin_notes: args.admin_notes }),
        ...(args.override_monthly !== undefined && { override_monthly: args.override_monthly })
      }
    })

    await prisma.adminLog.create({
      data: {
        action: 'UPDATE_STATUS' as AdminAction,
        admin_email: adminEmail,
        metadata: {
          order_id: args.order_id,
          new_status: args.status,
          tracking_number: args.tracking_number,
          override_monthly: args.override_monthly
        }
      }
    })

    const orderBase: OrderBase = {
      order_id: order.id,
      status: order.status,
      tracking_number: order.tracking_number || undefined
    }

    return {
      success: true,
      message: 'Order updated successfully',
      data: {
        order: orderBase
      }
    }
  } catch (error) {
    return handleOperationError(error, 'update order')
  }
} 