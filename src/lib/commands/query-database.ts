import { BaseCommand } from './base-command';
import { ChatResponseData, BookState } from '../ai/types';
import { prisma } from '../prisma';
import { searchBooks, getBookStats } from '../services/book-service';

export class QueryDatabaseCommand extends BaseCommand {
  async execute(data: ChatResponseData): Promise<any> {
    if (!data.queryType) {
      throw new Error('Query type is required');
    }

    console.log('Executing database query:', {
      type: data.queryType,
      searchTerm: data.searchTerm,
      category: data.category
    });

    switch (data.queryType) {
      case 'search':
        if (!data.searchTerm) {
          throw new Error('Search term is required');
        }
        return await searchBooks(data.searchTerm);

      case 'stats':
        return await getBookStats();

      default:
        throw new Error(`Unsupported query type: ${data.queryType}`);
    }
  }
} 