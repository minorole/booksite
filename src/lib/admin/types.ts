/**
 * Shared Types for AMTBCF Admin System
 * Centralized type definitions for consistency across the application
 */

import { type CategoryType, type OrderStatus, type Role } from '@prisma/client'
import type { ChatCompletion } from 'openai/resources/chat/completions'

// File Types
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

// LLM & Chat Types
export type MessageRole = 'user' | 'system' | 'assistant' | 'tool'

export type ToolCall = {
  id: string
  function: {
    name: string
    arguments: string
  }
  type: 'function'
}

export type MessageContent = {
  type: 'image_url' | 'text'
  image_url?: { url: string }
  text?: string
}

export type Message = {
  role: MessageRole
  content: string | MessageContent[] | null
  name?: string
  tool_call_id?: string
  tool_calls?: ToolCall[]
}

export type ChatResponse = ChatCompletion

export type OpenAIMessage = {
  role: MessageRole
  content: string | null
  function_call?: {
    name: string
    arguments: string
  }
  tool_calls?: ToolCall[]
}

/**
 * Generic Operation Result Type
 * Provides a consistent structure for all operation results
 * Includes confidence scoring for LLM decisions
 */
export interface OperationResult<T> {
  success: boolean
  message: string
  data?: T
  error?: {
    code: string
    details: unknown
    confidence?: number  // For LLM confidence in error detection
  }
  metadata?: {
    confidence: number  // Overall confidence score
    processing_time: number  // Time taken for operation
    language_used: LanguagePreference  // Language used in operation
  }
}

/**
 * Specific Operation Result Types
 * Type-safe results for different operations
 */
export type AdminOperationResult = OperationResult<{
  book?: BookBase
  order?: OrderBase
  search?: {
    found: boolean
    books: BookBase[]
    similarity_scores?: Record<string, number>  // For similar book detection
  }
  vision_analysis?: VisionAnalysisResult
}>

/**
 * Vision Analysis Types
 * Comprehensive structure for book cover analysis results
 * Includes confidence scores and language detection
 */
export interface VisionAnalysisResult {
  confidence_scores: {
    title_detection: number
    category_match: number
    duplicate_check: number
    overall: number
  }
  language_detection: {
    has_chinese: boolean
    has_english: boolean
    primary_language: 'zh' | 'en'
    script_types: ('simplified' | 'traditional' | 'english')[]
  }
  extracted_text: {
    title: {
      zh?: string
      en?: string
      confidence: number
      position?: { x: number; y: number }  // Location on image
    }
    author: {
      zh?: string
      en?: string
      confidence: number
    }
    publisher?: {
      zh?: string
      en?: string
      confidence: number
    }
    other_text: Array<{
      text: string
      language: 'zh' | 'en'
      confidence: number
    }>
  }
  visual_elements: {
    has_cover_image: boolean
    image_quality_score: number
    notable_elements: string[]  // e.g., ["buddha statue", "lotus flower"]
  }
}

/**
 * Language Preference Types
 * Supports bilingual interface requirements
 */
export type LanguagePreference = 'zh' | 'en' | 'auto'
export type StrictLanguagePreference = Exclude<LanguagePreference, 'auto'>

/**
 * Session Context Types
 * Maintains conversation state and preferences
 * Supports long context window utilization
 */
export interface SessionContext extends Omit<LLMContext, 'language_preference'> {
  language_preference: LanguagePreference
  current_analysis?: VisionAnalysisResult
  confidence_thresholds: {
    vision_analysis: number
    category_assignment: number
    duplicate_detection: number
    tag_generation: number
    translation: number
  }
  conversation_history: {
    book_operations: string[]
    order_operations: string[]
    last_analysis?: VisionAnalysisResult
    decisions_made: Array<{
      type: string
      confidence: number
      timestamp: string
      context: string
    }>
  }
}

// Book Management Types
export interface BookBase {
  title_zh: string
  title_en?: string | null
  description_zh: string
  description_en?: string | null
  category_type: CategoryType
  quantity: number
  tags: string[]
  cover_image: string
  analysis_result?: VisionAnalysisResult  // Link to vision analysis
  similarity_group?: string  // For grouping similar books
}

export interface BookCreate extends BookBase {
  content_summary_zh?: string
  content_summary_en?: string
  author_zh?: string
  author_en?: string
  publisher_zh?: string
  publisher_en?: string
}

export interface BookUpdate extends Partial<BookBase> {
  book_id: string
}

export interface BookSearch {
  title?: string
  tags?: string[]
  category_type?: CategoryType
  min_quantity?: number
  max_quantity?: number
  similarity_threshold?: number  // For finding similar books
  language_preference?: LanguagePreference  // For search results
}

// Order Management Types
export interface OrderBase {
  order_id: string
  status: OrderStatus
  tracking_number?: string
  language_preference?: LanguagePreference  // For notifications
}

export interface OrderUpdate extends OrderBase {
  admin_notes?: string
  override_monthly?: boolean
  processing_priority?: 'normal' | 'high' | 'urgent'
}

// Function Call Types
export interface FunctionCallResult {
  name: string
  arguments: string
  result: AdminOperationResult
  confidence: number
  processing_time: number
}

// Original LLMContext remains for backward compatibility
export interface LLMContext {
  current_operation?: string
  current_books?: string[]
  current_orders?: string[]
  language_preference?: StrictLanguagePreference
  confidence_threshold?: number
} 