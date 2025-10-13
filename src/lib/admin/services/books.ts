import { createBookDb, logAdminAction, searchBooksDb, updateBookDb } from '@/lib/db/admin'
import { isValidUUID, handleOperationError } from './utils'
import { type AdminOperationResult, type BookCreate, type BookUpdate, type BookSearch } from '@/lib/admin/types'

export async function createBook(args: BookCreate, adminEmail: string): Promise<AdminOperationResult> {
  try {
    const book = await createBookDb(args)
    await logAdminAction({
      action: 'CREATE_BOOK',
      admin_email: adminEmail,
      book_title: args.title_en || args.title_zh,
      metadata: {
        title_zh: args.title_zh,
        title_en: args.title_en,
        category_type: args.category_type,
        quantity: args.quantity,
        tags: args.tags,
        cover_image: args.cover_image,
        ai_analysis: args.analysis_result ? true : false,
      },
    })

    return { success: true, message: 'Book created successfully', data: { book } }
  } catch (error) {
    return handleOperationError(error, 'create book')
  }
}

export async function updateBook(args: BookUpdate, adminEmail: string): Promise<AdminOperationResult> {
  try {
    if (!isValidUUID(args.book_id)) {
      return {
        success: false,
        message: 'Invalid book ID format',
        error: { code: 'validation_error', details: 'invalid_uuid' },
      }
    }

    const updatedBook = await updateBookDb(args.book_id, args)
    await logAdminAction({
      action: 'EDIT_BOOK',
      book_id: args.book_id,
      book_title: updatedBook.title_zh,
      admin_email: adminEmail,
      metadata: {
        changes: {
          title_zh: args.title_zh,
          title_en: args.title_en,
          quantity: args.quantity,
          tags: args.tags,
          category_type: args.category_type,
        },
      },
    })

    return { success: true, message: 'Book updated successfully', data: { book: updatedBook } }
  } catch (error) {
    return handleOperationError(error, 'update book')
  }
}

export async function searchBooks(args: BookSearch): Promise<AdminOperationResult> {
  try {
    const books = await searchBooksDb(args)
    return {
      success: true,
      message: `Found ${books.length} book(s)`,
      data: { search: { found: books.length > 0, books } },
    }
  } catch (error) {
    return handleOperationError(error, 'search books')
  }
}

