import { BookState, ChatResponseData, AssistantResponse } from '../ai/types';
import { BookCreationState } from '../state/book-creation-state';

export abstract class BaseCommand {
  protected state: BookCreationState;

  constructor(state: BookCreationState) {
    this.state = state;
  }

  abstract execute(data: ChatResponseData): Promise<BookState>;
} 