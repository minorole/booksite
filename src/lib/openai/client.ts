import OpenAI from 'openai'
import { env } from '@/lib/config/env'
import { OPENAI_CONFIG } from './config'
import { OpenAIError } from './errors'

function getOpenAIClient(role: 'ADMIN' | 'USER' = 'ADMIN') {
  const apiKey = role === 'ADMIN'
    ? (() => { try { return env.openaiApiKeyAdmin() } catch { return undefined } })()
    : env.openaiApiKeyUser()

  if (!apiKey) {
    throw new OpenAIError(
      role === 'ADMIN' ? 'Missing OPENAI_API_KEY' : 'Missing OPENAI_API_KEY_USER',
      'config_error'
    )
  }

  return new OpenAI({
    apiKey,
    maxRetries: OPENAI_CONFIG.MAX_RETRIES,
    timeout: OPENAI_CONFIG.TIMEOUT,
  })
}

export function getAdminClient() {
  return getOpenAIClient('ADMIN')
}

export function getUserClient() {
  return getOpenAIClient('USER')
}

export { getOpenAIClient }
