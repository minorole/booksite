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

    // Get current book to merge with existing tags
    const existingBook = await prisma.book.findUnique({
      where: { id: currentState.id }
    });

    if (!existingBook) {
      throw new Error('Book not found');
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

    // Handle tag updates
    if (data.search_tags && Array.isArray(data.search_tags)) {
      const newTags = data.search_tags;
      const existingTags = existingBook.search_tags || [];
      updateData.search_tags = {
        set: [...new Set([...existingTags, ...newTags])]
      };
    }

    if (typeof data.quantity === 'number') {
      updateData.quantity = data.quantity;
    }

    // Handle category update
    if (data.category) {
      const category = await prisma.category.findFirst({
        where: { type: data.category as CategoryType }
      });

      if (!category) {
        throw new Error(`Category ${data.category} not found`);
      }

      updateData.category = {
        connect: { id: category.id }
      };
    }

    console.log('Updating book with data:', {
      ...updateData,
      id: currentState.id
    });

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