import { type ImageConfig, type CloudinaryConfig, type AllowedMimeType } from './types'
import type { CategoryType } from '@/lib/db/enums'

// File upload configurations
export const FILE_CONFIG: ImageConfig = {
  MAX_SIZE: 10 * 1024 * 1024, // 10MB
  ALLOWED_TYPES: [
    'image/jpeg',
    'image/png', 
    'image/webp',
    'image/avif',
    'image/heic',
    'image/heif',
    'image/heic-sequence',
    'image/heif-sequence',
    'image/jpg',
    'image/pjpeg',
    'image/x-png'
  ] as const,
  ACCEPT_STRING: "image/jpeg,image/jpg,image/pjpeg,image/png,image/x-png,image/webp,image/avif,image/heic,image/heif,image/heic-sequence,image/heif-sequence"
} as const

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

// Default limits for admin agents
export const ADMIN_AGENT_MAX_TURNS_DEFAULT = 12 as const

// Small hint shown in the input after image attach (when not auto-sending)
export const ADMIN_AI_IMAGE_HINT = {
  en: 'Add a note for this image (e.g., “Analyze item photo”, “Check duplicates”, “Create a book draft”).',
  zh: '为此图片添加说明（例如：“分析物品照片”、“检查重复”、“创建书目草稿”）。',
} as const

// Feature flags for Admin AI UI
export const ADMIN_AI_RICH_ASSISTANT_TEXT = true as const
