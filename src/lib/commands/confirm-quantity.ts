import { BaseCommand } from './base-command';
import { ChatResponseData, BookState } from '../ai/types';

export class ConfirmQuantityCommand extends BaseCommand {
  async execute(data: ChatResponseData): Promise<BookState> {
    // For confirmation, we just update the state without database changes
    return this.state.updateState({
      quantity: data.quantity || 0
    });
  }
} 