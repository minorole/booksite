import { BookState, ChatMessage } from '../ai/types';

export class BookCreationState {
  private state: BookState;
  private history: ChatMessage[];

  constructor(initialState?: Partial<BookState>) {
    this.state = {
      id: undefined,
      title_en: null,
      title_zh: null,
      description_en: '',
      description_zh: '',
      cover_image: null,
      quantity: 0,
      search_tags: [],
      category_suggestions: [],
      extracted_text: '',
      confidence_score: 0,
      possible_duplicate: false,
      duplicate_reasons: [],
      ...initialState
    };
    this.history = [];
  }

  updateState(updates: Partial<BookState>): BookState {
    if (updates.search_tags) {
      updates.search_tags = [...new Set([
        ...(this.state.search_tags || []),
        ...updates.search_tags
      ])];
    }

    if (updates.category_id && !updates.category_suggestions) {
      updates.category_suggestions = this.state.category_suggestions;
    }

    this.state = {
      ...this.state,
      ...updates,
    };

    return { ...this.state };
  }

  addMessage(message: ChatMessage) {
    this.history.push(message);
    
    if (message.bookData) {
      this.updateState(message.bookData);
    }
  }

  getState(): BookState {
    return { ...this.state };
  }

  getHistory(): ChatMessage[] {
    return [...this.history];
  }

  reset() {
    this.state = {
      id: undefined,
      title_en: null,
      title_zh: null,
      description_en: '',
      description_zh: '',
      cover_image: null,
      quantity: 0,
      search_tags: [],
      category_suggestions: [],
      extracted_text: '',
      confidence_score: 0,
      possible_duplicate: false,
      duplicate_reasons: []
    };
    this.history = [];
  }
} 