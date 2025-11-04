import { createImageEmbeddingClip } from './image-embeddings/openclip';
import {
  getBooksMissingImageEmbeddingsClip,
  upsertBookImageEmbeddingClip,
} from '@/lib/db/admin/image-embeddings';
import { handleOperationError } from './utils';

export async function backfillMissingImageEmbeddingsClip(
  limit = 100,
  batchSize = 10,
): Promise<
  | { processed: number; created: number; errors: number }
  | { success: false; message: string; error: any }
> {
  try {
    const rows = await getBooksMissingImageEmbeddingsClip(limit);
    let processed = 0;
    let created = 0;
    let errors = 0;
    for (let i = 0; i < rows.length; i += batchSize) {
      const slice = rows.slice(i, i + batchSize);
      await Promise.all(
        slice.map(async (r) => {
          try {
            if (!r.cover_image) {
              processed++;
              return;
            }
            const vec = await createImageEmbeddingClip(r.cover_image);
            await upsertBookImageEmbeddingClip(r.id, vec);
            processed++;
            created++;
          } catch {
            processed++;
            errors++;
          }
        }),
      );
    }
    return { processed, created, errors };
  } catch (error) {
    return handleOperationError(error, 'backfill image embeddings') as any;
  }
}
