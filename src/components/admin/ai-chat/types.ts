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
}

export interface ChatMessage {
  role: MessageRole;
  content: string;
  timestamp: Date;
  analysis?: BookAnalysis;
  imageUrl?: string;
  bookData?: BookAnalysis & {
    quantity?: number;
    cover_image?: string;
  };
}

export interface ChatState {
  messages: ChatMessage[];
  isProcessing: boolean;
  uploadedImageUrl: string | null;
  currentBookData?: BookAnalysis & {
    quantity?: number;
    cover_image?: string;
  };
}

export type ChatAction = 
  | { type: 'ADD_MESSAGE'; payload: ChatMessage }
  | { type: 'SET_PROCESSING'; payload: boolean }
  | { type: 'SET_UPLOADED_IMAGE'; payload: string | null }
  | { type: 'SET_BOOK_DATA'; payload: BookAnalysis | undefined }
  | { type: 'RESET' }; 