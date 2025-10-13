import { getServerDb } from '@/lib/db/client'
import type { BookBase } from '@/lib/admin/types'
import type { CategoryType } from '@/lib/db/enums'

// Simple duplicate check based on titles/authors, returns basic projections
export async function checkDuplicatesDb(args: {
  title_zh: string
  title_en?: string | null
  author_zh?: string | null
  author_en?: string | null
  publisher_zh?: string | null
  publisher_en?: string | null
}): Promise<BookBase[]> {
  const db = await getServerDb()
  let query = db
    .from('books')
    .select('id, title_zh, title_en, description_zh, description_en, cover_image, quantity, category_id')

  const orParts: string[] = []
  if (args.title_zh) orParts.push(`title_zh.ilike.%${args.title_zh}%`)
  if (args.title_en) orParts.push(`title_en.ilike.%${args.title_en}%`)
  if (args.author_zh) orParts.push(`author_zh.ilike.%${args.author_zh}%`)
  if (args.author_en) orParts.push(`author_en.ilike.%${args.author_en}%`)
  if (orParts.length > 0) query = query.or(orParts.join(','))

  const { data, error } = await query.limit(50)
  if (error) throw new Error(`Failed to search duplicates: ${error.message}`)

  const list = (data ?? []) as any[]
  if (list.length === 0) return []

  const bookIds = list.map((b) => b.id as string)
  const categoryIds = Array.from(new Set(list.map((b) => b.category_id as string)))

  // Fetch category types
  const catTypeById = new Map<string, CategoryType>()
  if (categoryIds.length > 0) {
    const { data: cats } = await db
      .from('categories')
      .select('id, type')
      .in('id', categoryIds)
    for (const c of cats ?? []) {
      catTypeById.set((c as any).id, (c as any).type as CategoryType)
    }
  }

  // Fetch tags
  const tagsByBook = new Map<string, string[]>()
  if (bookIds.length > 0) {
    const { data: tagRows } = await db
      .from('book_tags')
      .select('book_id, tags:tags(name)')
      .in('book_id', bookIds)
    for (const row of tagRows ?? []) {
      const n = (row as any)?.tags?.name as string | undefined
      if (!n) continue
      const arr = tagsByBook.get((row as any).book_id) ?? []
      arr.push(n)
      tagsByBook.set((row as any).book_id, arr)
    }
  }

  return list.map((b) => ({
    title_zh: b.title_zh,
    title_en: b.title_en ?? null,
    description_zh: b.description_zh,
    description_en: b.description_en ?? null,
    category_type: catTypeById.get(b.category_id) ?? ('OTHER_BOOKS' as CategoryType),
    quantity: b.quantity,
    tags: tagsByBook.get(b.id) ?? [],
    cover_image: b.cover_image ?? ''
  }))
}

