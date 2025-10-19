import { z } from 'zod'

// Agents-safe URL schema for http(s) URLs only.
// Avoids emitting JSON Schema { format: 'uri' } which some validators reject.
export const HttpUrl = z
  .string()
  .regex(/^https?:\/\/\S+$/i, 'Must be an http(s) URL')

