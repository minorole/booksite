import { createVisionChatCompletion } from '@/lib/openai'
import { type ChatCompletion } from 'openai/resources/chat/completions'
import { validateCloudinaryUrl, standardizeImageUrl } from '../image-upload'
import { logAnalysisOperation } from './logging'
import { handleOperationError } from './utils'
import {
  type AdminOperationResult,
  type BookAnalyzeParams,
  type VisionAnalysisResult,
} from '@/lib/admin/types'

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

function visionStructuredResponseFormat(name: string, schema: Record<string, any>) {
  return {
    type: 'json_schema',
    json_schema: {
      name,
      schema,
      strict: true,
    },
  }
}

/**
 * Initial book cover analysis + structured stage
 */
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

      const response = (await createVisionChatCompletion({
        messages: [
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
        ],
        stream: false,
        response_format: visionStructuredResponseFormat('InitialCoverAnalysis', initialSchema),
      })) as ChatCompletion

      const content = response.choices[0]?.message?.content
      if (!content) throw new Error('No analysis received from vision model')
      const json = JSON.parse(content)

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
      const structuredSchema = {
        type: 'object',
        additionalProperties: false,
        properties: {
          confidence_scores: {
            type: 'object',
            additionalProperties: false,
            properties: {
              title_detection: { type: 'number' },
              category_match: { type: 'number' },
              overall: { type: 'number' },
            },
            required: ['title_detection', 'category_match', 'overall'],
          },
          language_detection: {
            type: 'object',
            additionalProperties: false,
            properties: {
              has_chinese: { type: 'boolean' },
              has_english: { type: 'boolean' },
              primary_language: { type: 'string', enum: ['zh', 'en'] },
              script_types: { type: 'array', items: { type: 'string', enum: ['simplified', 'traditional', 'english'] } },
            },
            required: ['has_chinese', 'has_english', 'primary_language', 'script_types'],
          },
          extracted_text: {
            type: 'object',
            additionalProperties: false,
            properties: {
              title: {
                type: 'object',
                additionalProperties: false,
                properties: {
                  zh: { anyOf: [{ type: 'string' }, { type: 'null' }] },
                  en: { anyOf: [{ type: 'string' }, { type: 'null' }] },
                  confidence: { type: 'number' },
                },
                required: ['zh', 'en', 'confidence'],
              },
              author: {
                type: 'object',
                additionalProperties: false,
                properties: {
                  zh: { anyOf: [{ type: 'string' }, { type: 'null' }] },
                  en: { anyOf: [{ type: 'string' }, { type: 'null' }] },
                  confidence: { type: 'number' },
                },
                required: ['zh', 'en', 'confidence'],
              },
              publisher: {
                type: 'object',
                additionalProperties: false,
                properties: {
                  zh: { anyOf: [{ type: 'string' }, { type: 'null' }] },
                  en: { anyOf: [{ type: 'string' }, { type: 'null' }] },
                  confidence: { type: 'number' },
                },
                required: ['zh', 'en', 'confidence'],
              },
              other_text: { type: 'array', items: { type: 'string' } },
            },
            required: ['title', 'author', 'publisher', 'other_text'],
          },
          visual_elements: {
            type: 'object',
            additionalProperties: false,
            properties: {
              has_cover_image: { type: 'boolean' },
              image_quality_score: { type: 'number' },
              notable_elements: { type: 'array', items: { type: 'string' } },
            },
            required: ['has_cover_image', 'image_quality_score', 'notable_elements'],
          },
        },
        required: ['confidence_scores', 'language_detection', 'extracted_text', 'visual_elements'],
      }

      const response = (await createVisionChatCompletion({
        messages: [
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
        ],
        stream: false,
        response_format: visionStructuredResponseFormat('VisionAnalysisResult', structuredSchema),
      })) as ChatCompletion

      const content = response.choices[0]?.message?.content
      if (!content) throw new Error('No analysis received from vision model')

      const structuredData = JSON.parse(content) as VisionAnalysisResult
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

export async function analyzeVisualSimilarity(
  newImageUrl: string,
  existingImageUrl: string | null
): Promise<{ layout_similarity: number; content_similarity: number; confidence: number }> {
  if (!existingImageUrl) {
    return { layout_similarity: 0, content_similarity: 0, confidence: 1 }
  }

  try {
    const [standardizedNew, standardizedExisting] = await Promise.all([
      standardizeImageUrl(newImageUrl),
      standardizeImageUrl(existingImageUrl),
    ])

    const similaritySchema = {
      type: 'object',
      additionalProperties: false,
      properties: {
        layout_similarity: { type: 'number' },
        content_similarity: { type: 'number' },
        confidence: { type: 'number' },
      },
      required: ['layout_similarity', 'content_similarity', 'confidence'],
    }

    const response = (await createVisionChatCompletion({
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text:
                `Compare these two Buddhist book covers and respond with ONLY JSON strictly matching the schema (0-1 scores).`,
            },
            { type: 'image_url', image_url: { url: standardizedNew } },
            { type: 'image_url', image_url: { url: standardizedExisting } },
          ],
        },
      ],
      stream: false,
      response_format: visionStructuredResponseFormat('VisualSimilarity', similaritySchema),
    })) as ChatCompletion

    const content = response.choices[0]?.message?.content
    if (!content) throw new Error('No analysis received from vision model')

    const json = JSON.parse(content)
    return {
      layout_similarity: Number(json.layout_similarity ?? 0.5),
      content_similarity: Number(json.content_similarity ?? 0.5),
      confidence: Number(json.confidence ?? 0.5),
    }
  } catch (error) {
    console.error('❌ Visual comparison error:', error)
    return { layout_similarity: 0.5, content_similarity: 0.5, confidence: 0.3 }
  }
}
