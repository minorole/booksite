import { getServerDb } from '@/lib/db/client'
import type { BookSearch, BookBase, BookCreate, BookUpdate } from '@/lib/admin/types'
import type { CategoryType } from '@/lib/db/enums'
import { resolveCategoryId } from './utils'

export async function searchBooksDb(args: BookSearch): Promise<BookBase[]> {
  const db = await getServerDb()

  // Prepare RPC args
  const q = args.title && args.title.trim().length > 0 ? args.title.trim() : null
  const requiredTags = Array.isArray(args.tags) ? args.tags.filter(Boolean) : []
  const tag_names = requiredTags.length > 0 ? requiredTags : null
  const category_type = args.category_type ?? null

  const { data: rows, error } = await db.rpc('search_books' as any, {
    q,
    tag_names,
    category_type,
    page_limit: 50,
  } as any)
  if (error) {
    throw new Error(`Failed to search books: ${error.message}`)
  }

  const list = (rows ?? []) as any[]
  if (list.length === 0) return []

  const bookIds = list.map((b) => b.id as string)
  const categoryIds = Array.from(new Set(list.map((b) => b.category_id as string)))

  // Fetch category types for the matched books
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

  // Fetch tags for matched books
  const tagsByBook = new Map<string, string[]>()
  if (bookIds.length > 0) {
    const { data: tagRows, error: tagsErr } = await db
      .from('book_tags')
      .select('book_id, tags:tags ( name )')
      .in('book_id', bookIds)
    if (tagsErr) {
      throw new Error(`Failed to fetch book tags: ${tagsErr.message}`)
    }
    for (const row of tagRows ?? []) {
      const name = (row as any)?.tags?.name as string | undefined
      if (!name) continue
      const arr = tagsByBook.get((row as any).book_id) ?? []
      arr.push(name)
      tagsByBook.set((row as any).book_id, arr)
    }
  }

  const results: BookBase[] = []
  for (const b of list) {
    const names = tagsByBook.get(b.id as string) ?? []
    const catType = catTypeById.get((b as any).category_id) ?? ('OTHER_BOOKS' as CategoryType)
    // Apply quantity filters client-side if provided
    if (typeof args.min_quantity === 'number' && b.quantity < args.min_quantity) continue
    if (typeof args.max_quantity === 'number' && b.quantity > args.max_quantity) continue
    results.push({
      title_zh: b.title_zh,
      title_en: b.title_en ?? null,
      description_zh: b.description_zh,
      description_en: b.description_en ?? null,
      category_type: catType,
      quantity: b.quantity,
      tags: names,
      cover_image: b.cover_image ?? ''
    })
  }

  return results
}

// Create a book with normalized tags
export async function createBookDb(input: BookCreate): Promise<BookBase & { id: string }> {
  const db = await getServerDb()
  const categoryId = await resolveCategoryId(input.category_type)
  if (!categoryId) throw new Error('Invalid category_type')

  const insert = {
    title_zh: input.title_zh,
    title_en: input.title_en ?? null,
    description_zh: input.description_zh,
    description_en: input.description_en ?? null,
    category_id: categoryId,
    quantity: input.quantity,
    cover_image: input.cover_image || null,
    content_summary_zh: input.content_summary_zh ?? null,
    content_summary_en: input.content_summary_en ?? null,
    author_zh: input.author_zh ?? null,
    author_en: input.author_en ?? null,
    publisher_zh: input.publisher_zh ?? null,
    publisher_en: input.publisher_en ?? null,
    image_analysis_data: (input.analysis_result as any) ?? null,
  }

  const { data: created, error: insErr } = await db
    .from('books')
    .insert(insert)
    .select('id, category_id')
    .single()
  if (insErr || !created) throw new Error(`Failed to create book: ${insErr?.message}`)
  const bookId = (created as any).id as string

  // Upsert tags and link
  const tagNames = Array.isArray(input.tags) ? input.tags.filter(Boolean) : []
  let finalTags: string[] = []
  if (tagNames.length > 0) {
    const { data: upserted, error: tagErr } = await db
      .from('tags')
      .upsert(tagNames.map((n) => ({ name: n })), { onConflict: 'name' })
      .select('id, name')
    if (tagErr) throw new Error(`Failed to upsert tags: ${tagErr.message}`)
    if (upserted) {
      finalTags = upserted.map((t) => (t as any).name as string)
      const linkRows = upserted.map((t) => ({ book_id: bookId, tag_id: (t as any).id as string }))
      if (linkRows.length > 0) {
        await db.from('book_tags').upsert(linkRows, { onConflict: 'book_id,tag_id' })
      }
    }
  }

  // Build projection
  const catType = await (async () => {
    const { data } = await db.from('categories').select('type').eq('id', (created as any).category_id).single()
    return ((data as any)?.type ?? 'OTHER_BOOKS') as CategoryType
  })()

  return {
    id: bookId,
    title_zh: insert.title_zh,
    title_en: insert.title_en,
    description_zh: insert.description_zh,
    description_en: insert.description_en,
    category_type: catType,
    quantity: insert.quantity,
    tags: finalTags,
    cover_image: insert.cover_image ?? ''
  }
}

