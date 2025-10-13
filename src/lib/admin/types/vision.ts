import { type CategoryType } from '@/lib/db/enums'

// Vision analysis result types for book cover processing
export interface VisionAnalysisResult {
  confidence_scores: {
    title_detection: number
    category_match: number
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
    other_text: string[]
  }
  visual_elements: {
    has_cover_image: boolean
    image_quality_score: number
    notable_elements: string[]
  }
  cover_url?: string
}

export interface BookAnalyzeParams {
  image_url: string
  stage: 'initial' | 'structured'
  confirmed_info?: {
    title_zh?: string
    title_en?: string | null
    author_zh?: string | null
    author_en?: string | null
    publisher_zh?: string | null
    publisher_en?: string | null
    category_type?: CategoryType
  }
}

