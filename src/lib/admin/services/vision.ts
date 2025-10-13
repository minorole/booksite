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

/**
 * Attempts to retry analysis with emphasized JSON requirement
 */
async function retryAnalysis(
  args: { image_url: string },
  adminEmail: string
): Promise<AdminOperationResult> {
  try {
    const isValid = await validateCloudinaryUrl(args.image_url)
    if (!isValid) {
      return {
        success: false,
        message: 'Invalid image URL',
        error: {
          code: 'validation_error',
          details: 'Invalid or inaccessible image URL',
        },
      }
    }

    const standardizedUrl = await standardizeImageUrl(args.image_url)

    const response = (await createVisionChatCompletion({
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text:
                `Analyze this Buddhist book cover and return ONLY valid JSON for VisionAnalysisResult. ` +
                `Do not include extra commentary.`,
            },
            { type: 'image_url', image_url: { url: standardizedUrl } },
          ],
        },
      ],
      stream: false,
    })) as ChatCompletion

    if (!response.choices[0]?.message?.content) {
      throw new Error('Invalid retry response format')
    }

    const content = response.choices[0].message.content
    const analysisResult = JSON.parse(content)
    if (!validateAnalysisResult(analysisResult)) {
      throw new Error('Invalid retry analysis structure')
    }

    return {
      success: true,
      message: 'Analysis complete (retry successful)',
      data: {
        vision_analysis: { stage: 'structured', structured_data: analysisResult },
      },
    }
  } catch (error) {
    return handleOperationError(error, 'retry analyze book cover')
  }
}

function extractLastJsonObject(raw: string): { json: any | null; start: number; end: number } {
  try {
    // Find last closing brace
    let end = raw.lastIndexOf('}')
    if (end === -1) return { json: null, start: -1, end: -1 }
    // Backward scan for matching opening brace (simple balance; assumes no nested braces in strings)
    let depth = 1
    for (let i = end - 1; i >= 0; i--) {
      const ch = raw[i]
      if (ch === '}') depth++
      else if (ch === '{') depth--
      if (depth === 0) {
        const fragment = raw.slice(i, end + 1)
        try {
          const parsed = JSON.parse(fragment)
          return { json: parsed, start: i, end: end + 1 }
        } catch {
          return { json: null, start: -1, end: -1 }
        }
      }
    }
    return { json: null, start: -1, end: -1 }
  } catch {
    return { json: null, start: -1, end: -1 }
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
      const response = (await createVisionChatCompletion({
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text:
                  `Analyze this Buddhist book cover and do two things in order:\n` +
                  `1) Provide a concise natural-language summary of what you see.\n` +
                  `2) Then output a single JSON object on the last line with these exact keys: ` +
                  `{ "title_zh"?, "title_en"?, "author_zh"?, "author_en"?, "publisher_zh"?, "publisher_en"?, ` +
                  `  "category_suggestion"? (one of PURE_LAND_BOOKS|OTHER_BOOKS|DHARMA_ITEMS|BUDDHA_STATUES), ` +
                  `  "quality_issues"?: string[] }.\n` +
                  `Return the JSON as the final block by itself so it can be parsed.`,
              },
              { type: 'image_url', image_url: { url: standardizedUrl } },
            ],
          },
        ],
        stream: false,
      })) as ChatCompletion

      const content = response.choices[0]?.message?.content
      if (!content) throw new Error('No analysis received from vision model')

      const { json, start, end } = extractLastJsonObject(content)
      const summary = start > 0 ? content.slice(0, start).trim() : content.trim()

      const analysis = {
        summary,
        title_zh: json?.title_zh ?? undefined,
        title_en: json?.title_en ?? undefined,
        author_zh: json?.author_zh ?? undefined,
        author_en: json?.author_en ?? undefined,
        publisher_zh: json?.publisher_zh ?? undefined,
        publisher_en: json?.publisher_en ?? undefined,
        category_suggestion: json?.category_suggestion ?? undefined,
        quality_issues: Array.isArray(json?.quality_issues) ? json.quality_issues : undefined,
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
      const response = (await createVisionChatCompletion({
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text:
                  `Based on this book cover and the confirmed information: ${JSON.stringify(
                    args.confirmed_info
                  )}, provide JSON strictly following the VisionAnalysisResult structure.`,
              },
              { type: 'image_url', image_url: { url: standardizedUrl } },
            ],
          },
        ],
        stream: false,
      })) as ChatCompletion

      const content = response.choices[0]?.message?.content
      if (!content) throw new Error('No analysis received from vision model')

      try {
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
      } catch (error) {
        // Attempt one retry with stricter JSON requirement
        return await retryAnalysis({ image_url: standardizedUrl }, adminEmail)
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

    const response = await createVisionChatCompletion({
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text:
                `Compare these Buddhist book covers and analyze their similarity. Focus on:\n` +
                `1. Layout similarity (0-1)\n2. Content similarity (0-1)\n3. Confidence (0-1)\n` +
                `Respond as plain text with lines:\nLayout similarity: [score]\nContent similarity: [score]\nConfidence: [score]`,
            },
            { type: 'image_url', image_url: { url: standardizedNew } },
            { type: 'image_url', image_url: { url: standardizedExisting } },
          ],
        },
      ],
      stream: false,
    })

    if (response instanceof ReadableStream) throw new Error('Unexpected streaming response')

    const content = response.choices[0].message.content
    if (!content) throw new Error('No analysis received from vision model')

    const layoutMatch = content.match(/layout\s*similarity\s*[:\-]\s*(\d+\.?\d*)/i)
    const contentMatch = content.match(/content\s*similarity\s*[:\-]\s*(\d+\.?\d*)/i)
    const confidenceMatch = content.match(/confidence\s*[:\-]\s*(\d+\.?\d*)/i)

    return {
      layout_similarity: layoutMatch ? parseFloat(layoutMatch[1]) : 0.5,
      content_similarity: contentMatch ? parseFloat(contentMatch[1]) : 0.5,
      confidence: confidenceMatch ? parseFloat(confidenceMatch[1]) : 0.5,
    }
  } catch (error) {
    console.error('❌ Visual comparison error:', error)
    return { layout_similarity: 0.5, content_similarity: 0.5, confidence: 0.3 }
  }
}

