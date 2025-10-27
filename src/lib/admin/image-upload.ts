import { FILE_CONFIG, CLOUDINARY_CONFIG } from './constants'
import { type AllowedMimeType, type ImageUploadResult } from './types'
import { createHash } from 'node:crypto'

// Lazy-load Cloudinary only when needed to avoid build-time env validation
async function getCloudinary() {
  const mod = await import('cloudinary')
  return mod.v2
}

/**
 * Basic URL validation for any image URL
 */
async function validateExternalUrl(url: string): Promise<boolean> {
  try {
    console.log('🔍 Validating external URL:', url)
    
    // Basic URL validation
    if (!url || typeof url !== 'string') {
      console.log('❌ Invalid URL format:', url)
      return false
    }

    // Test URL accessibility with timeout
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 5000)

    try {
      const response = await fetch(url, { 
        method: 'HEAD',
        signal: controller.signal
      })
      clearTimeout(timeoutId)
      
      if (!response.ok) {
        console.log('❌ URL not accessible:', url)
        return false
      }

      // Check content type
      const contentType = response.headers.get('content-type')
      if (!contentType || !FILE_CONFIG.ALLOWED_TYPES.includes(contentType as AllowedMimeType)) {
        console.log('❌ Invalid content type:', contentType)
        return false
      }

      console.log('✅ External URL validated:', url)
      return true
    } catch (error) {
      console.log('❌ URL fetch failed:', error)
      return false
    }
  } catch (error) {
    console.error('❌ URL validation error:', error)
    return false
  }
}

/**
 * Validates Cloudinary URL format and accessibility
 */
export async function validateCloudinaryUrl(url: string): Promise<boolean> {
  try {
    console.log('🔍 Validating Cloudinary URL:', url)
    
    // Check if URL is from Cloudinary
    if (!url.includes('res.cloudinary.com')) {
      console.log('❌ Not a Cloudinary URL:', url)
      return false
    }

    // Validate accessibility
    return await validateExternalUrl(url)
  } catch (error) {
    console.error('❌ Cloudinary URL validation error:', error)
    return false
  }
}

/**
 * Standardizes image URL for OpenAI compatibility
 */
export async function standardizeImageUrl(url: string): Promise<string> {
  try {
    // Basic URL validation
    if (!url || typeof url !== 'string') {
      throw new Error('Invalid URL format')
    }

    // Ensure HTTPS
    const secureUrl = url.replace('http://', 'https://')
    
    // For Cloudinary URLs, validate specifically
    if (secureUrl.includes('res.cloudinary.com')) {
      if (!await validateCloudinaryUrl(secureUrl)) {
        throw new Error('Invalid Cloudinary URL')
      }
    } else {
      // For external URLs, use basic validation
      if (!await validateExternalUrl(secureUrl)) {
        throw new Error('Invalid image URL')
      }
    }

    console.log('✅ URL standardized:', secureUrl)
    return secureUrl
  } catch (error) {
    console.error('❌ URL standardization error:', error)
    throw error
  }
}

/**
 * Returns a Cloudinary derivative URL optimized for similarity comparisons
 * - 512x512, crop:fill, gravity:auto, q_auto, f_auto
 * - If not a Cloudinary URL, returns the standardized URL as-is
 */
export function getSimilarityImageUrl(standardizedUrl: string): string {
  try {
    if (!standardizedUrl || typeof standardizedUrl !== 'string') return standardizedUrl
    if (!standardizedUrl.includes('res.cloudinary.com')) return standardizedUrl
    // Cloudinary delivery URLs look like: https://res.cloudinary.com/<cloud>/image/upload/<optional-transforms>/<publicId>.<ext>
    // We inject our transforms right after '/upload/' and before any existing transforms/publicId
    const marker = '/upload/'
    const idx = standardizedUrl.indexOf(marker)
    if (idx === -1) return standardizedUrl
    const prefix = standardizedUrl.slice(0, idx + marker.length)
    const rest = standardizedUrl.slice(idx + marker.length)
    const transform = 'c_fill,g_auto,w_512,h_512,q_auto,f_auto/'
    // Avoid double-injecting if already present
    if (rest.startsWith(transform)) return standardizedUrl
    return `${prefix}${transform}${rest}`
  } catch {
    return standardizedUrl
  }
}

/**
 * Deletes a Cloudinary asset by its delivery URL.
 * - Parses the public_id from the URL and calls uploader.destroy.
 * - No-op if the URL is not a Cloudinary delivery URL.
 */
