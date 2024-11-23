import { CategoryType, OrderStatus, AdminAction, AnalysisType, SessionType } from '@prisma/client'

// Core message types
export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
  timestamp: Date
  language?: string
  imageUrl?: string
  analysis?: BookAnalysis
  orderInfo?: OrderInfo
  metadata?: MessageMetadata
}

// Shared confidence scores interface
export interface ConfidenceScores {
  title: number
  language_detection: number
  category: number
  tags: number
  duplicate_check?: number
}

export interface MessageMetadata {
  imageUrl?: string
  bookId?: string
  confidence_scores?: ConfidenceScores
  suggested_tags?: {
    zh: string[]
    en: string[]
  }
  approved_tags?: string[]
  rejected_tags?: string[]
  visual_elements?: VisualElements
  duplicate_check?: DuplicateCheck
  tag_suggestions?: TagSuggestions
  prompt_version?: number
  analysis_type?: AnalysisType
  error?: boolean
  errorType?: 'ANALYSIS_ERROR' | 'UPLOAD_ERROR' | 'PROCESSING_ERROR'
  errorDetails?: string
}

// Image processing types
export interface ImageProcessingResult {
  displayUrl: string
  aiImageData: string
  analysis?: BookAnalysis
  confidence_scores?: ConfidenceScores
}

// Book analysis types
export interface BookAnalysis {
  title_zh: string | null
  title_en: string | null
  author_zh: string | null
  author_en: string | null
  publisher_zh: string | null
  publisher_en: string | null
  extracted_text: {
    raw_text: string
    positions: {
      title: string
      author: string | null
      publisher: string | null
      other: string[]
    }
  }
  confidence_scores: ConfidenceScores
  category_suggestions: CategoryType[]
  search_tags: {
    zh: string[]
    en: string[]
  }
  content_summary_zh: string | null
  content_summary_en: string | null
  visual_elements: VisualElements
  has_english_translation: boolean
  analysis_type: AnalysisType
  prompt_version: number
  duplicate_check?: DuplicateCheck
  tag_suggestions?: TagSuggestions
  quantity?: number
}

export interface VisualElements {
  has_buddha_image: boolean
  has_chinese_text: boolean
  has_english_text: boolean
  cover_style: string
  dominant_colors: string[]
}

export interface DuplicateCheck {
  is_duplicate: boolean
  confidence: number
  match_type: 'exact' | 'similar' | 'different'
  differences: string[]
  recommendation: string
  similar_books?: any[]
  reasons?: string[]
}

export interface TagSuggestions {
  tags: {
    zh: string[]
    en: string[]
  }
  confidence_scores: {
    overall: number
    per_tag: Record<string, number>
  }
  categories: CategoryType[]
  notes: string
}

// Book data type
export interface BookData {
  id: string
  title_zh: string
  title_en: string | null
  description_zh: string
  description_en: string | null
  cover_image: string | null
  quantity: number
  category: {
    id: string
    type: CategoryType
    name_zh: string
    name_en: string
  }
  search_tags: string[]
  auto_tags: string[]
  pending_tags: string[]
  rejected_tags: string[]
  ai_metadata: any
  image_analysis_data: any
  discontinued: boolean
  discontinued_at?: Date | null
  discontinued_by?: string | null
  discontinued_reason?: string | null
  last_quantity_update?: Date
  created_at: Date
  updated_at: Date
}

// Order management types
export interface OrderInfo {
  id: string
  status: OrderStatus
  created_at: Date
  notes?: string | null
  admin_notes?: string | null
  tracking_number?: string | null
  processed_by?: string | null
  processing_started_at?: Date | null
  total_items: number
  items: Array<{
    book: BookData
    quantity: number
  }>
  address: {
    address1: string
    address2?: string | null
    city: string
    state: string
    zip: string
    country: string
    is_valid: boolean
  }
  user: {
    email: string
    name: string | null
    language_preference: string | null
  }
}

// Chat session types
export interface ChatSession {
  id: string
  admin_email: string
  created_at: Date
  last_activity: Date
  session_type: 'INVENTORY_MANAGEMENT' | 'ORDER_PROCESSING' | 'CUSTOMER_SERVICE' | 'GENERAL'
  context?: {
    current_books?: string[]
    current_orders?: string[]
    language?: string
    confidence_threshold?: number
    auto_approve_tags?: boolean
  }
  conversation_history: ChatMessage[]
}

// Progress tracking
export interface ProgressUpdate {
  type: 'IMAGE_ANALYSIS' | 'DUPLICATE_CHECK' | 'TAG_GENERATION' | 'ORDER_PROCESSING'
  status: 'STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'ERROR'
  message: string
  progress?: number
  confidence_scores?: Record<string, number>
  orderId?: string
  orderStatus?: OrderStatus
  bookId?: string
  tags?: string[]
  duplicateId?: string
}

// API response types
export interface ChatResponse {
  message: ChatMessage
  actions?: {
    type: 'CREATE_BOOK' | 'UPDATE_BOOK' | 'UPDATE_ORDER' | 'UPDATE_TAGS'
    data: any
  }[]
  progress?: ProgressUpdate
}

export interface ImageAnalysisResponse {
  analysis: BookAnalysis
  duplicates?: {
    exact: BookData | null
    similar: BookData[]
  }
  progress?: ProgressUpdate
}

// Admin log types
export interface AdminLogEntry {
  id: string
  action: AdminAction
  admin_email: string
  created_at: Date
  metadata?: {
    book_id?: string
    order_id?: string
    changes?: Record<string, any>
    confidence_scores?: Record<string, number>
    llm_context?: any
  }
}

// Add this interface to the existing types
export interface SessionContext {
  lastMessage?: string | null;
  messageCount: number;
  bookContext?: string | null;
  orderContext?: string | null;
  language?: string;
  confidence_threshold?: number;
  auto_approve_tags?: boolean;
  current_books?: string[];
  current_orders?: string[];
  [key: string]: string | number | boolean | null | undefined | string[];
}
