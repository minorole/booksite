import { z } from 'zod';

// Define environment variable schema (strings only; validate at access time)
const RequiredKeys = [
  'OPENAI_API_KEY',
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPER_ADMIN_EMAIL',
  'CLOUDINARY_URL',
] as const;

const OptionalKeys = [
  'OPENAI_API_KEY_USER',
  // Image embeddings provider (self-hosted CLIP or others)
  'IMAGE_EMBEDDINGS_PROVIDER',
  'CLIP_EMBEDDINGS_URL',
  'CLIP_EMBEDDINGS_API_KEY',
  'IMAGE_EMBEDDINGS_STRICT',
  // OpenAI tuning
  'OPENAI_MAX_RETRIES',
  'OPENAI_TEXT_MAX_RETRIES',
  'OPENAI_VISION_MAX_RETRIES',
  'OPENAI_TEXT_TIMEOUT_MS',
  'OPENAI_VISION_TIMEOUT_MS',
  // Admin task token for cron-authenticated maintenance endpoints
  'ADMIN_TASK_TOKEN',
  // Cloudinary temp uploads configuration (optional)
  'CLOUDINARY_TEMP_PREFIX',
  'CLOUDINARY_TEMP_RETENTION_DAYS',
] as const;

export type RequiredEnvKey = (typeof RequiredKeys)[number];
export type OptionalEnvKey = (typeof OptionalKeys)[number];
export type AnyEnvKey = RequiredEnvKey | OptionalEnvKey;

const nonEmptyString = z.string().min(1);

export function getEnv(key: RequiredEnvKey): string {
  const value = process.env[key];
  const parsed = nonEmptyString.safeParse(value);
  if (!parsed.success) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return parsed.data;
}

export function getOptionalEnv(key: OptionalEnvKey): string | undefined {
  const value = process.env[key];
  if (value === undefined || value === '') return undefined;
  return value;
}

export const env = {
  // Required getters
  openaiApiKeyAdmin: () => getEnv('OPENAI_API_KEY'),
  supabaseUrl: () => getEnv('NEXT_PUBLIC_SUPABASE_URL'),
  supabaseAnonKey: () => getEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY'),
  superAdminEmail: () => getEnv('SUPER_ADMIN_EMAIL'),
  cloudinaryUrl: () => getEnv('CLOUDINARY_URL'),

  // Optional getters
  openaiApiKeyUser: () => getOptionalEnv('OPENAI_API_KEY_USER'),
  imageEmbProvider: () => getOptionalEnv('IMAGE_EMBEDDINGS_PROVIDER'),
  clipUrl: () => getOptionalEnv('CLIP_EMBEDDINGS_URL'),
  clipToken: () => getOptionalEnv('CLIP_EMBEDDINGS_API_KEY'),
  imageEmbStrict: () => getOptionalEnv('IMAGE_EMBEDDINGS_STRICT'),
  openaiMaxRetries: () => getOptionalEnv('OPENAI_MAX_RETRIES'),
  openaiTextMaxRetries: () => getOptionalEnv('OPENAI_TEXT_MAX_RETRIES'),
  openaiVisionMaxRetries: () => getOptionalEnv('OPENAI_VISION_MAX_RETRIES'),
  openaiTextTimeoutMs: () => getOptionalEnv('OPENAI_TEXT_TIMEOUT_MS'),
  openaiVisionTimeoutMs: () => getOptionalEnv('OPENAI_VISION_TIMEOUT_MS'),
  adminTaskToken: () => getOptionalEnv('ADMIN_TASK_TOKEN'),
  // Cloudinary temp uploads (optional)
  cloudinaryTempPrefix: () => getOptionalEnv('CLOUDINARY_TEMP_PREFIX'),
  cloudinaryTempRetentionDays: () => getOptionalEnv('CLOUDINARY_TEMP_RETENTION_DAYS'),
};
