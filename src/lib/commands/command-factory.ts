import { ChatAPIAction } from '../ai/types';
import { BookCreationState } from '../state/book-creation-state';
import { CreateBookCommand } from './create-book';
import { UpdateBookCommand } from './update-book';
import { QueryDatabaseCommand } from './query-database';
import { BaseCommand } from './base-command';

export class CommandFactory {
  static createCommand(action: ChatAPIAction, state: BookCreationState): BaseCommand {
    console.log('Creating command for action:', action);
    
    if (!state.getState().id && 
        (action === ChatAPIAction.UPDATE_BOOK || 
         action === ChatAPIAction.UPDATE_QUANTITY ||
         action === ChatAPIAction.UPDATE_TITLE ||
         action === ChatAPIAction.UPDATE_DESCRIPTION ||
         action === ChatAPIAction.UPDATE_TAGS ||
         action === ChatAPIAction.UPDATE_CATEGORY)) {
      console.log('Converting UPDATE to CREATE due to missing ID');
      return new CreateBookCommand(state);
    }
    
    switch (action) {
      case ChatAPIAction.CREATE_BOOK:
        return new CreateBookCommand(state);
      case ChatAPIAction.UPDATE_BOOK:
      case ChatAPIAction.UPDATE_QUANTITY:
      case ChatAPIAction.UPDATE_TITLE:
      case ChatAPIAction.UPDATE_DESCRIPTION:
      case ChatAPIAction.UPDATE_TAGS:
      case ChatAPIAction.UPDATE_CATEGORY:
        return new UpdateBookCommand(state);
      case ChatAPIAction.QUERY_DATABASE:
        return new QueryDatabaseCommand(state);
      default:
        throw new Error(`Unsupported action: ${action}`);
    }
  }
} 