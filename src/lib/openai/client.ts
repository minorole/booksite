import OpenAI from 'openai';
import { env } from '@/lib/config/env';
import { OPENAI_CONFIG } from './config';
import { OpenAIError } from './errors';

function getOpenAIClient(role: 'ADMIN' | 'USER' = 'ADMIN', kind: 'text' | 'vision' = 'text') {
  const apiKey =
    role === 'ADMIN'
      ? (() => {
          try {
            return env.openaiApiKeyAdmin();
          } catch {
            return undefined;
          }
        })()
      : env.openaiApiKeyUser();

  if (!apiKey) {
    throw new OpenAIError(
      role === 'ADMIN' ? 'Missing OPENAI_API_KEY' : 'Missing OPENAI_API_KEY_USER',
      'config_error',
    );
  }

  return new OpenAI({
    apiKey,
    maxRetries: OPENAI_CONFIG.RETRIES[kind],
    timeout: OPENAI_CONFIG.TIMEOUTS[kind],
  });
}

export function getAdminClient(kind: 'text' | 'vision' = 'text') {
  return getOpenAIClient('ADMIN', kind);
}

export function getUserClient(kind: 'text' | 'vision' = 'text') {
  return getOpenAIClient('USER', kind);
}

export { getOpenAIClient };
