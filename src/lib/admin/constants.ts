import { type ChatCompletionMessageParam } from 'openai/resources/chat/completions'

// Model configurations
export const AI_MODELS = {
  ADMIN: 'gpt-4o',
  USER: 'gpt-4o-mini'
} as const

// Define the allowed MIME types
export type AllowedMimeType = 
  | 'image/jpeg'
  | 'image/png'
  | 'image/webp'
  | 'image/heic'
  | 'image/heif'
  | 'image/heic-sequence'
  | 'image/heif-sequence'
  | 'image/jpg'
  | 'image/pjpeg'
  | 'image/x-png'

// File upload configurations
export const FILE_CONFIG = {
  MAX_SIZE: 10 * 1024 * 1024, // 10MB
  ALLOWED_TYPES: [
    'image/jpeg',
    'image/png', 
    'image/webp',
    'image/heic',
    'image/heif',
    'image/heic-sequence',
    'image/heif-sequence',
    'image/jpg',
    'image/pjpeg',
    'image/x-png'
  ] as AllowedMimeType[],
  ACCEPT_STRING: "image/jpeg,image/jpg,image/pjpeg,image/png,image/x-png,image/webp,image/heic,image/heif,image/heic-sequence,image/heif-sequence"
} as const

// Message types
export type MessageContent = {
  type: 'image_url' | 'text';
  image_url?: { url: string };
  text?: string;
}

export type Message = {
  role: 'user' | 'system' | 'assistant' | 'tool';
  content: string | MessageContent[] | null;
  name?: string;
  tool_call_id?: string;
}

// Convert our Message type to OpenAI's ChatCompletionMessageParam
export function convertToOpenAIMessage(message: Message): ChatCompletionMessageParam {
  // Handle array content (like image messages) first
  if (Array.isArray(message.content)) {
    return {
      role: message.role === 'tool' ? 'assistant' : message.role,
      content: message.content as any, // OpenAI accepts array content for vision models
      ...(message.name && { name: message.name }),
      ...(message.tool_call_id && { tool_call_id: message.tool_call_id })
    } as ChatCompletionMessageParam;
  }

  // For function/tool messages, name is required
  if (message.role === 'tool') {
    if (!message.name) {
      throw new Error('Tool messages must have a name');
    }
    return {
      role: 'assistant',
      content: message.content || '',
      name: message.name,
      ...(message.tool_call_id && { tool_call_id: message.tool_call_id })
    } as ChatCompletionMessageParam;
  }

  // For regular messages
  return {
    role: message.role,
    content: message.content || '',
    ...(message.name && { name: message.name }),
    ...(message.tool_call_id && { tool_call_id: message.tool_call_id })
  } as ChatCompletionMessageParam;
}

// Analysis progress messages
export const ANALYSIS_MESSAGES = [
  "Your assistant is examining the book cover details...",
  "Identifying text and visual elements...",
  "Cross-referencing with known categories...",
  "Generating comprehensive analysis...",
  "Almost done with the analysis..."
] as const

// Category types from PRD
export const CATEGORY_TYPE = {
  PURE_LAND_BOOKS: "净土佛书",
  OTHER_BOOKS: "其他佛书", 
  DHARMA_ITEMS: "法宝",
  BUDDHA_STATUES: "佛像"
} as const

// Cloudinary config
export const CLOUDINARY_CONFIG = {
  FOLDER: 'book-covers',
  TRANSFORMATION: [
    { quality: 'auto:best' },
    { fetch_format: 'auto' }
  ]
} as const 