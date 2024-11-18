import { prisma } from '../prisma';
import type { BookAnalysis } from '@/components/admin/ai-chat/types';
import { Prisma } from '@prisma/client';

interface BookCreationData extends BookAnalysis {
  cover_image: string;
  quantity: number;
}

// Define the type to match schema.prisma exactly
type CategoryType = 'PURE_LAND_BOOKS' | 'OTHER_BOOKS' | 'DHARMA_ITEMS' | 'BUDDHA_STATUES';

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

  if (typeof data.quantity !== 'number' || data.quantity < 0) {
    errors.push('Valid quantity is required');
  }

  return errors;
}

function mapToCategoryType(categories: string[]): CategoryType {
  const categoryMap: Record<string, CategoryType> = {
    'Pure Land Buddhist Books': 'PURE_LAND_BOOKS',
    '净土佛书': 'PURE_LAND_BOOKS',
    'Other Buddhist Books': 'OTHER_BOOKS',
    '其他佛书': 'OTHER_BOOKS',
    'Dharma Items': 'DHARMA_ITEMS',
    '法宝': 'DHARMA_ITEMS',
    'Buddha Statues': 'BUDDHA_STATUES',
    '佛像': 'BUDDHA_STATUES'
  };

  for (const suggestion of categories) {
    const type = categoryMap[suggestion];
    if (type) return type;
  }

  return 'OTHER_BOOKS';
}

export async function createBookListing(data: BookCreationData) {
  try {
    console.log('Starting book creation process with data:', JSON.stringify(data, null, 2));
    
    const validationErrors = validateBookData(data);
    if (validationErrors.length > 0) {
      console.error('Validation errors:', validationErrors);
      throw new Error(`Validation failed: ${validationErrors.join(', ')}`);
    }

    // Check for duplicates
    const duplicate = await prisma.book.findFirst({
      where: {
        OR: [
          ...(data.title_en ? [{ title_en: data.title_en }] : []),
          ...(data.title_zh ? [{ title_zh: data.title_zh }] : [])
        ]
      }
    });

    if (duplicate) {
      console.error('Duplicate book found:', duplicate);
      throw new Error('A book with this title already exists');
    }

    // Create category first using Prisma's create instead of raw query
    console.log('Creating category...');
    const categoryData = {
      name_en: data.category_suggestions[0],
      name_zh: data.category_suggestions[1] || data.category_suggestions[0],
      type: mapToCategoryType(data.category_suggestions)
    };

    console.log('Category data:', categoryData);
    
    const category = await prisma.category.create({
      data: categoryData
    });
    
    console.log('Category created:', category);

    // Create the book with the new category
    console.log('Creating book...');
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
        possible_duplicate: data.possible_duplicate,
        duplicate_reasons: data.duplicate_reasons || [],
        analysis_date: new Date().toISOString()
      }
    };

    console.log('Book data prepared:', bookData);

    const book = await prisma.book.create({
      data: bookData,
      include: {
        category: true
      }
    });

    console.log('Book created successfully:', book);
    return book;

  } catch (error) {
    console.error('Error in createBookListing:', error);
    throw new Error(
      `Failed to create book listing: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}