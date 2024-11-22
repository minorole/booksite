import { BookState, ChatMessage, ChatResponseData } from '../ai/types';
import { CategoryType } from '@prisma/client';

interface BookStateInitialization extends Partial<BookState> {
  imageUrl?: string;
}

export interface StateUpdates extends Partial<BookState> {
  imageUrl?: string;
}

export class BookCreationState {
  private state: BookState;
  private history: ChatMessage[];

  constructor(initialState?: BookStateInitialization) {
    // Initialize state with cover image if provided
    const cover_image = initialState?.cover_image || initialState?.imageUrl || null;
    
    this.state = {
      id: undefined,
      title_en: null,
      title_zh: null,
      description_en: '',
      description_zh: '',
      cover_image,
      quantity: 0,
      search_tags: [],
      category_suggestions: [],
      extracted_text: {
        raw_text: '',
        positions: {
          title: '',
          other: []
        }
      },
      confidence_scores: {
        title: 0,
        language_detection: 0
      },
      possible_duplicate: false,
      duplicate_reasons: [],
      ...initialState
    };
    this.history = [];
    
    console.log('BookCreationState initialized:', {
      cover_image: this.state.cover_image,
      title_zh: this.state.title_zh,
      title_en: this.state.title_en
    });
  }

  updateState(updates: StateUpdates | ChatResponseData): BookState {
    const validUpdates: Partial<BookState> = {};
    const currentState = this.getState();

    // Only reset state if this is a new image upload
    if ('cover_image' in updates || 'imageUrl' in updates) {
      const newImage = (updates as StateUpdates).cover_image || (updates as StateUpdates).imageUrl;
      if (newImage && newImage !== currentState.cover_image) {
        this.reset();
        validUpdates.cover_image = newImage;
        console.log('New image uploaded, state reset with new cover_image:', newImage);
      }
    }

    // Update fields while preserving existing data
    if ('quantity' in updates) {
      validUpdates.quantity = updates.quantity as number;
    }
    if ('title_en' in updates) {
      validUpdates.title_en = updates.title_en as string;
    }
    if ('title_zh' in updates) {
      validUpdates.title_zh = updates.title_zh as string;
    }
    if ('description_en' in updates) {
      validUpdates.description_en = updates.description_en as string;
    }
    if ('description_zh' in updates) {
      validUpdates.description_zh = updates.description_zh as string;
    }

    // Handle extracted text
    if ('extracted_text' in updates) {
      if (typeof updates.extracted_text === 'string') {
        validUpdates.extracted_text = {
          raw_text: updates.extracted_text,
          positions: { title: '', other: [] }
        };
      } else if (updates.extracted_text && typeof updates.extracted_text === 'object') {
        validUpdates.extracted_text = updates.extracted_text;
      }
    }

    // Handle confidence scores
    if ('confidence_scores' in updates) {
      validUpdates.confidence_scores = updates.confidence_scores;
    }

    // Handle search tags with deduplication
    if ('search_tags' in updates && Array.isArray(updates.search_tags)) {
      validUpdates.search_tags = [...new Set([
        ...(this.state.search_tags || []),
        ...updates.search_tags
      ])];
    }

    // Handle category suggestions
    if ('category_suggestions' in updates && Array.isArray(updates.category_suggestions)) {
      validUpdates.category_suggestions = updates.category_suggestions;
    }

    // Handle category
    if ('category' in updates && updates.category) {
      if (typeof updates.category === 'string') {
        validUpdates.category = {
          id: '',
          name_en: updates.category,
          name_zh: updates.category,
          type: updates.category as CategoryType
        };
      } else {
        validUpdates.category = updates.category;
      }
    }

    // Update state while preserving existing data
    this.state = {
      ...currentState, // Keep existing data
      ...validUpdates, // Apply updates
      cover_image: validUpdates.cover_image || currentState.cover_image // Ensure cover_image is preserved
    };

    console.log('State updated:', {
      cover_image: this.state.cover_image,
      title_zh: this.state.title_zh,
      title_en: this.state.title_en,
      quantity: this.state.quantity
    });

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
      extracted_text: {
        raw_text: '',
        positions: {
          title: '',
          other: []
        }
      },
      confidence_scores: {
        title: 0,
        language_detection: 0
      },
      possible_duplicate: false,
      duplicate_reasons: []
    };
    this.history = [];
  }
} 