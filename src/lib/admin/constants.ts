import { type AllowedMimeType } from './types'

// File upload configurations
export const FILE_CONFIG = {
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
  ] as AllowedMimeType[],
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
export const CLOUDINARY_CONFIG = {
  FOLDER: 'book-covers',
  TRANSFORMATION: [
    { quality: 'auto:best' },
    { fetch_format: 'auto' }
  ]
} as const 