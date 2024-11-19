import { prisma } from '../prisma';
import type { BookAnalysis } from '@/components/admin/ai-chat/types';
import { Prisma } from '@prisma/client';

interface BookCreationData extends BookAnalysis {
  cover_image: string;
  quantity: number;
}

// Define the type to match schema.prisma exactly
type CategoryType = 'PURE_LAND_BOOKS' | 'OTHER_BOOKS' | 'DHARMA_ITEMS' | 'BUDDHA_STATUES';

function getCategoryName(type: CategoryType, language: 'en' | 'zh'): string {
  const categoryNames: Record<CategoryType, { en: string; zh: string }> = {
    'PURE_LAND_BOOKS': {
      en: 'Pure Land Buddhist Books',
      zh: '净土佛书'
    },
    'OTHER_BOOKS': {
      en: 'Other Buddhist Books',
      zh: '其他佛书'
    },
    'DHARMA_ITEMS': {
      en: 'Dharma Items',
      zh: '法宝'
    },
    'BUDDHA_STATUES': {
      en: 'Buddha Statues',
      zh: '佛像'
    }
  };

  return categoryNames[type][language];
}

function validateBookData(data: BookCreationData) {
  const errors: string[] = [];

  if (!data.title_en && !data.title_zh) {
    errors.push('At least one title (English or Chinese) is required');
  }

  if (!data.cover_image) {
    errors.push('Cover image is required');
  }

  if (!data.category_suggestions?.length) {
    errors.push('Category is required');
  }

  return errors;
}

async function getOrCreateCategory(type: CategoryType) {
  // First try to find existing category
  const existingCategory = await prisma.category.findFirst({
    where: { type }
  });

  if (existingCategory) {
    return existingCategory;
  }

  // Only create if doesn't exist
  return await prisma.category.create({
    data: {
      type,
      name_en: getCategoryName(type, 'en'),
      name_zh: getCategoryName(type, 'zh')
    }
  });
}

function mapToCategoryType(categories: string[]): CategoryType {
  // Exact match mapping
  const categoryMap: Record<string, CategoryType> = {
    'Pure Land Buddhist Books (净土佛书)': 'PURE_LAND_BOOKS',
    'Pure Land Buddhist Books': 'PURE_LAND_BOOKS',
    '净土佛书': 'PURE_LAND_BOOKS',
    'Other Buddhist Books (其他佛书)': 'OTHER_BOOKS',
    'Other Buddhist Books': 'OTHER_BOOKS',
    '其他佛书': 'OTHER_BOOKS',
    'Dharma Items (法宝)': 'DHARMA_ITEMS',
    'Dharma Items': 'DHARMA_ITEMS',
    '法宝': 'DHARMA_ITEMS',
    'Buddha Statues (佛像)': 'BUDDHA_STATUES',
    'Buddha Statues': 'BUDDHA_STATUES',
    '佛像': 'BUDDHA_STATUES'
  };

  // Try exact matches first
  for (const category of categories) {
    const type = categoryMap[category.trim()];
    if (type) return type;
  }

  // If no match, check for partial matches
  for (const category of categories) {
    const lowerCategory = category.toLowerCase();
    if (lowerCategory.includes('pure land') || lowerCategory.includes('净土')) {
      return 'PURE_LAND_BOOKS';
    }
  }

  throw new Error('Invalid category. Must be one of the predefined categories.');
}

// Update the interface to include alternatives
interface BookOperationResult {
  success: boolean;
  book?: any;  // The created or existing book
  duplicate?: {
    book: any;
    confidence: number;
    reasons: string[];
    alternatives?: any[];
  };
  error?: string;
}

// Export the function so it can be used in chat route
export async function findPossibleDuplicates(title: string): Promise<{
  exactMatch?: any;
  similarMatches: any[];
}> {
  try {
    console.log('Searching for duplicates with title:', title);
    
    // First check for exact match
    const exactMatch = await prisma.book.findFirst({
      where: {
        OR: [
          { title_zh: { equals: title, mode: 'insensitive' } },
          { title_en: { equals: title, mode: 'insensitive' } }
        ]
      },
      include: {
        category: true
      }
    });

    console.log('Exact match result:', exactMatch);

    // Look for similar titles using fuzzy match
    const similarMatches = await prisma.book.findMany({
      where: {
        AND: [
          {
            OR: [
              { title_zh: { contains: title, mode: 'insensitive' } },
              { title_en: { contains: title, mode: 'insensitive' } },
              { search_tags: { hasSome: title.split(/\s+/) } }
            ]
          },
          {
            id: { not: exactMatch?.id } // Exclude exact match from similar matches
          }
        ]
      },
      include: {
        category: true
      },
      take: 5
    });

    console.log('Similar matches found:', similarMatches.length);

    // Calculate similarity scores
    const matchesWithScores = similarMatches.map(match => {
      const matchTitle = match.title_zh || match.title_en || '';
      const lengthDiff = Math.abs(matchTitle.length - title.length);
      const maxLength = Math.max(matchTitle.length, title.length);
      const similarity = 1 - (lengthDiff / maxLength);
      
      return {
        ...match,
        similarity_score: similarity
      };
    }).filter(match => match.similarity_score > 0.3); // Only return reasonable matches

    console.log('Matches with scores:', matchesWithScores);

    return {
      exactMatch,
      similarMatches: matchesWithScores.sort((a, b) => b.similarity_score - a.similarity_score)
    };

  } catch (error) {
    console.error('Error finding duplicates:', error);
    return { similarMatches: [] };
  }
}

