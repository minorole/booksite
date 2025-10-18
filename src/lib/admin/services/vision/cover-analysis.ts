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
      const json = await callVisionJSON<{
        summary: string
        title_zh?: string | null
        title_en?: string | null
        author_zh?: string | null
        author_en?: string | null
        publisher_zh?: string | null
        publisher_en?: string | null
        category_suggestion?: import('@/lib/db/enums').CategoryType | null
        quality_issues?: string[]
      }>('InitialCoverAnalysis', initialCoverAnalysisSchema, [
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
