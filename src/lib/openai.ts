// OpenAI Configuration Constants - Single source of truth
const MAX_RETRIES = (() => {
  const raw = process.env.OPENAI_MAX_RETRIES ?? ''
  const n = Number(raw)
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 3
})()

export const OPENAI_CONFIG = {
  MODELS: {
    GPT5_MINI: 'gpt-5-mini' as const,
    VISION_DEFAULT: 'gpt-5-mini' as const,
  },
  TOKENS: {
    MAX_CONTEXT: 128_000,
    MAX_OUTPUT: 16_384,
  },
  TIMEOUT: 30_000,
  MAX_RETRIES: MAX_RETRIES,
  ROLES: {
    ADMIN: 'ADMIN' as const,
    USER: 'USER' as const,
  },
} as const
export { logOperation } from './openai/logging'
export { OpenAIError } from './openai/errors'
export { createChatCompletion } from './openai/chat'
export { createVisionChatCompletion } from './openai/vision'
export type { ChatCompletionMessage, ChatResponse, ContextMetadata } from './openai/types'
