import { prisma } from '@/lib/prisma'
import { type AdminAction, type CategoryType } from '@prisma/client'

// Define type for create book arguments
type CreateBookArgs = {
  title_zh?: string | null
  title_en?: string | null
  category_type: CategoryType
  quantity: number
  tags: string[]
  cover_image: string
  description_zh?: string | null
  description_en?: string | null
}

// Add UUID validation helper
function isValidUUID(uuid: string) {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

export async function createBook(args: CreateBookArgs, adminEmail: string) {
  console.log('📚 Creating new book:', args)
  
  if (!args.title_zh && !args.title_en) {
    throw new Error('At least one title (Chinese or English) must be provided')
  }
  
  try {
    const book = await prisma.book.create({
      data: {
        title_zh: args.title_zh || '', // Provide empty string if null
        title_en: args.title_en,
        description_zh: args.description_zh || '', // Provide empty string if null
        description_en: args.description_en,
        category: {
          connect: {
            type: args.category_type
          }
        },
        quantity: args.quantity,
        search_tags: args.tags,
        cover_image: args.cover_image,
        content_summary_zh: '',  // Required field with default value
        content_summary_en: null // Optional field
      }
    })

    // Log the action
    await prisma.adminLog.create({
      data: {
        action: 'CREATE_BOOK' as AdminAction,
        book_id: book.id,
        book_title: args.title_en || args.title_zh || 'Untitled', // Use available title
        admin_email: adminEmail,
        metadata: args
      }
    })

    console.log('✅ Book created successfully:', {
      id: book.id,
      title_zh: book.title_zh,
      title_en: book.title_en,
      quantity: book.quantity
    })

    return book
  } catch (error) {
    console.error('❌ Failed to create book:', error)
    throw error
  }
}

export async function updateBook(args: any, adminEmail: string) {
  try {
    // Log the update attempt first
    console.log('📝 Updating book:', {
      book_id: args.book_id,
      changes: args,
      adminEmail,
      timestamp: new Date().toISOString()
    });

    // Validate book exists first
    const book = await prisma.book.findUnique({
      where: { id: args.book_id },
      include: { category: true }
    });

    if (!book) {
      console.error('❌ Book not found:', args.book_id);
      throw new Error(`Book not found. Please search again to get correct ID.`);
    }

    // Log the current state before update
    console.log('📖 Current book state:', {
      id: book.id,
      title: book.title_zh,
      quantity: book.quantity,
      tags: book.search_tags
    });

    const updatedBook = await prisma.book.update({
      where: { id: args.book_id },
      data: {
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
        })
      },
      include: {
        category: true
      }
    });

    // Log successful update
    console.log('✅ Book updated successfully:', {
      id: updatedBook.id,
      title: updatedBook.title_zh,
      changes: {
        quantity: args.quantity !== undefined ? {
          from: book.quantity,
          to: updatedBook.quantity
        } : undefined,
        tags: args.tags ? {
          from: book.search_tags,
          to: updatedBook.search_tags
        } : undefined
      }
    });

    // Create admin log
    await prisma.adminLog.create({
      data: {
        action: 'EDIT_BOOK' as AdminAction,
        book_id: updatedBook.id,
        book_title: updatedBook.title_zh,
        admin_email: adminEmail,
        metadata: {
          previous_state: {
            quantity: book.quantity,
            tags: book.search_tags
          },
          changes: args,
          new_state: {
            quantity: updatedBook.quantity,
            tags: updatedBook.search_tags
          }
        }
      }
    });

    return updatedBook;
  } catch (error) {
    console.error('❌ Failed to update book:', error instanceof Error ? {
      name: error.name,
      message: error.message,
      stack: error.stack,
      context: {
        book_id: args.book_id,
        attempted_changes: args
      }
    } : error);
    throw error;
  }
}

export async function updateOrderStatus(args: any, adminEmail: string) {
  console.log('🔄 Updating order status:', args)

  try {
    const order = await prisma.order.update({
      where: { id: args.order_id },
      data: {
        status: args.status,
        ...(args.tracking_number && { tracking_number: args.tracking_number }),
        processed_by: adminEmail,
        ...(args.status === 'PROCESSING' && { processing_started_at: new Date() })
      }
    })

    await prisma.adminLog.create({
      data: {
        action: 'UPDATE_STATUS' as AdminAction,
        admin_email: adminEmail,
        metadata: {
          order_id: args.order_id,
          new_status: args.status,
          tracking_number: args.tracking_number
        }
      }
    })

    console.log('✅ Order status updated successfully:', {
      id: order.id,
      status: order.status,
      tracking: order.tracking_number
    })

    return order
  } catch (error) {
    console.error('❌ Failed to update order status:', error)
    throw error
  }
}

export async function searchBooks(args: any) {
  console.log('🔍 Searching books with criteria:', args)

  try {
    // Construct base query conditions
    const whereConditions: any = {}
    
    // Add title search if provided
    if (args.title) {
      whereConditions.OR = [
        { 
          title_zh: { 
            contains: args.title,
            mode: 'insensitive'  // Case insensitive
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

    // Add tag search if provided
    if (args.tags) {
      whereConditions.search_tags = {
        hasSome: args.tags
      }
    }

    // Add category filter if provided
    if (args.category_type) {
      whereConditions.category = {
        type: args.category_type
      }
    }

    // Add quantity filters if provided
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

    console.log('📊 Constructed query:', JSON.stringify(whereConditions, null, 2))

    const books = await prisma.book.findMany({
      where: whereConditions,
      include: {
        category: true
      }
    })

    console.log(`✅ Found ${books.length} books matching criteria:`, {
      categoryType: args.category_type,
      resultCount: books.length,
      bookIds: books.map(b => ({
        id: b.id,
        title: b.title_zh || b.title_en,
        cover_image: b.cover_image
      }))
    })

    // Format the response to explicitly include cover images
    return {
      found: books.length > 0,
      books: books.map(book => ({
        id: book.id,
        title_zh: book.title_zh,
        title_en: book.title_en,
        quantity: book.quantity,
        tags: book.search_tags,
        cover_image: book.cover_image
      })),
      message: books.length > 0 
        ? `Found ${books.length} book(s)` 
        : "No matching books found"
    };
  } catch (error) {
    console.error('❌ Failed to search books:', error)
    throw error
  }
} 