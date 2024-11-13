export type MessageRole = 'system' | 'user' | 'assistant';

export interface ChatMessage {
  role: MessageRole;
  content: string;
  timestamp: Date;
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