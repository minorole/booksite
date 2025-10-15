import { type ImageConfig, type CloudinaryConfig, type AllowedMimeType } from './types'
import type { CategoryType } from '@/lib/db/enums'

// File upload configurations
export const FILE_CONFIG: ImageConfig = {
  MAX_SIZE: 10 * 1024 * 1024, // 10MB
  ALLOWED_TYPES: [
    'image/jpeg',
    'image/png', 
    'image/webp',
    'image/heic',
    'image/heif',
    'image/heic-sequence',
    'image/heif-sequence',
    'image/jpg',
    'image/pjpeg',
    'image/x-png'
  ] as const,
  ACCEPT_STRING: "image/jpeg,image/jpg,image/pjpeg,image/png,image/x-png,image/webp,image/heic,image/heif,image/heic-sequence,image/heif-sequence"
} as const

// Analysis progress messages
export const ANALYSIS_MESSAGES = [
  "Your assistant is examining the book cover details...",
  "Identifying text and visual elements...",
  "Cross-referencing with known categories...",
  "Generating comprehensive analysis...",
  "Almost done with the analysis..."
] as const

// Cloudinary config
export const CLOUDINARY_CONFIG: CloudinaryConfig = {
  FOLDER: 'book-covers',
  TRANSFORMATION: [
    { quality: 'auto:best', fetch_format: 'auto' }
  ]
} as const 

// Centralized category display labels for UI
export const CATEGORY_LABELS: Record<CategoryType, string> = {
  PURE_LAND_BOOKS: '净土佛书',
  OTHER_BOOKS: '其他佛书',
  DHARMA_ITEMS: '法宝',
  BUDDHA_STATUES: '佛像',
} as const
