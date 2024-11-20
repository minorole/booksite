import { BaseCommand } from './base-command';
import { ChatResponseData, BookState } from '../ai/types';
import { prisma } from '../prisma';
import { CategoryType, Prisma } from '@prisma/client';

function mapToCategoryToEnum(categoryName: string): CategoryType {
  switch (categoryName.toUpperCase()) {
    case 'PURE_LAND_BOOKS':
    case '净土佛书':
      return 'PURE_LAND_BOOKS';
    case 'OTHER_BOOKS':
    case '其他佛书':
      return 'OTHER_BOOKS';
    case 'DHARMA_ITEMS':
    case '法宝':
      return 'DHARMA_ITEMS';
    case 'BUDDHA_STATUES':
    case '佛像':
      return 'BUDDHA_STATUES';
    default:
      return 'OTHER_BOOKS';
  }
}

export class CreateBookCommand extends BaseCommand {
  async execute(data: ChatResponseData): Promise<BookState> {
    const currentState = this.state.getState();

    // Validate required fields
    if (!currentState.title_en && !currentState.title_zh) {
      throw new Error('At least one title (English or Chinese) is required');
    }

    if (!currentState.cover_image) {
      throw new Error('Cover image is required');
    }

    // Get or create category
    const categoryType = mapToCategoryToEnum(
      data.category || 'OTHER_BOOKS'
    );
    
    const category = await prisma.category.findFirst({
      where: {
        type: categoryType
      }
    });

    if (!category) {
      throw new Error(`Category ${categoryType} not found. Please run database seeds first.`);
    }

    // Create book with all current state data
    const bookData: Prisma.BookCreateInput = {
      title_en: currentState.title_en || '',
      title_zh: currentState.title_zh || '',
      description_en: currentState.description_en || '',
      description_zh: currentState.description_zh || '',
      cover_image: currentState.cover_image,
      quantity: data.quantity || 0,
      category: {
        connect: { id: category.id }
      },
      search_tags: currentState.search_tags || [],
      ai_metadata: {
        extracted_text: currentState.extracted_text,
        confidence_score: currentState.confidence_score,
        possible_duplicate: currentState.possible_duplicate,
        duplicate_reasons: currentState.duplicate_reasons || [],
        analysis_date: new Date().toISOString()
      }
    };

    const book = await prisma.book.create({
      data: bookData,
      include: {
        category: true
      }
    });

    return this.state.updateState(book);
  }
} 