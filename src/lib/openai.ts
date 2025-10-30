// OpenAI Configuration Constants - Single source of truth
import { env } from '@/lib/config/env'

function parsePositiveInt(val?: string): number | undefined {
  const n = Number(val)
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : undefined
}

const FALLBACK_RETRIES = 3
const DEFAULT_TIMEOUT_MS = 30_000

const TEXT_MAX_RETRIES =
  parsePositiveInt(env.openaiTextMaxRetries?.()) ??
  parsePositiveInt(env.openaiMaxRetries?.()) ??
  FALLBACK_RETRIES

const VISION_MAX_RETRIES =
  parsePositiveInt(env.openaiVisionMaxRetries?.()) ??
  parsePositiveInt(env.openaiMaxRetries?.()) ??
  FALLBACK_RETRIES

const TEXT_TIMEOUT_MS = parsePositiveInt(env.openaiTextTimeoutMs?.()) ?? DEFAULT_TIMEOUT_MS
const VISION_TIMEOUT_MS = parsePositiveInt(env.openaiVisionTimeoutMs?.()) ?? DEFAULT_TIMEOUT_MS

export const OPENAI_CONFIG = {
  MODELS: {
    GPT5_MINI: 'gpt-5-mini' as const,
    VISION_DEFAULT: 'gpt-5-mini' as const,
  },
  TOKENS: {
    MAX_CONTEXT: 128_000,
    MAX_OUTPUT: 16_384,
  },
  RETRIES: {
    text: TEXT_MAX_RETRIES,
    vision: VISION_MAX_RETRIES,
  },
  TIMEOUTS: {
    text: TEXT_TIMEOUT_MS,
    vision: VISION_TIMEOUT_MS,
  },
} as const
export { logOperation } from './openai/logging'
export { OpenAIError } from './openai/errors'
export { createChatCompletion } from './openai/chat'
export { createVisionChatCompletion } from './openai/vision'
export type { ChatCompletionMessage, ChatResponse, ContextMetadata } from './openai/types'
export { getModel, getEmbeddingModel } from './openai/models'
