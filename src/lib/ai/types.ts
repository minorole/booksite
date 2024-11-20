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
}

export interface BookState extends BookAnalysis {
  id?: string;
  cover_image: string | null;
  quantity: number;
  category_id?: string;
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
}

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
  
  // Control fields
  updateType?: 'quantity' | 'title' | 'description' | 'tags' | 'category';
  bookId?: string;
  updatedBook?: any;
  confirmed?: boolean;
} 