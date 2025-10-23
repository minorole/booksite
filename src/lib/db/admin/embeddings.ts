import { getServerDb } from '@/lib/db/client'
import type { CategoryType } from '@/lib/db/enums'
import type { BookBase } from '@/lib/admin/types'
import type { TagJoinRow } from '@/lib/db/types'

export async function upsertBookTextEmbedding(bookId: string, embedding: number[]): Promise<void> {
  const db = (await getServerDb()) as any
  const { error } = await db
    .from('book_text_embeddings')
    .upsert({ book_id: bookId, embedding }, { onConflict: 'book_id' })
  if (error) throw new Error(`Failed to upsert embedding: ${error.message}`)
}

export async function searchBooksByTextEmbedding(params: {
  embedding: number[]
  limit?: number
  category_type?: CategoryType | null
}): Promise<Array<{ book_id: string; distance: number }>> {
  const db = (await getServerDb()) as any
  const { data, error } = await db.rpc('search_books_by_text_embedding', {
    q: params.embedding as unknown as number[],
    match_limit: (params.limit ?? 20) as number,
    p_category_type: (params.category_type ?? null) as unknown as string | null,
  } as any)
  if (error) throw new Error(`KNN search failed: ${error.message}`)
  const rows = (data ?? []) as Array<{ book_id: string; distance: number }>
  return rows
}

export async function getBooksByIds(ids: string[]): Promise<BookBase[]> {
  if (ids.length === 0) return []
  const db = await getServerDb()
  const { data, error } = await db
    .from('books')
    .select('id, title_zh, title_en, description_zh, description_en, cover_image, quantity, category_id')
    .in('id', ids)
  if (error) throw new Error(`Failed to fetch books: ${error.message}`)
  const list = (data ?? []) as Array<{ id: string; title_zh: string; title_en: string | null; description_zh: string; description_en: string | null; cover_image: string | null; quantity: number; category_id: string }>

  if (list.length === 0) return []
  const categoryIds = Array.from(new Set(list.map((b) => b.category_id)))
  const catTypeById = new Map<string, CategoryType>()
  if (categoryIds.length > 0) {
    const { data: cats } = await db.from('categories').select('id, type').in('id', categoryIds)
    for (const c of (cats ?? []) as Array<{ id: string; type: CategoryType }>) {
      catTypeById.set(c.id, c.type)
    }
  }
  const tagsByBook = new Map<string, string[]>()
  const { data: tagRows } = await db
    .from('book_tags')
    .select('book_id, tags:tags(name)')
    .in('book_id', ids)
  for (const row of (tagRows ?? []) as TagJoinRow[]) {
    const n = row.tags?.name ?? undefined
    if (!n) continue
    const arr = tagsByBook.get(row.book_id) ?? []
    arr.push(n)
    tagsByBook.set(row.book_id, arr)
  }

  return list.map((b) => ({
    id: b.id,
    title_zh: b.title_zh,
    title_en: b.title_en,
    description_zh: b.description_zh,
    description_en: b.description_en,
    category_type: catTypeById.get(b.category_id) ?? ('OTHER_BOOKS' as CategoryType),
    quantity: b.quantity,
    tags: tagsByBook.get(b.id) ?? [],
    cover_image: b.cover_image,
  }))
}

export async function getBooksMissingEmbeddings(limit = 100): Promise<Array<{
  id: string
  title_zh: string | null
  title_en: string | null
  author_zh: string | null
  author_en: string | null
  publisher_zh: string | null
  publisher_en: string | null
}>> {
  const db = (await getServerDb()) as any
  const { data: existing } = await db.from('book_text_embeddings').select('book_id')
  const exclude = new Set<string>((existing ?? []).map((r: any) => r.book_id))
  const { data, error } = await db
    .from('books')
    .select('id, title_zh, title_en, author_zh, author_en, publisher_zh, publisher_en')
    .limit(limit * 2)
  if (error) throw new Error(`Failed to fetch books missing embeddings: ${error.message}`)
  const rows = ((data ?? []) as any[]).filter((r) => !exclude.has(r.id)).slice(0, limit)
  return rows as any
}
