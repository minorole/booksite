import { getAdminClient } from './client';
import { getEmbeddingModel } from './models';

/**
 * Creates a text embedding vector using OpenAI embeddings API.
 * Uses a default 1536-dim model unless overridden by OPENAI_EMBEDDINGS_MODEL.
 */
export async function createTextEmbedding(text: string): Promise<number[]> {
  const client = getAdminClient();
  const model = getEmbeddingModel();
  const input = text || '';
  const rsp = await client.embeddings.create({ model, input });
  const vec = rsp.data?.[0]?.embedding;
  if (!Array.isArray(vec)) throw new Error('Embedding API returned no embedding');
  return vec as unknown as number[];
}
