export type MessageRole = 'system' | 'user' | 'assistant';

export interface BookAnalysis {
  title_en: string | null;
  title_zh: string | null;
  description_en: string;
  description_zh: string;
  extracted_text: string;
  confidence_score: number;
  possible_duplicate: boolean;
  duplicate_reasons: string[];
  search_tags: string[];
  category_suggestions: string[];
}

export interface ChatMessage {
  role: MessageRole;
  content: string;
  timestamp: Date;
  analysis?: BookAnalysis;
  imageUrl?: string;
}

export interface FileUpload {
  file: File;
  previewUrl: string;
}

export interface ChatState {
  messages: ChatMessage[];
  isProcessing: boolean;
  currentUpload: FileUpload | null;
}

export type ChatAction = 
  | { type: 'ADD_MESSAGE'; payload: ChatMessage }
  | { type: 'SET_PROCESSING'; payload: boolean }
  | { type: 'SET_UPLOAD'; payload: FileUpload | null }
  | { type: 'RESET' }; 