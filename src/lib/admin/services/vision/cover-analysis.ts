import { standardizeImageUrl } from '../../image-upload'
import { logAnalysisOperation } from '../logging'
import { handleOperationError } from '../utils'
import { initialCoverAnalysisSchema, structuredVisionAnalysisSchema } from './schemas'
import { callVisionJSON } from './helpers'
import { type AdminOperationResult, type BookAnalyzeParams, type VisionAnalysisResult } from '@/lib/admin/types'

export async function analyzeBookCover(
  args: BookAnalyzeParams,
  adminEmail: string
): Promise<AdminOperationResult> {
  try {
    const standardizedUrl = await standardizeImageUrl(args.image_url)

    if (args.stage === 'initial') {
      const initialSchema = {
        type: 'object',
        additionalProperties: false,
        properties: {
          summary: { type: 'string' },
          title_zh: { anyOf: [{ type: 'string' }, { type: 'null' }] },
          title_en: { anyOf: [{ type: 'string' }, { type: 'null' }] },
          author_zh: { anyOf: [{ type: 'string' }, { type: 'null' }] },
          author_en: { anyOf: [{ type: 'string' }, { type: 'null' }] },
          publisher_zh: { anyOf: [{ type: 'string' }, { type: 'null' }] },
          publisher_en: { anyOf: [{ type: 'string' }, { type: 'null' }] },
          category_suggestion: {
            anyOf: [
              {
                type: 'string',
                enum: ['PURE_LAND_BOOKS', 'OTHER_BOOKS', 'DHARMA_ITEMS', 'BUDDHA_STATUES'],
              },
              { type: 'null' },
            ],
          },
          quality_issues: { type: 'array', items: { type: 'string' } },
        },
        required: [
          'summary',
          'title_zh',
          'title_en',
          'author_zh',
          'author_en',
          'publisher_zh',
          'publisher_en',
          'category_suggestion',
          'quality_issues',
        ],
      }

      const json = await callVisionJSON<any>('InitialCoverAnalysis', initialCoverAnalysisSchema, [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text:
                `Analyze this Buddhist book cover. Extract bilingual text as-is (do not translate), return a brief summary, and output ONLY valid JSON strictly matching the expected schema.`,
            },
            { type: 'image_url', image_url: { url: standardizedUrl } },
          ],
        },
      ])

      const analysis = {
        summary: json.summary,
        title_zh: json.title_zh ?? undefined,
        title_en: json.title_en ?? undefined,
        author_zh: json.author_zh ?? undefined,
        author_en: json.author_en ?? undefined,
        publisher_zh: json.publisher_zh ?? undefined,
        publisher_en: json.publisher_en ?? undefined,
        category_suggestion: json.category_suggestion ?? undefined,
        quality_issues: Array.isArray(json.quality_issues) ? json.quality_issues : undefined,
        needs_confirmation: true,
      }

      await logAnalysisOperation('INITIAL_ANALYSIS', {
        admin_email: adminEmail,
        image_url: standardizedUrl,
        analysis_result: analysis,
      })

      return {
        success: true,
        message: 'Initial analysis complete',
        data: { vision_analysis: { stage: 'initial', natural_analysis: analysis } },
      }
    }

    if (args.stage === 'structured' && args.confirmed_info) {
      const structuredData = await callVisionJSON<VisionAnalysisResult>(
        'VisionAnalysisResult',
        structuredVisionAnalysisSchema,
        [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text:
                  `Extract text as-is (do not translate). Use bilingual fields. Based on this cover and confirmed info: ${JSON.stringify(
                    args.confirmed_info
                  )}, respond with ONLY valid JSON strictly matching the schema.`,
              },
              { type: 'image_url', image_url: { url: standardizedUrl } },
            ],
          },
        ]
      )
      structuredData.cover_url = standardizedUrl

      await logAnalysisOperation('STRUCTURED_ANALYSIS', {
        admin_email: adminEmail,
        image_url: standardizedUrl,
        confirmed_info: args.confirmed_info,
        structured_data: structuredData,
      })

      return {
        success: true,
        message: 'Structured analysis complete',
        data: { vision_analysis: { stage: 'structured', structured_data: structuredData } },
      }
    }

    throw new Error('Invalid analysis stage or missing confirmed info')
  } catch (error) {
    return handleOperationError(error, 'analyze book cover')
  }
}
