import { type VisionAnalysisResult } from '@/lib/admin/types'

/**
 * Validates the structure of vision analysis result
 */
export function validateAnalysisResult(result: any): result is VisionAnalysisResult {
  try {
    if (!result) return false
    if (!result.confidence_scores || !result.language_detection || !result.extracted_text || !result.visual_elements) {
      return false
    }

    const scores = result.confidence_scores
    if (typeof scores.title_detection !== 'number' || typeof scores.category_match !== 'number' || typeof scores.overall !== 'number') {
      return false
    }

    const lang = result.language_detection
    if (
      typeof lang.has_chinese !== 'boolean' ||
      typeof lang.has_english !== 'boolean' ||
      !['zh', 'en'].includes(lang.primary_language) ||
      !Array.isArray(lang.script_types)
    ) {
      return false
    }

    const text = result.extracted_text
    if (!text.title || typeof text.title.confidence !== 'number') {
      return false
    }

    const visual = result.visual_elements
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

