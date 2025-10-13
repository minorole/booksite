import { z } from 'zod'

// Define environment variable schema (strings only; validate at access time)
const RequiredKeys = [
  'OPENAI_API_KEY',
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'NEXT_PUBLIC_SUPER_ADMIN_EMAIL',
  'CLOUDINARY_URL',
] as const

const OptionalKeys = [
  'DATABASE_URL',
  'DIRECT_URL',
  'OPENAI_API_KEY_USER',
  'UPSTASH_REDIS_REST_URL',
  'UPSTASH_REDIS_REST_TOKEN',
] as const

export type RequiredEnvKey = typeof RequiredKeys[number]
export type OptionalEnvKey = typeof OptionalKeys[number]
export type AnyEnvKey = RequiredEnvKey | OptionalEnvKey

const nonEmptyString = z.string().min(1)

export function getEnv(key: RequiredEnvKey): string {
  const value = process.env[key]
  const parsed = nonEmptyString.safeParse(value)
  if (!parsed.success) {
    throw new Error(`Missing required environment variable: ${key}`)
  }
  return parsed.data
}

export function getOptionalEnv(key: OptionalEnvKey): string | undefined {
  const value = process.env[key]
  if (value === undefined || value === '') return undefined
  return value
}

export const env = {
  // Required getters
  openaiApiKeyAdmin: () => getEnv('OPENAI_API_KEY'),
  supabaseUrl: () => getEnv('NEXT_PUBLIC_SUPABASE_URL'),
  supabaseAnonKey: () => getEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY'),
  superAdminEmail: () => getEnv('NEXT_PUBLIC_SUPER_ADMIN_EMAIL'),
  cloudinaryUrl: () => getEnv('CLOUDINARY_URL'),

  // Optional getters
  databaseUrl: () => getOptionalEnv('DATABASE_URL'),
  directUrl: () => getOptionalEnv('DIRECT_URL'),
  openaiApiKeyUser: () => getOptionalEnv('OPENAI_API_KEY_USER'),
  upstashUrl: () => getOptionalEnv('UPSTASH_REDIS_REST_URL'),
  upstashToken: () => getOptionalEnv('UPSTASH_REDIS_REST_TOKEN'),
}
