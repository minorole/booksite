import { standardizeImageUrl } from '../../image-upload'
import { logAnalysisOperation } from '../logging'
import { handleOperationError } from '../utils'
import { structuredVisionAnalysisSchema } from './schemas'
import { callVisionJSON } from './helpers'
import { type AdminOperationResult, type BookAnalyzeParams, type VisionAnalysisResult } from '@/lib/admin/types'

export async function analyzeBookCover(
  args: BookAnalyzeParams,
  adminEmail: string
): Promise<AdminOperationResult> {
  try {
    const standardizedUrl = await standardizeImageUrl(args.image_url)
    {
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
                  `Extract text as-is (do not translate). Use bilingual fields. Respond with ONLY valid JSON strictly matching the schema.`,
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
        structured_data: structuredData,
      })

      return {
        success: true,
        message: 'Structured analysis complete',
        data: { vision_analysis: { stage: 'structured', structured_data: structuredData } },
      }
    }
  } catch (error) {
    return handleOperationError(error, 'analyze book cover')
  }
}