export async function deleteCloudinaryByUrl(url: string): Promise<void> {
  try {
    if (!url || typeof url !== 'string') return
    if (!url.includes('res.cloudinary.com') || !url.includes('/upload/')) return
    const cloudinary = await getCloudinary()
    const marker = '/upload/'
    const idx = url.indexOf(marker)
    if (idx === -1) return
    const rest = url.slice(idx + marker.length)
    // Strip any transforms and extension to get public_id
    const parts = rest.split('/')
    // If first part contains commas, it's a transform block; drop it
    if (parts.length > 0 && parts[0].includes(',')) {
      parts.shift()
    }
    const fileWithExt = parts.join('/')
    const dot = fileWithExt.lastIndexOf('.')
    const publicId = dot > -1 ? fileWithExt.slice(0, dot) : fileWithExt
    if (!publicId) return
    await cloudinary.uploader.destroy(publicId, { invalidate: true })
  } catch (error) {
    console.error('Cloudinary delete failed:', error)
  }
}

/**
 * Validates file before upload
 */
export function validateImageFile(file: File): void {
  console.log('🔍 Validating file:', {
    name: file.name,
    type: file.type,
    size: `${(file.size / 1024 / 1024).toFixed(2)}MB`
  })

  if (!file) {
    throw new Error('No file provided')
  }

  if (!FILE_CONFIG.ALLOWED_TYPES.includes(file.type as AllowedMimeType)) {
    console.log('❌ Invalid file type:', file.type)
    console.log('Allowed types:', FILE_CONFIG.ALLOWED_TYPES)
    throw new Error('Invalid file type')
  }

  if (file.size > FILE_CONFIG.MAX_SIZE) {
    console.log('❌ File too large:', `${(file.size / 1024 / 1024).toFixed(2)}MB`)
    console.log('Max size:', `${(FILE_CONFIG.MAX_SIZE / 1024 / 1024).toFixed(2)}MB`)
    throw new Error('File too large')
  }

  console.log('✅ File validated')
}

/**
 * Handles complete image upload process with retries
 */
export async function handleImageUpload(
  file: File,
  opts?: { maxRetries?: number; folder?: string }
): Promise<string> {
  console.log('📤 Starting image upload process...')
  
  let lastError: Error | null = null
  const maxRetries = typeof opts?.maxRetries === 'number' ? opts.maxRetries : 2
  const folder = typeof opts?.folder === 'string' && opts.folder.trim() ? opts.folder.trim() : CLOUDINARY_CONFIG.FOLDER

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      if (attempt > 0) {
        console.log(`🔄 Retry attempt ${attempt}/${maxRetries}...`)
      }
      
      // 1. Validate file
      validateImageFile(file)
      
      // 2. Convert to base64
      const bytes = await file.arrayBuffer()
      const buffer = Buffer.from(bytes)
      const base64File = buffer.toString('base64')
      const dataURI = `data:${file.type};base64,${base64File}`
      
      // 2b. Compute content hash to dedupe assets by content
      const hash = createHash('sha1').update(buffer).digest('hex')
      const publicId = `${folder}/${hash}`
      
      // 3. Check for existing resource to avoid reuploading identical content
      const cloudinary = await getCloudinary()
      try {
        const existing = await cloudinary.api.resource(publicId).catch(() => null as any)
        if (existing && typeof existing.secure_url === 'string') {
          console.log('♻️  Reusing existing Cloudinary asset by hash:', { publicId })
          const standardizedUrl = await standardizeImageUrl(existing.secure_url)
          return standardizedUrl
        }
      } catch {}

      // 4. Upload to Cloudinary with timeout using deterministic public_id
      const uploadPromise = cloudinary.uploader.upload(dataURI, {
        folder,
        public_id: hash,
        unique_filename: false,
        overwrite: false,
        resource_type: 'auto',
        transformation: CLOUDINARY_CONFIG.TRANSFORMATION
      })

      const timeoutPromise = new Promise((_resolve, reject) => {
        setTimeout(() => reject(new Error('Upload timeout')), 10000)
      })

      let result: ImageUploadResult
      try {
        result = await Promise.race([uploadPromise, timeoutPromise]) as ImageUploadResult
      } catch (e) {
        // Handle rare race: another request uploaded the same public_id between check and upload
        try {
          const fallback = await cloudinary.api.resource(publicId)
          if (fallback && typeof fallback.secure_url === 'string') {
            console.log('⚖️  Detected concurrent upload; reusing existing asset:', { publicId })
            const standardizedUrl = await standardizeImageUrl(fallback.secure_url)
            return standardizedUrl
          }
        } catch {}
        throw e
      }

      console.log('✅ Upload successful:', {
        publicId: result.public_id,
        format: result.format,
        size: `${(result.bytes / 1024 / 1024).toFixed(2)}MB`,
        url: result.secure_url
      })

      // 5. Validate and standardize Cloudinary URL
      const standardizedUrl = await standardizeImageUrl(result.secure_url)
      return standardizedUrl

    } catch (error) {
      console.error(`❌ Upload attempt ${attempt + 1} failed:`, error)
      lastError = error as Error
      
      if (attempt === maxRetries) {
        console.error('❌ All upload attempts failed')
        throw lastError
      }
      
      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)))
    }
  }

  throw lastError || new Error('Upload failed')
} 
