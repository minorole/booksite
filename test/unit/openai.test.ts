import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { createChatCompletion, createVisionChatCompletion, OpenAIError } from '@/lib/openai'

const ORIGINAL_ENV = { ...process.env }

describe('OpenAI client (lazy, role-aware)', () => {
  beforeEach(() => {
    process.env = { ...ORIGINAL_ENV }
  })
  afterEach(() => {
    process.env = { ...ORIGINAL_ENV }
  })

  it('throws config_error when admin key is missing (chat)', async () => {
    delete process.env.OPENAI_API_KEY
    await expect(
      createChatCompletion({
        messages: [{ role: 'system', content: 'test' }],
      } as any)
    ).rejects.toBeInstanceOf(OpenAIError)
  })

  it('throws config_error when admin key is missing (vision)', async () => {
    delete process.env.OPENAI_API_KEY
    await expect(
      createVisionChatCompletion({
        messages: [
          { role: 'user', content: [{ type: 'text', text: 'hello' }, { type: 'image_url', image_url: { url: 'https://res.cloudinary.com/demo/image/upload/sample.jpg' } }] },
        ],
        stream: false,
      } as any)
    ).rejects.toBeInstanceOf(OpenAIError)
  })
})

