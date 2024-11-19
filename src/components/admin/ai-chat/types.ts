export type MessageRole = 'system' | 'user' | 'assistant';

export interface BookAnalysis {
  title_en: string | null;
  title_zh: string | null;
  description_en: string;
  description_zh: string;
  extracted_text: string;
  confidence_score: number;
  possible_duplicate: boolean;
  duplicate_reasons?: string[];
  search_tags: string[];
  category_suggestions: string[];
  quantity?: number;
  imageUrl?: string;
  cover_image?: string;
}

export interface DuplicateBook {
  book: {
    id: string;
    title_en: string | null;
    title_zh: string | null;
    description_en: string;
    description_zh: string;
    cover_image: string;
    quantity: number;
    category: {
      name_en: string;
      name_zh: string;
      type: string;
    };
  };
  confidence: number;
  reasons: string[];
}

export interface ChatMessage {
  role: MessageRole;
  content: string;
  timestamp: Date;
  analysis?: BookAnalysis;
  imageUrl?: string;
  images?: {
    existing: string;
    new: string;
  };
  bookData?: BookAnalysis & {
    quantity?: number;
    cover_image?: string;
  };
  duplicate?: DuplicateBook;
  updateType?: 'quantity' | 'title' | 'description';
  targetBookId?: string;
}

export interface ChatState {
  messages: ChatMessage[];
  isProcessing: boolean;
  uploadedImageUrl: string | null;
  currentBookData?: BookAnalysis & {
    id?: string;
    quantity?: number;
    cover_image?: string;
  };
  currentBookId?: string;
  duplicateBook?: DuplicateBook;
  updateType?: 'quantity' | 'title' | 'description';
  targetBookId?: string;
}

export type ChatAction = 
  | { type: 'ADD_MESSAGE'; payload: ChatMessage }
  | { type: 'SET_PROCESSING'; payload: boolean }
  | { type: 'SET_UPLOADED_IMAGE'; payload: string | null }
  | { type: 'SET_BOOK_DATA'; payload: BookAnalysis }
  | { type: 'RESET' };

export type ChatAPIAction = 
  | 'UPDATE_TITLE' 
  | 'UPDATE_QUANTITY' 
  | 'UPDATE_DESCRIPTION'
  | 'UPDATE_TAGS'
  | 'UPDATE_CATEGORY'
  | 'CREATE_BOOK' 
  | 'UPDATE_EXISTING'
  | 'CONFIRM_QUANTITY';

export interface ChatResponseData {
  title?: string;
  quantity?: number;
  category?: string;
  description_en?: string;
  description_zh?: string;
  search_tags?: string[];
  bookData?: BookAnalysis;
  updateType?: 'quantity' | 'title' | 'description';
  bookId?: string;
  updatedBook?: any;
  confirmed?: boolean;
}

export interface AssistantResponse {
  content: string;
  action?: ChatAPIAction;
  data?: ChatResponseData;
  certainty: 'high' | 'medium' | 'low';
  needs_review: boolean;
} 