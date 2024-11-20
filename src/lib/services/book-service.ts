import { prisma } from '../prisma';
import { BookAnalysis, BookState } from '../ai/types';
import { CategoryType, Prisma } from '@prisma/client';

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

const CATEGORY_MAP: Record<string, CategoryType> = {
  'Pure Land Buddhist Books (净土佛书)': 'PURE_LAND_BOOKS',
  'Other Buddhist Books (其他佛书)': 'OTHER_BOOKS',
  'Dharma Items (法宝)': 'DHARMA_ITEMS',
  'Buddha Statues (佛像)': 'BUDDHA_STATUES',
  '净土佛书': 'PURE_LAND_BOOKS',
  '其他佛书': 'OTHER_BOOKS',
  '法宝': 'DHARMA_ITEMS',
  '佛像': 'BUDDHA_STATUES'
};

const CATEGORY_NAMES: Record<CategoryType, { en: string; zh: string }> = {
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

function mapToCategoryType(categoryName: string): CategoryType {
  return CATEGORY_MAP[categoryName.trim()] || 'OTHER_BOOKS';
}

export async function findPossibleDuplicates(title: string): Promise<{
  exactMatch?: any;
  similarMatches: any[];
}> {
  try {
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

    // Look for similar titles
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
            id: { not: exactMatch?.id }
          }
        ]
      },
      include: {
        category: true
      },
      take: 5
    });

    // Calculate similarity scores
    const matchesWithScores = similarMatches
      .map(match => ({
        ...match,
        similarity_score: calculateSimilarity(title, match.title_zh || match.title_en || '')
      }))
      .filter(match => match.similarity_score > 0.3)
      .sort((a, b) => b.similarity_score - a.similarity_score);

    return { exactMatch, similarMatches: matchesWithScores };
  } catch (error) {
    console.error('Error finding duplicates:', error);
    return { similarMatches: [] };
  }
}

function calculateSimilarity(str1: string, str2: string): number {
  const lengthDiff = Math.abs(str1.length - str2.length);
  const maxLength = Math.max(str1.length, str2.length);
  return 1 - (lengthDiff / maxLength);
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
      confidence_score: data.confidence_score,
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

export { CATEGORY_MAP, CATEGORY_NAMES };