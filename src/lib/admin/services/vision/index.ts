export { analyzeBookCover } from './cover-analysis'
export { analyzeVisualSimilarity } from './similarity'
export { analyzeItemPhoto } from './item-analysis'

// Lightweight runtime validator for VisionAnalysisResult
export function validateAnalysisResult(x: unknown): boolean {
  const isRecord = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object'
  if (!isRecord(x)) return false

  const cs = (x as any).confidence_scores
  if (!isRecord(cs)) return false
  for (const k of ['title_detection', 'category_match', 'overall']) {
    if (typeof (cs as any)[k] !== 'number' || Number.isNaN((cs as any)[k])) return false
  }

  const ld = (x as any).language_detection
  if (!isRecord(ld)) return false
  if (typeof (ld as any).has_chinese !== 'boolean') return false
  if (typeof (ld as any).has_english !== 'boolean') return false
  if (!['zh', 'en'].includes(String((ld as any).primary_language))) return false
  if (!Array.isArray((ld as any).script_types)) return false
  const allowedScripts = new Set(['simplified', 'traditional', 'english'])
  if (!((ld as any).script_types as unknown[]).every((s) => typeof s === 'string' && allowedScripts.has(s))) return false

  const et = (x as any).extracted_text
  if (!isRecord(et)) return false
  const checkTEP = (p: any) => isRecord(p) && typeof p.confidence === 'number' && (p.zh === undefined || typeof p.zh === 'string') && (p.en === undefined || typeof p.en === 'string')
  if (!checkTEP((et as any).title)) return false
  if (!checkTEP((et as any).author)) return false
  if (!checkTEP((et as any).publisher)) return false
  if (!Array.isArray((et as any).other_text)) return false
  if (!((et as any).other_text as unknown[]).every((t) => typeof t === 'string')) return false

  const ve = (x as any).visual_elements
  if (!isRecord(ve)) return false
  if (typeof (ve as any).has_cover_image !== 'boolean') return false
  if (typeof (ve as any).image_quality_score !== 'number') return false
  if (!Array.isArray((ve as any).notable_elements)) return false
  if (!((ve as any).notable_elements as unknown[]).every((t) => typeof t === 'string')) return false

  // Optional cover_url if present
  if ((x as any).cover_url !== undefined && typeof (x as any).cover_url !== 'string') return false

  return true
}
