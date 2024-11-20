import { prisma } from '../prisma';
import { BookAnalysis, BookState } from '../ai/types';
import { CategoryType, Prisma } from '@prisma/client';
import { OpenAI } from 'openai';

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

export const CATEGORY_MAP: Record<string, CategoryType> = {
  'PURE_LAND_BOOKS': CategoryType.PURE_LAND_BOOKS,
  'OTHER_BOOKS': CategoryType.OTHER_BOOKS,
  'DHARMA_ITEMS': CategoryType.DHARMA_ITEMS,
  'BUDDHA_STATUES': CategoryType.BUDDHA_STATUES,
  'Pure Land Books': CategoryType.PURE_LAND_BOOKS,
  'Other Books': CategoryType.OTHER_BOOKS,
  'Dharma Items': CategoryType.DHARMA_ITEMS,
  'Buddha Statues': CategoryType.BUDDHA_STATUES,
  '净土佛书': CategoryType.PURE_LAND_BOOKS,
  '其他佛书': CategoryType.OTHER_BOOKS,
  '法宝': CategoryType.DHARMA_ITEMS,
  '佛像': CategoryType.BUDDHA_STATUES
};

export const CATEGORY_NAMES: Record<CategoryType, { en: string; zh: string }> = {
  [CategoryType.PURE_LAND_BOOKS]: {
    en: 'Pure Land Books',
    zh: '净土佛书'
  },
  [CategoryType.OTHER_BOOKS]: {
    en: 'Other Books',
    zh: '其他佛书'
  },
  [CategoryType.DHARMA_ITEMS]: {
    en: 'Dharma Items',
    zh: '法宝'
  },
  [CategoryType.BUDDHA_STATUES]: {
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
  const categoryType = CATEGORY_MAP[categoryName.trim()];
  return categoryType || CategoryType.OTHER_BOOKS;
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

    // Look for similar titles and tag matches
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
            id: { not: exactMatch?.id } // Exclude exact match from similar results
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
      .filter(match => match.similarity_score > 0.3) // Only return reasonably similar matches
      .sort((a, b) => b.similarity_score - a.similarity_score);

    return {
      exactMatch,
      similarMatches: matchesWithScores
    };
  } catch (error) {
    console.error('Error finding duplicates:', error);
    return { similarMatches: [] };
  }
}

// Helper function to calculate string similarity
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

export async function analyzeDuplicateWithImages(
  newImageUrl: string,
  existingBook: any,
  title: string
): Promise<{
  isDuplicate: boolean;
  confidence: number;
  reasons: string[];
  analysis: string;
}> {
  try {
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    // Send both images to GPT-4V for comparison
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are analyzing two book covers to determine if they are the same book or different editions.
          Focus on:
          - Visual similarities/differences
          - Text content comparison
          - Layout and design elements
          - Edition indicators
          - Publisher marks
          
          The first image is a new upload, the second is an existing book titled: ${title}`
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Compare these two book covers and determine if they are the same book. Explain your reasoning."
            },
            {
              type: "image_url",
              image_url: {
                url: newImageUrl,
                detail: "high"
              }
            },
            {
              type: "image_url",
              image_url: {
                url: existingBook.cover_image,
                detail: "high"
              }
            }
          ]
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0
    });

    const result = JSON.parse(response.choices[0].message.content || '{}');
    
    return {
      isDuplicate: result.isDuplicate || false,
      confidence: result.confidence || 0,
      reasons: result.reasons || [],
      analysis: result.analysis || ''
    };
  } catch (error) {
    console.error('Error analyzing duplicate images:', error);
    return {
      isDuplicate: false,
      confidence: 0,
      reasons: ['Failed to analyze images'],
      analysis: 'Image analysis failed'
    };
  }
}