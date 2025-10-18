// OpenAI Configuration Constants - Single source of truth
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
  MAX_RETRIES: 3,
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
