import { OPENAI_CONFIG } from './config'

export function getModel(kind: 'text' | 'vision'): string {
  if (kind === 'text') return process.env.OPENAI_TEXT_MODEL || OPENAI_CONFIG.MODELS.GPT5_MINI
  return process.env.OPENAI_VISION_MODEL || OPENAI_CONFIG.MODELS.GPT5_MINI
}
