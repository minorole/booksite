import { FILE_CONFIG, CLOUDINARY_CONFIG } from './constants';
import { getUrlValidationCache } from '@/lib/runtime/request-context';
import { imageValidationLogsEnabled } from '@/lib/observability/toggle';
import { type AllowedMimeType, type ImageUploadResult } from './types';
import { createHash } from 'node:crypto';
const hostForLog = (u: string) => {
  try {
    return new URL(u).hostname;
  } catch {
    return '(invalid)';
  }
};

// Lazy-load Cloudinary only when needed to avoid build-time env validation
async function getCloudinary() {
  const mod = await import('cloudinary');
  return mod.v2;
}

/**
 * Basic URL validation for any non-Cloudinary image URL.
 * Tries a quick HEAD first (with 1 retry), then falls back to a tiny GET (Range: 0-0).
 * Accepts any `image/*` content-type to accommodate optimized formats (e.g., AVIF).
 */
async function validateExternalUrl(url: string): Promise<boolean> {
  // Per-request memoization (in-flight and success)
  const cache = getUrlValidationCache();
  const cacheKey = `ext|${url}`;
  if (cache?.has(cacheKey)) {
    return cache.get(cacheKey) as Promise<boolean>;
  }
  const work = (async () => {
    try {
      if (imageValidationLogsEnabled())
        console.log('[upload] validate_external_url_start', { host: hostForLog(url) });

      if (!url || typeof url !== 'string') {
        if (imageValidationLogsEnabled())
          console.warn('[upload] external_url_invalid', {
            host: hostForLog(url),
            reason: 'invalid_format',
          });
        return false;
      }

      const acceptHeader = { Accept: 'image/*' };
      const isImageContentType = (ct: string | null): boolean => {
        if (!ct) return false;
        const normalized = ct.split(';')[0].trim().toLowerCase();
        if (normalized.startsWith('image/')) return true;
        return FILE_CONFIG.ALLOWED_TYPES.includes(normalized as AllowedMimeType);
      };

      const tryHead = async (timeoutMs: number): Promise<Response> => {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
        try {
          return await fetch(url, {
            method: 'HEAD',
            headers: acceptHeader,
            signal: controller.signal,
          });
        } finally {
          clearTimeout(timeoutId);
        }
      };

      // Attempt HEAD with a modest timeout and one retry with backoff
      try {
        const head = await tryHead(3000);
        if (!head.ok) {
          // Some CDNs disallow HEAD; fall back to GET below
          throw new Error(`HEAD not ok: ${head.status}`);
        }
        const ct = head.headers.get('content-type');
        if (!isImageContentType(ct)) {
          if (imageValidationLogsEnabled())
            console.warn('[upload] external_url_invalid', {
              host: hostForLog(url),
              reason: 'invalid_content_type_head',
              contentType: ct?.split?.(';')[0] || null,
            });
          return false;
        }
        if (imageValidationLogsEnabled())
          console.log('[upload] external_url_valid', {
            host: hostForLog(url),
            via: 'HEAD',
            contentType: ct?.split?.(';')[0] || null,
          });
        return true;
      } catch (e) {
        // Retry once for transient errors, then fall back
        try {
          await new Promise((resolve) => setTimeout(resolve, 300));
          const head2 = await tryHead(3000);
          if (head2.ok) {
            const ct = head2.headers.get('content-type');
            if (isImageContentType(ct)) {
              if (imageValidationLogsEnabled())
                console.log('[upload] external_url_valid', {
                  host: hostForLog(url),
                  via: 'HEAD(retry)',
                  contentType: ct?.split?.(';')[0] || null,
                });
              return true;
            }
            if (imageValidationLogsEnabled())
              console.warn('[upload] external_url_invalid', {
                host: hostForLog(url),
                reason: 'invalid_content_type_head_retry',
                contentType: ct?.split?.(';')[0] || null,
              });
            return false;
          }
        } catch {}
        // Fallback: tiny GET with byte-range
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 5000);
          const rsp = await fetch(url, {
            method: 'GET',
            headers: { ...acceptHeader, Range: 'bytes=0-0' },
            signal: controller.signal,
          });
          clearTimeout(timeoutId);
          if (!rsp.ok && rsp.status !== 206) {
            if (imageValidationLogsEnabled())
              console.warn('[upload] external_url_invalid', {
                host: hostForLog(url),
                reason: 'not_accessible',
                status: rsp.status,
              });
            return false;
          }
          const ct = rsp.headers.get('content-type');
          if (isImageContentType(ct)) {
            if (imageValidationLogsEnabled())
              console.log('[upload] external_url_valid', {
                host: hostForLog(url),
                via: 'GET',
                contentType: ct?.split?.(';')[0] || null,
              });
            return true;
          }
          // Last-chance: infer via file extension
          try {
            const ext = new URL(url).pathname.split('.').pop()?.toLowerCase();
            const okExt = new Set(['jpg', 'jpeg', 'png', 'webp', 'avif', 'heic', 'heif']);
            if (ext && okExt.has(ext)) {
              if (imageValidationLogsEnabled())
                console.log('[upload] external_url_assumed_by_ext', { host: hostForLog(url), ext });
              return true;
            }
          } catch {}
          if (imageValidationLogsEnabled())
            console.warn('[upload] external_url_invalid', {
              host: hostForLog(url),
              reason: 'invalid_content_type_get',
              contentType: ct?.split?.(';')[0] || null,
            });
          return false;
        } catch (err) {
          if (imageValidationLogsEnabled())
            console.warn('[upload] external_url_invalid', {
              host: hostForLog(url),
              reason: 'fetch_failed',
            });
          return false;
        }
      }
    } catch (error) {
      if (imageValidationLogsEnabled()) console.error('❌ URL validation error:', error);
      return false;
    }
  })();
  if (cache) {
    cache.set(cacheKey, work);
    const ok = await work;
    if (!ok) cache.delete(cacheKey);
    return ok;
  }
  return work;
}

