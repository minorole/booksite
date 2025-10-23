import { standardizeImageUrl, getSimilarityImageUrl } from '@/lib/admin/image-upload'
import { visualSimilaritySchema } from '@/lib/admin/services/vision/schemas'
import { callVisionJSON } from '@/lib/admin/services/vision/helpers'

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

    const [similarNew, similarExisting] = [
      getSimilarityImageUrl(standardizedNew),
      getSimilarityImageUrl(standardizedExisting),
    ]

  const json = await callVisionJSON<{
    layout_similarity: number
    content_similarity: number
    confidence: number
  }>('VisualSimilarity', visualSimilaritySchema, [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: `Compare these two product images (book cover or item). Focus on the printed cover/artwork area and primary layout; ignore background, lighting, or angle differences. Respond with ONLY JSON strictly matching the schema (0-1 scores).`,
          },
          { type: 'image_url', image_url: { url: similarNew } },
          { type: 'image_url', image_url: { url: similarExisting } },
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
