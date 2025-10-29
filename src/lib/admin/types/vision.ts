import { type CategoryType } from '@/lib/db/enums'
import type { VisionAnalysisResultInput } from './vision.zod'

// Vision analysis result type is inferred from the canonical Zod schema to avoid drift
export type VisionAnalysisResult = VisionAnalysisResultInput

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