/**
 * Validates Cloudinary URL format and accessibility
 */
export async function validateCloudinaryUrl(url: string): Promise<boolean> {
  const cache = getUrlValidationCache();
  const cacheKey = `cld|${url}`;
  if (cache?.has(cacheKey)) {
    return cache.get(cacheKey) as Promise<boolean>;
  }
  const work = (async () => {
    try {
      if (imageValidationLogsEnabled())
        console.log('[upload] validate_cloudinary_url_start', { host: hostForLog(url) });
      // Basic host check
      if (!url.includes('res.cloudinary.com')) {
        if (imageValidationLogsEnabled())
          console.warn('[upload] cloudinary_url_invalid', {
            host: hostForLog(url),
            reason: 'not_cloudinary',
          });
        return false;
      }
      // Structural check for Cloudinary delivery URL and (when available) our cloud name
      try {
        const u = new URL(url.replace('http://', 'https://'));
        const path = u.pathname || '';
        const parts = path.split('/').filter(Boolean);
        const hasUpload = path.includes('/image/upload/');
        // Allow version and transforms; require a plausible image extension
        const ext = path.split('.').pop()?.toLowerCase();
        const okExt = new Set(['jpg', 'jpeg', 'png', 'webp', 'avif', 'heic', 'heif']);
        // Attempt to verify cloud name when configured
        let ourCloud: string | undefined;
        try {
          const cloudinary = await getCloudinary();
          const cfg = cloudinary.config() as unknown as { cloud_name?: string };
          ourCloud = (cfg?.cloud_name || '').trim() || undefined;
        } catch {}
        const cloudFromUrl = parts.length > 0 ? parts[0] : undefined;
        const cloudMatches = ourCloud ? cloudFromUrl === ourCloud : true;
        if (hasUpload && cloudMatches && ext && okExt.has(ext)) {
          if (imageValidationLogsEnabled())
            console.log('[upload] cloudinary_url_valid', {
              host: hostForLog(url),
              cloud: cloudFromUrl,
              via: 'pattern',
            });
          return true;
        }
      } catch {}
      // Fallback to external validation for unusual shapes
      return await validateExternalUrl(url);
    } catch (error) {
      if (imageValidationLogsEnabled()) console.error('❌ Cloudinary URL validation error:', error);
      return false;
    }
  })();
  if (cache) {
    cache.set(cacheKey, work);
    const ok = await work;
    if (!ok) cache.delete(cacheKey);
    return ok;
  }
  return work;
}

