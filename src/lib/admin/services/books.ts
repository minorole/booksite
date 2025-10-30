import { createBookDb, logAdminAction, searchBooksDb, updateBookDb, getBookDb } from '@/lib/db/admin'
import { createTextEmbedding } from '@/lib/openai/embeddings'
import { upsertBookTextEmbedding } from '@/lib/db/admin/embeddings'
import { buildQueryTextForEmbedding } from './embeddings'
import { createImageEmbeddingClip } from '@/lib/admin/services/image-embeddings/openclip'
import { upsertBookImageEmbeddingClip } from '@/lib/db/admin/image-embeddings'
import { isValidUUID, handleOperationError } from './utils'
import { type AdminOperationResult, type BookCreate, type BookUpdate, type BookSearch } from '@/lib/admin/types'

export async function createBook(args: BookCreate, adminEmail: string): Promise<AdminOperationResult> {
  try {
    const book = await createBookDb(args)
    // Fire-and-forget embedding upsert (best effort)
    try {
      const text = buildQueryTextForEmbedding({
        title_zh: args.title_zh,
        title_en: args.title_en ?? null,
        author_zh: args.author_zh ?? null,
        author_en: args.author_en ?? null,
        publisher_zh: args.publisher_zh ?? null,
        publisher_en: args.publisher_en ?? null,
        tags: args.tags ?? [],
      })
      if (text.trim()) {
        const vec = await createTextEmbedding(text)
        await upsertBookTextEmbedding(book.id, vec)
      }
    } catch {}
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

    // Image embedding upsert (required when cover present)
    if (args.cover_image) {
      const ivec = await createImageEmbeddingClip(args.cover_image)
      await upsertBookImageEmbeddingClip(book.id!, ivec)
    }

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
    // Best-effort embedding refresh based on updated fields
    try {
      const text = buildQueryTextForEmbedding({
        title_zh: typeof args.title_zh === 'string' ? args.title_zh : updatedBook.title_zh,
        title_en: args.title_en !== undefined ? args.title_en : updatedBook.title_en ?? null,
        // Include authors/publishers when provided
        author_zh: args.author_zh ?? null,
        author_en: args.author_en ?? null,
        publisher_zh: args.publisher_zh ?? null,
        publisher_en: args.publisher_en ?? null,
        tags: args.tags ?? undefined,
      })
      if (text.trim()) {
        const vec = await createTextEmbedding(text)
        await upsertBookTextEmbedding(args.book_id, vec)
      }
    } catch {}
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

    // Image embedding refresh when cover_image is updated (required)
    {
      const newCover = (args as any).cover_image as string | undefined
      if (newCover) {
        const ivec = await createImageEmbeddingClip(newCover)
        await upsertBookImageEmbeddingClip(args.book_id, ivec)
      }
    }

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

export async function adjustBookQuantity(
  args: { book_id: string; delta: number },
  adminEmail: string
): Promise<AdminOperationResult> {
  try {
    if (!isValidUUID(args.book_id)) {
      return {
        success: false,
        message: 'Invalid book ID format',
        error: { code: 'validation_error', details: 'invalid_uuid' },
      }
    }

    const current = await getBookDb(args.book_id)
    if (!current) {
      return { success: false, message: 'Book not found', error: { code: 'not_found', details: args.book_id } }
    }

    const nextQty = Math.max(0, current.quantity + args.delta)
    const updated = await updateBookDb(args.book_id, { quantity: nextQty })

    await logAdminAction({
      action: 'UPDATE_QUANTITY',
      admin_email: adminEmail,
      book_id: args.book_id,
      book_title: updated.title_zh,
      metadata: { previous_quantity: current.quantity, delta: args.delta, new_quantity: nextQty },
    })

    return { success: true, message: 'Quantity updated', data: { book: updated } }
  } catch (error) {
    return handleOperationError(error, 'adjust book quantity')
  }
}
