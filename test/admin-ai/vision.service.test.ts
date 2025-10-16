import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock OpenAI wrapper used by vision service
vi.mock('@/lib/openai', () => ({
  createVisionChatCompletion: vi.fn(),
}))

// Mock image helpers to avoid network access
vi.mock('@/lib/admin/image-upload', () => ({
  validateCloudinaryUrl: vi.fn(async () => true),
  standardizeImageUrl: vi.fn(async (url: string) => url),
}))

// Avoid DB writes in logAnalysisOperation
vi.mock('@/lib/db/admin', () => ({
  logAdminAction: vi.fn(async () => {}),
}))

import { createVisionChatCompletion } from '@/lib/openai'
import { analyzeBookCover, validateAnalysisResult } from '@/lib/admin/services/vision'

function makeChatCompletion(content: string) {
  return {
    choices: [
      {
        message: { content },
      },
    ],
  } as any
}

describe('vision service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('structured stage returns typed VisionAnalysisResult with cover_url', async () => {
    const payload = {
      confidence_scores: { title_detection: 0.9, category_match: 0.8, overall: 0.85 },
      language_detection: { has_chinese: true, has_english: true, primary_language: 'zh', script_types: ['simplified'] },
      extracted_text: {
        title: { zh: '阿弥陀经', en: 'Amitabha Sutra', confidence: 0.95 },
        author: { zh: '玄奘', en: 'Xuanzang', confidence: 0.9 },
        publisher: { zh: '佛教出版社', en: 'Buddhist Press', confidence: 0.8 },
        other_text: [],
      },
      visual_elements: { has_cover_image: true, image_quality_score: 0.9, notable_elements: [] },
    }

    ;(createVisionChatCompletion as any).mockResolvedValueOnce(makeChatCompletion(JSON.stringify(payload)))

    const imageUrl = 'https://res.cloudinary.com/demo/image/upload/book.jpg'
    const res = await analyzeBookCover(
      {
        image_url: imageUrl,
        stage: 'structured',
        confirmed_info: { title_zh: '阿弥陀经', category_type: 'PURE_LAND_BOOKS' },
      } as any,
      'admin@example.com'
    )

    expect(res.success).toBe(true)
    const data = (res as any).data?.vision_analysis?.structured_data
    expect(data).toBeTruthy()
    expect(data.cover_url).toBe(imageUrl)
    // sanity check of validator
    expect(validateAnalysisResult(data)).toBe(true)
  })

  it('structured stage parse failure then retry failure returns error result', async () => {
    // First attempt (structured) -> invalid JSON
    ;(createVisionChatCompletion as any).mockResolvedValueOnce(makeChatCompletion('not-json'))
    // Retry attempt -> invalid JSON again
    ;(createVisionChatCompletion as any).mockResolvedValueOnce(makeChatCompletion('still-not-json'))

    const res = await analyzeBookCover(
      {
        image_url: 'https://res.cloudinary.com/demo/image/upload/book.jpg',
        stage: 'structured',
        confirmed_info: { title_zh: '阿弥陀经', category_type: 'PURE_LAND_BOOKS' },
      } as any,
      'admin@example.com'
    )

    expect(res.success).toBe(false)
    expect((res as any).error).toBeTruthy()
  })
})
