import { type LanguagePreference } from './context'
import { type BookBase } from './books'
import { type OrderBase } from './orders'
import { type VisionAnalysisResult } from './vision'
import { type CategoryType } from '@/lib/db/enums'

// Generic operation result envelope with optional metadata
export interface OperationResult<T> {
  success: boolean
  message: string
  data?: T
  error?: {
    code: string
    details: unknown
    confidence?: number
  }
  metadata?: {
    confidence: number
    processing_time: number
    language_used: LanguagePreference
  }
}

export interface DuplicateDetectionResult {
  matches: Array<{
    book_id: string
    similarity_score: number
    differences: {
      publisher?: boolean
      edition?: boolean
      year?: boolean
      layout?: boolean
    }
    visual_analysis: {
      layout_similarity: number
      content_similarity: number
      confidence: number
    }
  }>
  analysis: {
    has_duplicates: boolean
    confidence: number
    recommendation: 'create_new' | 'update_existing' | 'needs_review'
  }
}

// Admin operations result payloads from services
export type AdminOperationResult = OperationResult<{
  book?: BookBase
  order?: OrderBase
  search?: {
    found: boolean
    books: BookBase[]
  }
  duplicate_detection?: DuplicateDetectionResult
  vision_analysis?: {
    stage: 'initial' | 'structured'
    natural_analysis?: {
      summary?: string
      title_zh?: string
      title_en?: string
      author_zh?: string
      author_en?: string
      publisher_zh?: string
      publisher_en?: string
      category_suggestion?: CategoryType
      quality_issues?: string[]
      needs_confirmation?: boolean
    }
    structured_data?: VisionAnalysisResult
  }
  item_analysis?: {
    structured_data: {
      name?: string | null
      type?: string | null
      material?: string | null
      finish?: string | null
      size?: string | null
      dimensions?: string | null
      category_suggestion?: CategoryType
      tags?: string[]
      quality_issues?: string[]
      cover_url?: string
    }
  }
}>
