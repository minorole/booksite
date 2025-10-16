import { type VisionAnalysisResult } from '@/lib/admin/types'

/**
 * Validates the structure of vision analysis result
 */
export function validateAnalysisResult(result: unknown): result is VisionAnalysisResult {
  try {
    if (!result || typeof result !== 'object') return false
    const r = result as VisionAnalysisResult
    if (!r.confidence_scores || !r.language_detection || !r.extracted_text || !r.visual_elements) {
      return false
    }

    const scores = r.confidence_scores
    if (typeof scores.title_detection !== 'number' || typeof scores.category_match !== 'number' || typeof scores.overall !== 'number') {
      return false
    }

    const lang = r.language_detection
    if (
      typeof lang.has_chinese !== 'boolean' ||
      typeof lang.has_english !== 'boolean' ||
      !['zh', 'en'].includes(lang.primary_language) ||
      !Array.isArray(lang.script_types)
    ) {
      return false
    }

    const text = r.extracted_text
    if (!text.title || typeof text.title.confidence !== 'number') {
      return false
    }

    const visual = r.visual_elements
    if (
      typeof visual.has_cover_image !== 'boolean' ||
      typeof visual.image_quality_score !== 'number' ||
      !Array.isArray(visual.notable_elements)
    ) {
      return false
    }

    return true
  } catch (e) {
    console.error('❌ Validation error:', e)
    return false
  }
}
