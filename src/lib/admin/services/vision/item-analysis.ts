import { standardizeImageUrl } from '../../image-upload'
import { logAnalysisOperation } from '../logging'
import { handleOperationError } from '../utils'
import { itemAnalysisSchema } from './schemas'
import { callVisionJSON } from './helpers'
import { type AdminOperationResult } from '@/lib/admin/types'

export async function analyzeItemPhoto(
  imageUrl: string,
  adminEmail: string
): Promise<AdminOperationResult> {
  try {
    const standardizedUrl = await standardizeImageUrl(imageUrl)

    const schema = {
      type: 'object',
      additionalProperties: false,
      properties: {
        name: { anyOf: [{ type: 'string' }, { type: 'null' }] },
        type: { anyOf: [{ type: 'string' }, { type: 'null' }] },
        material: { anyOf: [{ type: 'string' }, { type: 'null' }] },
        finish: { anyOf: [{ type: 'string' }, { type: 'null' }] },
        size: { anyOf: [{ type: 'string' }, { type: 'null' }] },
        dimensions: { anyOf: [{ type: 'string' }, { type: 'null' }] },
        category_suggestion: {
          anyOf: [
            { type: 'string', enum: ['DHARMA_ITEMS', 'BUDDHA_STATUES'] },
            { type: 'null' },
          ],
        },
        tags: { type: 'array', items: { type: 'string' } },
        quality_issues: { type: 'array', items: { type: 'string' } },
      },
      required: ['name', 'type', 'material', 'finish', 'size', 'dimensions', 'category_suggestion', 'tags', 'quality_issues'],
    }

    const json = await callVisionJSON<any>('ItemAnalysis', itemAnalysisSchema, [
      {
        role: 'user',
        content: [
          { type: 'text', text: 'Analyze this item photo (non-book). Extract name/type, material/finish, size/dimensions, category suggestion (DHARMA_ITEMS or BUDDHA_STATUES), tags, and quality issues. Respond with ONLY valid JSON matching the schema.' },
          { type: 'image_url', image_url: { url: standardizedUrl } },
        ],
      },
    ])

    const structured = {
      name: json.name ?? null,
      type: json.type ?? null,
      material: json.material ?? null,
      finish: json.finish ?? null,
      size: json.size ?? null,
      dimensions: json.dimensions ?? null,
      category_suggestion: json.category_suggestion ?? null,
      tags: Array.isArray(json.tags) ? json.tags : [],
      quality_issues: Array.isArray(json.quality_issues) ? json.quality_issues : [],
      cover_url: standardizedUrl,
    }

    await logAnalysisOperation('INITIAL_ANALYSIS', {
      admin_email: adminEmail,
      image_url: standardizedUrl,
      analysis_result: { item_analysis: structured },
    })

    return {
      success: true,
      message: 'Item analysis complete',
      data: { item_analysis: { structured_data: structured } },
    }
  } catch (error) {
    return handleOperationError(error, 'analyze item photo')
  }
}
