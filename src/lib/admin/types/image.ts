// Image and upload configuration types used across admin features

export type AllowedMimeType =
  | 'image/jpeg'
  | 'image/png'
  | 'image/webp'
  | 'image/heic'
  | 'image/heif'
  | 'image/heic-sequence'
  | 'image/heif-sequence'
  | 'image/jpg'
  | 'image/pjpeg'
  | 'image/x-png'

export interface ImageConfig {
  readonly MAX_SIZE: number
  readonly ALLOWED_TYPES: readonly AllowedMimeType[]
  readonly ACCEPT_STRING: string
}

export interface CloudinaryConfig {
  readonly FOLDER: string
  readonly TRANSFORMATION: readonly {
    readonly quality: string
    readonly fetch_format: string
  }[]
}

export interface ImageUploadResult {
  secure_url: string
  public_id: string
  format: string
  bytes: number
}