/**
 * Standardizes image URL for OpenAI compatibility
 */
export async function standardizeImageUrl(url: string): Promise<string> {
  try {
    // Basic URL validation
    if (!url || typeof url !== 'string') {
      throw new Error('Invalid URL format');
    }

    // Ensure HTTPS
    const secureUrl = url.replace('http://', 'https://');

    // For Cloudinary URLs, validate specifically
    if (secureUrl.includes('res.cloudinary.com')) {
      if (!(await validateCloudinaryUrl(secureUrl))) {
        throw new Error('Invalid Cloudinary URL');
      }
    } else {
      // For external URLs, use basic validation
      if (!(await validateExternalUrl(secureUrl))) {
        throw new Error('Invalid image URL');
      }
    }

    if (imageValidationLogsEnabled())
      console.log('[upload] url_standardized', { host: hostForLog(secureUrl) });
    return secureUrl;
  } catch (error) {
    if (imageValidationLogsEnabled()) console.error('❌ URL standardization error:', error);
    throw error;
  }
}

/**
 * Returns a Cloudinary derivative URL optimized for similarity comparisons
 * - 512x512, crop:fill, gravity:auto, q_auto, f_auto
 * - If not a Cloudinary URL, returns the standardized URL as-is
 */
export function getSimilarityImageUrl(standardizedUrl: string): string {
  try {
    if (!standardizedUrl || typeof standardizedUrl !== 'string') return standardizedUrl;
    if (!standardizedUrl.includes('res.cloudinary.com')) return standardizedUrl;
    // Cloudinary delivery URLs look like: https://res.cloudinary.com/<cloud>/image/upload/<optional-transforms>/<publicId>.<ext>
    // We inject our transforms right after '/upload/' and before any existing transforms/publicId
    const marker = '/upload/';
    const idx = standardizedUrl.indexOf(marker);
    if (idx === -1) return standardizedUrl;
    const prefix = standardizedUrl.slice(0, idx + marker.length);
    const rest = standardizedUrl.slice(idx + marker.length);
    const transform = 'c_fill,g_auto,w_512,h_512,q_auto,f_auto/';
    // Avoid double-injecting if already present
    if (rest.startsWith(transform)) return standardizedUrl;
    return `${prefix}${transform}${rest}`;
  } catch {
    return standardizedUrl;
  }
}

/**
 * Deletes a Cloudinary asset by its delivery URL.
 * - Parses the public_id from the URL and calls uploader.destroy.
 * - No-op if the URL is not a Cloudinary delivery URL.
 */
// Note: URL-based deletes helper removed to reduce unused/dead code.

/**
 * Validates file before upload
 */
export function validateImageFile(file: File): void {
  const mb = (file.size / 1024 / 1024).toFixed(2);
  if (imageValidationLogsEnabled())
    console.log('[upload] file_validation', { name: file.name, type: file.type, mb });

  if (!file) {
    throw new Error('No file provided');
  }

  if (!FILE_CONFIG.ALLOWED_TYPES.includes(file.type as AllowedMimeType)) {
    if (imageValidationLogsEnabled())
      console.warn('[upload] file_invalid', { reason: 'type', type: file.type });
    throw new Error('Invalid file type');
  }

  if (file.size > FILE_CONFIG.MAX_SIZE) {
    if (imageValidationLogsEnabled())
      console.warn('[upload] file_invalid', {
        reason: 'size',
        mb,
        maxMb: (FILE_CONFIG.MAX_SIZE / 1024 / 1024).toFixed(2),
      });
    throw new Error('File too large');
  }

  if (imageValidationLogsEnabled()) console.log('[upload] file_valid', { type: file.type, mb });
}

