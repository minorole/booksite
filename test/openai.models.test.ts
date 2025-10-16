import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { getModel } from '@/lib/openai/models'
import { OPENAI_CONFIG } from '@/lib/openai'

describe('openai model selection', () => {
  const origText = process.env.OPENAI_TEXT_MODEL
  const origVision = process.env.OPENAI_VISION_MODEL
  beforeEach(() => {
    delete process.env.OPENAI_TEXT_MODEL
    delete process.env.OPENAI_VISION_MODEL
  })
  afterEach(() => {
    process.env.OPENAI_TEXT_MODEL = origText
    process.env.OPENAI_VISION_MODEL = origVision
  })

  it('defaults to GPT-5-mini when env unset', () => {
    const model = getModel('text')
    expect(model).toBe(OPENAI_CONFIG.MODELS.GPT5_MINI)
  })
})

