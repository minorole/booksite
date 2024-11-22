import { BaseCommand } from './base-command';
import { ChatResponseData, BookState } from '../ai/types';
import { prisma } from '../prisma';
import { CategoryType, Prisma } from '@prisma/client';
import { mapToCategoryType } from '../constants/categories';

export class UpdateBookCommand extends BaseCommand {
  async execute(data: ChatResponseData): Promise<BookState> {
    const currentState = this.state.getState();
    
    if (!currentState.id) {
      throw new Error('No book ID found for update');
    }

    console.log('Updating book:', {
      id: currentState.id,
      currentState,
      updateData: data
    });

    // Get current book to merge with existing data
    const existingBook = await prisma.book.findUnique({
      where: { id: currentState.id },
      include: { category: true }
    });

    if (!existingBook) {
      throw new Error('Book not found');
    }

    // Prepare update data
    const updateData: Prisma.BookUpdateInput = {};

    // Handle quantity update with validation
    if (typeof data.quantity === 'number') {
      if (data.quantity < 0) {
        throw new Error('Quantity cannot be negative');
      }
      updateData.quantity = data.quantity;
      console.log(`Updating quantity from ${existingBook.quantity} to ${data.quantity}`);
    }

    // Handle title updates
    if (data.title_en !== undefined) updateData.title_en = data.title_en;
    if (data.title_zh !== undefined) updateData.title_zh = data.title_zh;

    // Handle description updates
    if (data.description_en !== undefined) updateData.description_en = data.description_en;
    if (data.description_zh !== undefined) updateData.description_zh = data.description_zh;

    // Handle tag updates - merge with existing tags
    if (data.search_tags && Array.isArray(data.search_tags)) {
      const existingTags = existingBook.search_tags || [];
      updateData.search_tags = {
        set: [...new Set([...existingTags, ...data.search_tags])]
      };
    }

    // Handle category update
    if (data.category) {
      const categoryType = mapToCategoryType(data.category);
      const category = await prisma.category.findFirst({
        where: { type: categoryType }
      });

      if (!category) {
        throw new Error(`Category ${data.category} not found`);
      }

      updateData.category = {
        connect: { id: category.id }
      };
    }

    // Create metadata for admin log
    const metadataForLog = {
      previous_state: {
        quantity: existingBook.quantity,
        category: existingBook.category?.type,
        title_en: existingBook.title_en,
        title_zh: existingBook.title_zh
      },
      update_data: {
        quantity: updateData.quantity,
        title_en: updateData.title_en,
        title_zh: updateData.title_zh,
        description_en: updateData.description_en,
        description_zh: updateData.description_zh,
        search_tags: Array.isArray(updateData.search_tags) 
          ? updateData.search_tags 
          : updateData.search_tags?.set || [],
        category: data.category
      },
      timestamp: new Date().toISOString()
    };

    // Create admin log entry
    await prisma.adminLog.create({
      data: {
        action: 'EDIT_BOOK',
        book_id: currentState.id,
        book_title: existingBook.title_zh || existingBook.title_en,
        admin_email: 'system', // TODO: Pass admin email through context
        metadata: metadataForLog as any // Type assertion needed due to Prisma JSON handling
      }
    });

    // Perform update
    const updatedBook = await prisma.book.update({
      where: { id: currentState.id },
      data: updateData,
      include: {
        category: true
      }
    });

    console.log('Book updated successfully:', updatedBook);

    // Update state with new data
    return this.state.updateState(updatedBook);
  }
} 