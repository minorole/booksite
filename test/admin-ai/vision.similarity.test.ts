import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/openai', () => ({
  createVisionChatCompletion: vi.fn(),
}))
vi.mock('@/lib/admin/image-upload', () => ({
  standardizeImageUrl: vi.fn(async (url: string) => url),
}))

import { createVisionChatCompletion } from '@/lib/openai'
import { analyzeVisualSimilarity } from '@/lib/admin/services/vision'

function makeChatCompletion(content: string) {
  return {
    choices: [
      {
        message: { content },
      },
    ],
  } as any
}

describe('vision similarity', () => {
  beforeEach(() => vi.clearAllMocks())

  it('parses layout/content/confidence scores from structured JSON', async () => {
    const payload = { layout_similarity: 0.8, content_similarity: 0.9, confidence: 0.85 }
    ;(createVisionChatCompletion as any).mockResolvedValueOnce(makeChatCompletion(JSON.stringify(payload)))

    const res = await analyzeVisualSimilarity('https://new.jpg', 'https://existing.jpg')
    expect(res.layout_similarity).toBeCloseTo(0.8)
    expect(res.content_similarity).toBeCloseTo(0.9)
    expect(res.confidence).toBeCloseTo(0.85)
  })
})
