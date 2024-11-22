import { BookState, ChatMessage, ChatResponseData } from '../ai/types';
import { CategoryType } from '@prisma/client';

export interface StateUpdates extends Partial<BookState> {
  imageUrl?: string;
}

export class BookCreationState {
  private static instance: BookCreationState | null = null;
  private state: BookState;
  private history: ChatMessage[];
  private currentImageUrl: string | null = null;

  private constructor(initialState?: Partial<BookState>) {
    this.state = {
      id: initialState?.id,
      title_en: initialState?.title_en || null,
      title_zh: initialState?.title_zh || null,
      description_en: initialState?.description_en || '',
      description_zh: initialState?.description_zh || '',
      cover_image: initialState?.cover_image || null,
      quantity: initialState?.quantity || 0,
      search_tags: initialState?.search_tags || [],
      category_suggestions: initialState?.category_suggestions || [],
      extracted_text: initialState?.extracted_text || {
        raw_text: '',
        positions: { title: '', other: [] }
      },
      confidence_scores: initialState?.confidence_scores || {
        title: 0,
        language_detection: 0
      },
      possible_duplicate: initialState?.possible_duplicate || false,
      duplicate_reasons: initialState?.duplicate_reasons || [],
      category: initialState?.category
    };
    this.history = [];
  }

  static getInstance(initialState?: Partial<BookState>): BookCreationState {
    console.log('BookCreationState.getInstance called with:', {
      hasInstance: !!BookCreationState.instance,
      initialState: initialState ? {
        id: initialState.id,
        title_zh: initialState.title_zh,
        cover_image: initialState.cover_image
      } : null
    });

    if (!BookCreationState.instance) {
      BookCreationState.instance = new BookCreationState(initialState);
    }
    return BookCreationState.instance;
  }

  setCurrentImage(url: string) {
    console.log('Setting current image:', { url });
    this.currentImageUrl = url;
    this.updateState({
      cover_image: url
    });
  }

  getCurrentImage(): string | null {
    return this.currentImageUrl;
  }

  updateState(updates: StateUpdates | ChatResponseData): BookState {
    console.log('Updating state with:', {
      currentId: this.state.id,
      updates: {
        id: 'id' in updates ? updates.id : undefined,
        title_zh: 'title_zh' in updates ? updates.title_zh : undefined,
        cover_image: 'cover_image' in updates ? updates.cover_image : undefined,
        imageUrl: 'imageUrl' in updates ? updates.imageUrl : undefined
      }
    });

    const validUpdates: Partial<BookState> = {};
    
    // Keep existing ID if present
    if ('id' in updates) {
      validUpdates.id = updates.id;
    }

    // Handle image updates
    if ('cover_image' in updates && updates.cover_image !== undefined) {
      validUpdates.cover_image = updates.cover_image;
      this.currentImageUrl = updates.cover_image;
    } else if ('imageUrl' in updates && updates.imageUrl) {
      validUpdates.cover_image = updates.imageUrl;
      this.currentImageUrl = updates.imageUrl;
    }

    // Handle other fields
    if ('title_en' in updates) validUpdates.title_en = updates.title_en;
    if ('title_zh' in updates) validUpdates.title_zh = updates.title_zh;
    if ('description_en' in updates) validUpdates.description_en = updates.description_en;
    if ('description_zh' in updates) validUpdates.description_zh = updates.description_zh;
    if ('quantity' in updates) validUpdates.quantity = updates.quantity;
    if ('search_tags' in updates) validUpdates.search_tags = updates.search_tags;
    if ('category_suggestions' in updates) validUpdates.category_suggestions = updates.category_suggestions;
    if ('extracted_text' in updates) validUpdates.extracted_text = updates.extracted_text;
    if ('confidence_scores' in updates) validUpdates.confidence_scores = updates.confidence_scores;
    if ('possible_duplicate' in updates) validUpdates.possible_duplicate = updates.possible_duplicate;
    if ('duplicate_reasons' in updates) validUpdates.duplicate_reasons = updates.duplicate_reasons;

    // Handle category updates
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

    this.state = {
      ...this.state,
      ...validUpdates
    };

    console.log('State updated to:', {
      id: this.state.id,
      title_zh: this.state.title_zh,
      cover_image: this.state.cover_image,
      currentImage: this.currentImageUrl
    });

    return { ...this.state };
  }

  getState(): BookState {
    return { ...this.state };
  }

  addMessage(message: ChatMessage) {
    this.history.push(message);
  }

  getHistory(): ChatMessage[] {
    return [...this.history];
  }

  reset(preserveId: boolean = true) {
    console.log('Resetting state:', {
      preserveId,
      currentId: this.state.id
    });
    
    const currentId = preserveId ? this.state.id : undefined;
    
    this.state = {
      id: currentId,
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
    this.currentImageUrl = null;

    console.log('State reset complete:', {
      newId: this.state.id,
      hasImage: !!this.currentImageUrl
    });
  }

  hasExistingBook(): boolean {
    return Boolean(this.state.id);
  }
} 