import { type CategoryType } from '@/lib/db/enums'
import type { VisionAnalysisResultInput } from './vision.zod'

// Vision analysis result type is inferred from the canonical Zod schema to avoid drift
export type VisionAnalysisResult = VisionAnalysisResultInput

export interface BookAnalyzeParams {
  image_url: string
}
