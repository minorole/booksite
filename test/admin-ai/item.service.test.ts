import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/openai', () => ({
  createVisionChatCompletion: vi.fn(),
}))
vi.mock('@/lib/admin/image-upload', () => ({
  standardizeImageUrl: vi.fn(async (url: string) => url),
}))
vi.mock('@/lib/db/admin', () => ({
  logAdminAction: vi.fn(async () => {}),
}))

import { createVisionChatCompletion } from '@/lib/openai'
import { analyzeItemPhoto } from '@/lib/admin/services/vision'

function makeChatCompletion(content: string) {
  return {
    choices: [
      { message: { content } },
    ],
  } as any
}

describe('item analysis service', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns structured item analysis with cover_url', async () => {
    const payload = {
      name: 'Amitabha statue',
      type: 'Buddha statue',
      material: 'Bronze',
      finish: 'Polished',
      size: 'Small',
      dimensions: '10cm x 5cm',
      category_suggestion: 'BUDDHA_STATUES',
      tags: ['statue', 'buddha'],
      quality_issues: [],
    }
    ;(createVisionChatCompletion as any).mockResolvedValueOnce(makeChatCompletion(JSON.stringify(payload)))

    const imageUrl = 'https://res.cloudinary.com/demo/image/upload/item.jpg'
    const res = await analyzeItemPhoto(imageUrl, 'admin@example.com')
    expect(res.success).toBe(true)
    const sd = (res as any).data?.item_analysis?.structured_data
    expect(sd).toBeTruthy()
    expect(sd.cover_url).toBe(imageUrl)
    expect(sd.category_suggestion).toBe('BUDDHA_STATUES')
  })
})

