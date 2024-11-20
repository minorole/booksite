import { BaseCommand } from './base-command';
import { ChatResponseData, BookState } from '../ai/types';
import { prisma } from '../prisma';
import { CategoryType, Prisma } from '@prisma/client';
import { CATEGORY_MAP } from '../services/book-service';

export class UpdateBookCommand extends BaseCommand {
  async execute(data: ChatResponseData): Promise<BookState> {
    const currentState = this.state.getState();
    
    if (!currentState.id) {
      throw new Error('No book ID found for update');
    }

    // Prepare update data
    const updateData: Prisma.BookUpdateInput = {};

    // Handle different update types based on data
    if (data.title_en || data.title_zh) {
      if (data.title_en) updateData.title_en = data.title_en;
      if (data.title_zh) updateData.title_zh = data.title_zh;
    }

    if (data.description_en || data.description_zh) {
      if (data.description_en) updateData.description_en = data.description_en;
      if (data.description_zh) updateData.description_zh = data.description_zh;
    }

    if (data.search_tags) {
      updateData.search_tags = [...new Set([
        ...(currentState.search_tags || []),
        ...data.search_tags
      ])];
    }

    if (typeof data.quantity === 'number') {
      updateData.quantity = data.quantity;
    }

    if (data.category) {
      // Map the category name to enum value
      const categoryType = CATEGORY_MAP[data.category] || 'OTHER_BOOKS';
      const category = await prisma.category.findFirst({
        where: { type: categoryType }
      });
      if (category) {
        updateData.category = {
          connect: { id: category.id }
        };
      }
    }

    // Perform update
    const updatedBook = await prisma.book.update({
      where: { id: currentState.id },
      data: updateData,
      include: {
        category: true
      }
    });

    // Update state with new data
    return this.state.updateState(updatedBook);
  }
} 