// Modify createBookListing to use enhanced duplicate detection
export async function createBookListing(data: BookCreationData): Promise<BookOperationResult> {
  try {
    const validationErrors = validateBookData(data);
    if (validationErrors.length > 0) {
      return {
        success: false,
        error: `Validation failed: ${validationErrors.join(', ')}`
      };
    }

    // Get category type
    const categoryType = mapToCategoryType(data.category_suggestions);
    
    // Get or create category
    const category = await getOrCreateCategory(categoryType);

    // Create book with proper quantity
    const bookData: Prisma.BookCreateInput = {
      title_en: data.title_en || '',
      title_zh: data.title_zh || '',
      description_en: data.description_en || '',
      description_zh: data.description_zh || '',
      cover_image: data.cover_image,
      quantity: data.quantity || 0, // Ensure quantity is set
      category: {
        connect: {
          id: category.id
        }
      },
      search_tags: data.search_tags || [],
      ai_metadata: {
        extracted_text: data.extracted_text,
        confidence_score: data.confidence_score,
        possible_duplicate: data.possible_duplicate,
        duplicate_reasons: data.duplicate_reasons || [],
        analysis_date: new Date().toISOString()
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

  } catch (error) {
    console.error('Error in createBookListing:', error);
    return {
      success: false,
      error: `Failed to create book listing: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

export async function updateBookQuantity(
  bookId: string,
  newQuantity: number
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

    // Update to exact quantity instead of incrementing
    const updatedBook = await prisma.book.update({
      where: { id: bookId },
      data: {
        quantity: newQuantity
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
    console.error('Error updating book quantity:', error);
    return {
      success: false,
      error: `Failed to update quantity: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

export async function forceCreateBookListing(data: BookCreationData): Promise<BookOperationResult> {
  try {
    console.log('Starting forced book creation with data:', JSON.stringify(data, null, 2));
    
    const validationErrors = validateBookData(data);
    if (validationErrors.length > 0) {
      console.error('Validation errors:', validationErrors);
      return {
        success: false,
        error: `Validation failed: ${validationErrors.join(', ')}`
      };
    }

    // Create category first
    console.log('Creating category...');
    const categoryData = {
      name_en: data.category_suggestions[0],
      name_zh: data.category_suggestions[1] || data.category_suggestions[0],
      type: mapToCategoryType(data.category_suggestions)
    };
    
    const category = await prisma.category.create({
      data: categoryData
    });
    
    // Create the book with the new category
    console.log('Creating book (forced)...');
    const bookData: Prisma.BookCreateInput = {
      title_en: data.title_en || '',
      title_zh: data.title_zh || '',
      description_en: data.description_en,
      description_zh: data.description_zh,
      cover_image: data.cover_image,
      quantity: data.quantity || 0,
      category: {
        connect: {
          id: category.id
        }
      },
      search_tags: data.search_tags,
      ai_metadata: {
        extracted_text: data.extracted_text,
        confidence_score: data.confidence_score,
        possible_duplicate: true, // Mark as known duplicate
        duplicate_reasons: [...(data.duplicate_reasons || []), 'Forced creation of duplicate'],
        analysis_date: new Date().toISOString(),
        force_created: true
      }
    };

    const book = await prisma.book.create({
      data: bookData,
      include: {
        category: true
      }
    });

    console.log('Book created successfully (forced):', book);
    return {
      success: true,
      book
    };

  } catch (error) {
    console.error('Error in forceCreateBookListing:', error);
    return {
      success: false,
      error: `Failed to create book listing: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

export async function updateBookTitle(
  bookId: string,
  newTitle: { title_en?: string; title_zh?: string }
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

    const updatedBook = await prisma.book.update({
      where: { id: bookId },
      data: {
        ...(newTitle.title_en && { title_en: newTitle.title_en }),
        ...(newTitle.title_zh && { title_zh: newTitle.title_zh }),
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
    console.error('Error updating book title:', error);
    return {
      success: false,
      error: `Failed to update title: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}