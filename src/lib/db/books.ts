import { getServerDb } from '@/lib/db/client'

type CategoryProjection = {
  id: string
  type: string
  name_zh: string
  name_en: string
  description_zh: string | null
  description_en: string | null
}

type BookRow = {
  id: string
  title_zh: string
  title_en: string | null
  description_zh: string
  description_en: string | null
  cover_image: string | null
  quantity: number
  created_at: string
  updated_at: string
  has_english_translation: boolean
  content_summary_zh: string | null
  content_summary_en: string | null
  author_zh: string | null
  author_en: string | null
  publisher_zh: string | null
  publisher_en: string | null
  category: CategoryProjection
}

export type BookWithCategoryAndTags = BookRow & { search_tags: string[] }

export async function listBooks(): Promise<BookWithCategoryAndTags[]> {
  const db = await getServerDb()

  // 1) Fetch books with category
  const sel = `
    id, title_zh, title_en, description_zh, description_en,
    cover_image, quantity, created_at, updated_at, has_english_translation,
    content_summary_zh, content_summary_en, author_zh, author_en, publisher_zh, publisher_en,
    category:categories!books_category_id_fkey (
      id, type, name_zh, name_en, description_zh, description_en
    )
  `

  const { data: books, error: booksError } = await db
    .from('books')
    .select(sel)
    .order('updated_at', { ascending: false })

  if (booksError) {
    throw new Error(`Failed to fetch books: ${booksError.message}`)
  }

  const bookIds = (books ?? []).map((b: any) => b.id as string)
  const tagsByBook = new Map<string, string[]>()

  if (bookIds.length > 0) {
    // 2) Fetch tags for all books in one go and group
    const { data: tagRows, error: tagsError } = await db
      .from('book_tags')
      .select('book_id, tags:tags ( name )')
      .in('book_id', bookIds)

    if (tagsError) {
      throw new Error(`Failed to fetch book tags: ${tagsError.message}`)
    }

    for (const row of tagRows ?? []) {
      const name = (row as any)?.tags?.name as string | undefined
      if (!name) continue
      const arr = tagsByBook.get((row as any).book_id) ?? []
      arr.push(name)
      tagsByBook.set((row as any).book_id, arr)
    }
  }

  return (books ?? []).map((b: any) => ({
    id: b.id,
    title_zh: b.title_zh,
    title_en: b.title_en,
    description_zh: b.description_zh,
    description_en: b.description_en,
    cover_image: b.cover_image,
    quantity: b.quantity,
    created_at: b.created_at,
    updated_at: b.updated_at,
    has_english_translation: b.has_english_translation,
    content_summary_zh: b.content_summary_zh,
    content_summary_en: b.content_summary_en,
    author_zh: b.author_zh,
    author_en: b.author_en,
    publisher_zh: b.publisher_zh,
    publisher_en: b.publisher_en,
    category: b.category,
    search_tags: tagsByBook.get(b.id) ?? [],
  }))
}

export async function getBook(id: string): Promise<BookWithCategoryAndTags | null> {
  const db = await getServerDb()

  const sel = `
    id, title_zh, title_en, description_zh, description_en,
    cover_image, quantity, created_at, updated_at, has_english_translation,
    content_summary_zh, content_summary_en, author_zh, author_en, publisher_zh, publisher_en,
    category:categories!books_category_id_fkey (
      id, type, name_zh, name_en, description_zh, description_en
    )
  `

  const { data: b, error } = await db
    .from('books')
    .select(sel)
    .eq('id', id)
    .maybeSingle()

  if (error) {
    throw new Error(`Failed to fetch book: ${error.message}`)
  }
  if (!b) return null

  const { data: tagRows, error: tagsError } = await db
    .from('book_tags')
    .select('book_id, tags:tags ( name )')
    .eq('book_id', id)

  if (tagsError) {
    throw new Error(`Failed to fetch book tags: ${tagsError.message}`)
  }

  const names: string[] = []
  for (const row of tagRows ?? []) {
    const n = (row as any)?.tags?.name as string | undefined
    if (n) names.push(n)
  }

  return {
    id: (b as any).id,
    title_zh: (b as any).title_zh,
    title_en: (b as any).title_en,
    description_zh: (b as any).description_zh,
    description_en: (b as any).description_en,
    cover_image: (b as any).cover_image,
    quantity: (b as any).quantity,
    created_at: (b as any).created_at,
    updated_at: (b as any).updated_at,
    has_english_translation: (b as any).has_english_translation,
    content_summary_zh: (b as any).content_summary_zh,
    content_summary_en: (b as any).content_summary_en,
    author_zh: (b as any).author_zh,
    author_en: (b as any).author_en,
    publisher_zh: (b as any).publisher_zh,
    publisher_en: (b as any).publisher_en,
    category: (b as any).category,
    search_tags: names,
  }
}
