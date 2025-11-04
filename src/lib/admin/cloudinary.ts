import { env } from '@/lib/config/env';
import { CLOUDINARY_CONFIG } from '@/lib/admin/constants';

async function getCld() {
  env.cloudinaryUrl();
  const { v2: cloudinary } = await import('cloudinary');
  return cloudinary;
}

export function parsePublicIdFromUrl(url: string): {
  publicId: string | null;
  hasTransforms: boolean;
} {
  try {
    const marker = '/upload/';
    const idx = url.indexOf(marker);
    if (idx === -1) return { publicId: null, hasTransforms: false };
    const rest = url.slice(idx + marker.length);
    const parts = rest.split('/');
    const hasTransforms = parts[0]?.includes(',');
    if (hasTransforms) parts.shift();
    const fileWithExt = parts.join('/');
    const dot = fileWithExt.lastIndexOf('.');
    const publicId = dot > -1 ? fileWithExt.slice(0, dot) : fileWithExt;
    return { publicId, hasTransforms };
  } catch {
    return { publicId: null, hasTransforms: false };
  }
}

export type PromoteResult = { url: string; public_id: string };

export async function promoteTempAsset(
  url: string,
  opts?: { permanentFolder?: string },
): Promise<PromoteResult> {
  const cloudinary = await getCld();
  const { publicId } = parsePublicIdFromUrl(url);
  if (!publicId) throw new Error('Not a Cloudinary delivery URL');

  const rawPrefix = env.cloudinaryTempPrefix?.() || 'temp-uploads/';
  const tempFolder = rawPrefix.endsWith('/') ? rawPrefix.slice(0, -1) : rawPrefix;
  const permanentFolder =
    (opts?.permanentFolder && opts.permanentFolder.trim()) || CLOUDINARY_CONFIG.FOLDER;

  const inTempFolder = publicId.startsWith(`${tempFolder}/`);

  // Fetch resource to inspect tags and existence
  const res = await cloudinary.api.resource(publicId).catch(() => null as any);
  if (!res) throw new Error('Cloudinary resource not found');
  const tags: string[] = Array.isArray((res as any).tags) ? ((res as any).tags as string[]) : [];
  const isTempTagged = tags.includes('temp');

  let finalPublicId = publicId;
  if (inTempFolder) {
    // Keep basename (likely sha1) and move to permanent folder
    const base = publicId.slice(tempFolder.length + 1);
    const target = `${permanentFolder}/${base}`;
    if (target !== publicId) {
      try {
        await cloudinary.uploader.rename(publicId, target, { overwrite: false });
        finalPublicId = target;
      } catch (e) {
        // If target exists, reuse it
        const exists = await cloudinary.api.resource(target).catch(() => null as any);
        if (exists) {
          finalPublicId = target;
        } else {
          throw e;
        }
      }
    }
  }

  // Update tags: remove 'temp', add 'used'
  const newTags = tags.filter((t) => t !== 'temp');
  if (!newTags.includes('used')) newTags.push('used');
  await cloudinary.uploader.explicit(finalPublicId, { type: 'upload', tags: newTags.join(',') });

  // Build final URL with transformation parity
  const tr = CLOUDINARY_CONFIG.TRANSFORMATION?.[0];
  const transformation = tr ? [{ quality: tr.quality, fetch_format: tr.fetch_format }] : undefined;
  const finalUrl = cloudinary.url(finalPublicId, { secure: true, transformation });
  return { url: finalUrl, public_id: finalPublicId };
}
