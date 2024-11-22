export interface BookAnalysis {
  title_en: string | null;
  title_zh: string | null;
  confidence_scores: {
    title: number;               // 0.0 to 1.0
    language_detection: number;   // 0.0 to 1.0
  };
  extracted_text: {
    raw_text: string;            // All visible text
    positions: {                 // For verification
      title: string;
      other: string[];
    };
  };
  description_en: string;
  description_zh: string;
  possible_duplicate: boolean;
  duplicate_reasons?: string[];
  search_tags: string[];
  category_suggestions: string[];
}

export interface BookState extends BookAnalysis {
  id?: string;
  cover_image: string | null;
  quantity: number;
  category_id?: string;
  category?: {
    id: string;
    name_en: string;
    name_zh: string;
    type: string;
  };
  ai_metadata?: any;
}

export interface ChatState {
  messages: ChatMessage[];
  isProcessing: boolean;
  currentBookData?: BookState;
  uploadedImageUrl: string | null;
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
  timestamp: Date;
  imageUrl?: string;
  images?: {
    existing: string;
    new: string;
  };
  analysis?: BookAnalysis;
  bookData?: BookState;
}

export interface AssistantResponse {
  content: string;
  action?: ChatAPIAction;
  data?: ChatResponseData;
  certainty: 'high' | 'medium' | 'low';
  needs_review: boolean;
  message?: string;
}

export enum ChatAPIAction {
  UPDATE_BOOK = 'UPDATE_BOOK',
  CREATE_BOOK = 'CREATE_BOOK',
  UPDATE_TITLE = 'UPDATE_TITLE',
  UPDATE_QUANTITY = 'UPDATE_QUANTITY',
  UPDATE_DESCRIPTION = 'UPDATE_DESCRIPTION',
  UPDATE_TAGS = 'UPDATE_TAGS',
  UPDATE_CATEGORY = 'UPDATE_CATEGORY',
  UPDATE_EXISTING = 'UPDATE_EXISTING',
  CONFIRM_QUANTITY = 'CONFIRM_QUANTITY',
  QUERY_DATABASE = 'QUERY_DATABASE'
}

export interface ChatResponseData {
  // Title updates
  title_en?: string;
  title_zh?: string;
  
  // Description updates
  description_en?: string;
  description_zh?: string;
  
  // Other updates
  quantity?: number;
  category?: string;
  search_tags?: string[];
  
  // Query fields
  queryType?: 'search' | 'stats';
  searchTerm?: string;
  
  // Control fields
  updateType?: 'quantity' | 'title' | 'description' | 'tags' | 'category';
  bookId?: string;
  updatedBook?: BookState;
  confirmed?: boolean;
} 