// Update a book and its tags (replace semantics)
export async function updateBookDb(id: string, patch: Omit<BookUpdate, 'book_id'>): Promise<BookBase> {
  const db = await getServerDb()

  // Resolve new category if provided
  let category_id: string | undefined
  if (patch.category_type) {
    const cid = await resolveCategoryId(patch.category_type)
    if (!cid) throw new Error('Invalid category_type')
    category_id = cid
  }

  // Build update object
  const update: any = {}
  if (typeof patch.title_zh === 'string') update.title_zh = patch.title_zh
  if (patch.title_en !== undefined) update.title_en = patch.title_en
  if (typeof patch.description_zh === 'string') update.description_zh = patch.description_zh
  if (patch.description_en !== undefined) update.description_en = patch.description_en
  if (typeof patch.quantity === 'number') update.quantity = patch.quantity
  if (patch.cover_image !== undefined) update.cover_image = patch.cover_image
  if (category_id) update.category_id = category_id
  if (patch.analysis_result !== undefined) update.image_analysis_data = patch.analysis_result as any

  if (Object.keys(update).length > 0) {
    const { error: updErr } = await db.from('books').update(update).eq('id', id)
    if (updErr) throw new Error(`Failed to update book: ${updErr.message}`)
  }

  // Replace tags if provided
  let finalTags: string[] | undefined
  if (patch.tags) {
    const tagNames = patch.tags.filter(Boolean)
    finalTags = []
    // Upsert names
    const { data: upserted, error: tagErr } = await db
      .from('tags')
      .upsert(tagNames.map((n) => ({ name: n })), { onConflict: 'name' })
      .select('id, name')
    if (tagErr) throw new Error(`Failed to upsert tags: ${tagErr.message}`)

    // Fetch current links
    const { data: currentLinks } = await db
      .from('book_tags')
      .select('book_id, tag_id, tags:tags(name)')
      .eq('book_id', id)

    const desiredIds = new Set<string>((upserted ?? []).map((t) => (t as any).id as string))
    const currentIds = new Set<string>((currentLinks ?? []).map((l) => (l as any).tag_id as string))

    // Add missing links
    const toAdd = [...desiredIds].filter((x) => !currentIds.has(x)).map((tag_id) => ({ book_id: id, tag_id }))
    if (toAdd.length > 0) await db.from('book_tags').insert(toAdd)

    // Remove stale links
    const toRemove = [...currentIds].filter((x) => !desiredIds.has(x))
    for (const tag_id of toRemove) {
      await db.from('book_tags').delete().eq('book_id', id).eq('tag_id', tag_id)
    }

    finalTags = (upserted ?? []).map((t) => (t as any).name as string)
  }

  // Build projection
  const { data: book, error: selErr } = await db
    .from('books')
    .select('id, title_zh, title_en, description_zh, description_en, quantity, cover_image, category_id')
    .eq('id', id)
    .single()
  if (selErr || !book) throw new Error(`Failed to fetch updated book: ${selErr?.message}`)

  const { data: cat } = await db
    .from('categories')
    .select('type')
    .eq('id', (book as any).category_id)
    .single()
  const category_type = ((cat as any)?.type ?? 'OTHER_BOOKS') as CategoryType

  // If tags not provided, fetch names
  let tags: string[]
  if (finalTags) {
    tags = finalTags
  } else {
    const { data: tagRows } = await db
      .from('book_tags')
      .select('tags:tags(name)')
      .eq('book_id', id)
    tags = (tagRows ?? [])
      .map((r) => ((r as any).tags?.name as string | undefined))
      .filter((n): n is string => !!n)
  }

  return {
    title_zh: (book as any).title_zh,
    title_en: (book as any).title_en ?? null,
    description_zh: (book as any).description_zh,
    description_en: (book as any).description_en ?? null,
    category_type,
    quantity: (book as any).quantity,
    tags,
    cover_image: (book as any).cover_image ?? ''
  }
}

