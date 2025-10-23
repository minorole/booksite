import { describe, it, expect, vi, beforeEach } from 'vitest'
import { stubFetchOkImage } from '../utils/fetch'

vi.mock('@/lib/openai', () => ({ createVisionChatCompletion: vi.fn() }))
vi.mock('@/lib/admin/image-upload', async (importOriginal) => {
  const actual = await importOriginal<any>()
  return {
    ...actual,
    standardizeImageUrl: vi.fn(async (url: string) => url),
  }
})

// Note: import modules dynamically inside tests to ensure mocks apply

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
  beforeEach(() => {
    vi.clearAllMocks()
    stubFetchOkImage()
  })

  it('parses layout/content/confidence scores from structured JSON', async () => {
    const payload = { layout_similarity: 0.8, content_similarity: 0.9, confidence: 0.85 }
    const openai = await import('@/lib/openai')
    ;(openai as any).createVisionChatCompletion.mockResolvedValueOnce({
      choices: [{ message: { content: JSON.stringify(payload) } }],
    })

    const mod = await import('@/lib/admin/services/vision')
    const res = await mod.analyzeVisualSimilarity('https://new.jpg', 'https://existing.jpg')
    expect(res.layout_similarity).toBeCloseTo(0.8)
    expect(res.content_similarity).toBeCloseTo(0.9)
    expect(res.confidence).toBeCloseTo(0.85)
  })
})