/**
 * Handles complete image upload process with retries
 */
export async function handleImageUpload(
  file: File,
  opts?: { maxRetries?: number; folder?: string; tags?: string[] },
): Promise<string> {
  const mb = (file.size / 1024 / 1024).toFixed(2);
  console.log('[upload] upload_start', {
    name: file.name,
    type: file.type,
    mb,
    folder: (typeof opts?.folder === 'string' && opts.folder.trim()) || CLOUDINARY_CONFIG.FOLDER,
  });

  let lastError: Error | null = null;
  const maxRetries = typeof opts?.maxRetries === 'number' ? opts.maxRetries : 2;
  const folder =
    typeof opts?.folder === 'string' && opts.folder.trim()
      ? opts.folder.trim()
      : CLOUDINARY_CONFIG.FOLDER;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      if (attempt > 0) {
        console.warn('[upload] upload_retry', { attempt, max: maxRetries });
      }

      // 1. Validate file
      validateImageFile(file);

      // 2. Read bytes and compute content hash to dedupe assets by content
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      const hash = createHash('sha1').update(buffer).digest('hex');
      const publicId = `${folder}/${hash}`;

      // 3. Check for existing resource to avoid reuploading identical content
      const cloudinary = await getCloudinary();
      try {
        const existing = await cloudinary.api.resource(publicId).catch(() => null as any);
        if (existing && typeof existing.secure_url === 'string') {
          console.log('[upload] upload_reuse', { publicId });
          const standardizedUrl = await standardizeImageUrl(existing.secure_url);
          return standardizedUrl;
        }
      } catch {}

      // 4. Convert to base64 and upload to Cloudinary with timeout using deterministic public_id
      const base64File = buffer.toString('base64');
      const dataURI = `data:${file.type};base64,${base64File}`;
      const uploadPromise = cloudinary.uploader.upload(dataURI, {
        folder,
        public_id: hash,
        unique_filename: false,
        overwrite: false,
        resource_type: 'auto',
        transformation: CLOUDINARY_CONFIG.TRANSFORMATION,
        ...(Array.isArray(opts?.tags) && opts!.tags.length > 0 ? { tags: opts!.tags } : {}),
      });

      const timeoutPromise = new Promise((_resolve, reject) => {
        setTimeout(() => reject(new Error('Upload timeout')), 10000);
      });

      let result: ImageUploadResult;
      try {
        result = (await Promise.race([uploadPromise, timeoutPromise])) as ImageUploadResult;
      } catch (e) {
        // Handle rare race: another request uploaded the same public_id between check and upload
        try {
          const fallback = await cloudinary.api.resource(publicId);
          if (fallback && typeof fallback.secure_url === 'string') {
            console.log('[upload] upload_reuse', { publicId });
            const standardizedUrl = await standardizeImageUrl(fallback.secure_url);
            return standardizedUrl;
          }
        } catch {}
        throw e;
      }

      console.log('[upload] upload_success', {
        publicId: result.public_id,
        format: result.format,
        mb: (result.bytes / 1024 / 1024).toFixed(2),
      });

      // 5. Validate and standardize Cloudinary URL
      const standardizedUrl = await standardizeImageUrl(result.secure_url);
      return standardizedUrl;
    } catch (error) {
      console.error(`❌ Upload attempt ${attempt + 1} failed:`, error);
      lastError = error as Error;

      if (attempt === maxRetries) {
        console.error('❌ All upload attempts failed');
        throw lastError;
      }

      // Wait before retry
      await new Promise((resolve) => setTimeout(resolve, 1000 * (attempt + 1)));
    }
  }

  throw lastError || new Error('Upload failed');
}
