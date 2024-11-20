import { ChatAPIAction } from '../ai/types';
import { BookCreationState } from '../state/book-creation-state';
import { CreateBookCommand } from './create-book';
import { UpdateBookCommand } from './update-book';
import { BaseCommand } from './base-command';

export class CommandFactory {
  static createCommand(action: ChatAPIAction, state: BookCreationState): BaseCommand {
    const currentState = state.getState();
    const isNewBook = !currentState.id;

    if (isNewBook && action === 'CREATE_BOOK') {
      return new CreateBookCommand(state);
    }

    // All other actions use UpdateBookCommand
    return new UpdateBookCommand(state);
  }
} 