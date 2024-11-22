import { BaseCommand } from './base-command';
import { ChatResponseData, BookState } from '../ai/types';
import { prisma } from '../prisma';
import { Prisma } from '@prisma/client';
import { mapToCategoryType } from '../constants/categories';

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

    // Get or create category using the centralized mapping
    const categoryType = mapToCategoryType(data.category || 'OTHER_BOOKS');
    
    const category = await prisma.category.findFirst({
      where: { type: categoryType }
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
      search_tags: data.search_tags || currentState.search_tags || [],
      ai_metadata: {
        extracted_text: currentState.extracted_text,
        confidence_scores: currentState.confidence_scores,
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

    // Make sure to update state with the new book ID
    return this.state.updateState({
      ...book,
      id: book.id // Explicitly set the ID
    });
  }
} 