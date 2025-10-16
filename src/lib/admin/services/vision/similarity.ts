import { standardizeImageUrl } from '../../image-upload'
import { visualSimilaritySchema } from './schemas'
import { callVisionJSON } from './helpers'

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

    const json = await callVisionJSON<any>('VisualSimilarity', visualSimilaritySchema, [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: `Compare these two Buddhist book covers and respond with ONLY JSON strictly matching the schema (0-1 scores).`,
          },
          { type: 'image_url', image_url: { url: standardizedNew } },
          { type: 'image_url', image_url: { url: standardizedExisting } },
        ],
      },
    ])
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
