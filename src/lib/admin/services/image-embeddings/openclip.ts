import { standardizeImageUrl, getSimilarityImageUrl } from '@/lib/admin/image-upload';

function getClipConfig() {
  const url = process.env.CLIP_EMBEDDINGS_URL?.trim();
  if (!url) throw new Error('CLIP_EMBEDDINGS_URL is not set');
  const apiKey = process.env.CLIP_EMBEDDINGS_API_KEY?.trim();
  return { url, apiKey };
}

/**
 * Calls a self-hosted OpenCLIP HTTP service that accepts an image URL
 * and returns a 512-dim embedding vector.
 * Expected response: { embedding: number[] }
 */
export async function createImageEmbeddingClip(imageUrl: string): Promise<number[]> {
  const { url, apiKey } = getClipConfig();
  const standardized = await standardizeImageUrl(imageUrl);
  const normalized = getSimilarityImageUrl(standardized);
  const rsp = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
    },
    body: JSON.stringify({ image_url: normalized }),
  });
  if (!rsp.ok) throw new Error(`CLIP service error: ${rsp.status}`);
  const json = (await rsp.json().catch(() => ({}))) as { embedding?: unknown };
  const vec = (json as any)?.embedding;
  if (!Array.isArray(vec) || vec.length !== 512) {
    throw new Error('Invalid CLIP embedding response (expected length 512)');
  }
  return vec as number[];
}
