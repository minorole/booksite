import { prisma } from '../prisma';
import { BookAnalysis, BookState } from '../ai/types';
import { CategoryType, Prisma } from '@prisma/client';
import { openai } from '../openai';
import { SYSTEM_PROMPTS } from '../ai/prompts';
import { AI_CONSTANTS } from '../constants/ai';
import { mapToCategoryType, CATEGORY_NAMES } from '../constants/categories';

interface BookCreationData extends BookState {
  cover_image: string;
  quantity: number;
}

interface BookOperationResult {
  success: boolean;
  book?: any;
  duplicate?: {
    book: any;
    confidence: number;
    reasons: string[];
    alternatives?: any[];
  };
  error?: string;
}

function validateBookData(data: BookCreationData) {
  const errors: string[] = [];

  if (!data.title_en && !data.title_zh) {
    errors.push('At least one title (English or Chinese) is required');
  }

  if (!data.cover_image) {
    errors.push('Cover image is required');
  }

  return errors;
}

async function getCategory(type: CategoryType) {
  return await prisma.category.findFirst({
    where: { type }
  });
}

export async function updateBookCategory(
  bookId: string, 
  categoryType: CategoryType
): Promise<BookOperationResult> {
  try {
    const category = await prisma.category.findFirst({
      where: { type: categoryType }
    });

    if (!category) {
      return {
        success: false,
        error: `Category ${categoryType} not found`
      };
    }

    const updatedBook = await prisma.book.update({
      where: { id: bookId },
      data: {
        category: {
          connect: { id: category.id }
        }
      },
      include: {
        category: true
      }
    });

    return {
      success: true,
      book: updatedBook
    };
  } catch (error) {
    console.error('Error updating book category:', error);
    return {
      success: false,
      error: `Failed to update category: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

async function createBookWithData(
  data: BookCreationData, 
  categoryType: CategoryType,
  isForced: boolean = false
): Promise<BookOperationResult> {
  const category = await getCategory(categoryType);
  if (!category) {
    return {
      success: false,
      error: 'Invalid category'
    };
  }

  const bookData: Prisma.BookCreateInput = {
    title_en: data.title_en || '',
    title_zh: data.title_zh || '',
    description_en: data.description_en || '',
    description_zh: data.description_zh || '',
    cover_image: data.cover_image,
    quantity: data.quantity || 0,
    category: {
      connect: { id: category.id }
    },
    search_tags: data.search_tags || [],
    ai_metadata: {
      extracted_text: data.extracted_text,
      confidence_scores: data.confidence_scores,
      possible_duplicate: isForced,
      duplicate_reasons: [
        ...(data.duplicate_reasons || []),
        ...(isForced ? ['Forced creation of duplicate'] : [])
      ],
      analysis_date: new Date().toISOString(),
      force_created: isForced
    }
  };

  const book = await prisma.book.create({
    data: bookData,
    include: {
      category: true
    }
  });

  return {
    success: true,
    book
  };
}

export async function createBookListing(data: BookCreationData): Promise<BookOperationResult> {
  try {
    const validationErrors = validateBookData(data);
    if (validationErrors.length > 0) {
      return {
        success: false,
        error: `Validation failed: ${validationErrors.join(', ')}`
      };
    }

    const categoryType = mapToCategoryType(
      Array.isArray(data.category_suggestions) 
        ? data.category_suggestions[0] 
        : 'Other Buddhist Books (其他佛书)'
    );

    return await createBookWithData(data, categoryType);
  } catch (error) {
    console.error('Error in createBookListing:', error);
    return {
      success: false,
      error: `Failed to create book listing: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

export async function forceCreateBookListing(data: BookCreationData): Promise<BookOperationResult> {
  try {
    const validationErrors = validateBookData(data);
    if (validationErrors.length > 0) {
      return {
        success: false,
        error: `Validation failed: ${validationErrors.join(', ')}`
      };
    }

    const categoryType = mapToCategoryType(
      Array.isArray(data.category_suggestions) 
        ? data.category_suggestions[0] 
        : 'Other Buddhist Books (其他佛书)'
    );

    return await createBookWithData(data, categoryType, true);
  } catch (error) {
    console.error('Error in forceCreateBookListing:', error);
    return {
      success: false,
      error: `Failed to create book listing: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

export async function getBookStats() {
  try {
    const [totalBooks, categoryCounts] = await Promise.all([
      prisma.book.count(),
      prisma.book.groupBy({
        by: ['category_id'],
        _count: true,
        _sum: {
          quantity: true
        }
      })
    ]);

    const categoriesWithNames = await prisma.category.findMany({
      where: {
        id: {
          in: categoryCounts.map(c => c.category_id)
        }
      }
    });

    return {
      totalBooks,
      categoryCounts,
      categoriesWithNames
    };
  } catch (error) {
    console.error('Error getting book stats:', error);
    throw error;
  }
}

export async function searchBooks(query: string) {
  try {
    return await prisma.book.findMany({
      where: {
        OR: [
          { title_en: { contains: query, mode: 'insensitive' } },
          { title_zh: { contains: query, mode: 'insensitive' } },
          { description_en: { contains: query, mode: 'insensitive' } },
          { description_zh: { contains: query, mode: 'insensitive' } },
          { search_tags: { hasSome: [query] } }
        ]
      },
      include: {
        category: true
      },
      take: 5
    });
  } catch (error) {
    console.error('Error searching books:', error);
    throw error;
  }
}

export async function updateBookQuantity(
  bookId: string,
  quantity: number,
  adminEmail: string
): Promise<BookOperationResult> {
  try {
    const book = await prisma.book.findUnique({
      where: { id: bookId },
      include: { category: true }
    });

    if (!book) {
      return {
        success: false,
        error: 'Book not found'
      };
    }

    // Validate quantity
    if (quantity < 0) {
      return {
        success: false,
        error: 'Quantity cannot be negative'
      };
    }

    // Update book
    const updatedBook = await prisma.book.update({
      where: { id: bookId },
      data: { quantity },
      include: { category: true }
    });

    // Create audit log
    await prisma.adminLog.create({
      data: {
        action: 'EDIT_BOOK',
        book_id: bookId,
        book_title: book.title_zh || book.title_en,
        admin_email: adminEmail,
        metadata: {
          previous_quantity: book.quantity,
          new_quantity: quantity,
          update_type: 'quantity_update',
          timestamp: new Date().toISOString()
        }
      }
    });

    return {
      success: true,
      book: updatedBook
    };
  } catch (error) {
    console.error('Error updating book quantity:', error);
    return {
      success: false,
      error: `Failed to update quantity: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}