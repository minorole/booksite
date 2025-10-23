import { getServerDb } from '@/lib/db/client'
import type { CategoryType } from '@/lib/db/enums'

export async function upsertBookImageEmbeddingClip(bookId: string, embedding: number[]): Promise<void> {
  const db = (await getServerDb()) as any
  const { error } = await db
    .from('book_image_embeddings_clip')
    .upsert({ book_id: bookId, embedding }, { onConflict: 'book_id' })
  if (error) throw new Error(`Failed to upsert image embedding: ${error.message}`)
}

export async function searchBooksByImageEmbeddingClip(params: {
  embedding: number[]
  limit?: number
  category_type?: CategoryType | null
}): Promise<Array<{ book_id: string; distance: number }>> {
  const db = (await getServerDb()) as any
  const { data, error } = await db.rpc('search_books_by_image_embedding_clip', {
    q: params.embedding as unknown as number[],
    match_limit: params.limit ?? 20,
    p_category_type: (params.category_type ?? null) as unknown as string | null,
  })
  if (error) throw new Error(`Image KNN search failed: ${error.message}`)
  return (data ?? []) as Array<{ book_id: string; distance: number }>
}

export async function getBooksMissingImageEmbeddingsClip(limit = 100): Promise<Array<{ id: string; cover_image: string | null }>> {
  const db = (await getServerDb()) as any
  const { data: existing } = await db.from('book_image_embeddings_clip').select('book_id')
  const exclude = new Set<string>((existing ?? []).map((r: any) => r.book_id))
  const { data, error } = await db
    .from('books')
    .select('id, cover_image')
    .not('cover_image', 'is', null)
    .limit(limit * 2)
  if (error) throw new Error(`Failed to fetch books for image backfill: ${error.message}`)
  const rows = ((data ?? []) as any[]).filter((r) => !exclude.has(r.id)).slice(0, limit)
  return rows as Array<{ id: string; cover_image: string | null }>
}

