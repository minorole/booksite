export const UPLOAD_CONSTANTS = {
  MAX_FILE_SIZE: 19 * 1024 * 1024, // 19MB - increased for high-res images
  VALID_MIME_TYPES: [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/heic',
    'image/heif'
  ],
  VALID_EXTENSIONS: ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.heic', '.heif'],
  ERROR_MESSAGES: {
    SIZE: 'File size must be less than 19MB',
    TYPE: 'Invalid file type. Please upload an image file (JPG, PNG, GIF, WEBP, HEIC, or HEIF)',
    GENERIC: 'Failed to process image. Please try again.'
  }
} as const; 