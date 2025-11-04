import { getServerDb } from '@/lib/db/client';
import type { BookProjection, TagJoinRow } from '@/lib/db/types';

export type BookWithCategoryAndTags = BookProjection & { search_tags: string[] };

export async function listBooks(): Promise<BookWithCategoryAndTags[]> {
  const db = await getServerDb();

  // 1) Fetch books with category
  const sel = `
    id, title_zh, title_en, description_zh, description_en,
    cover_image, quantity, created_at, updated_at, has_english_translation,
    content_summary_zh, content_summary_en, author_zh, author_en, publisher_zh, publisher_en,
    category:categories!books_category_id_fkey (
      id, type, name_zh, name_en, description_zh, description_en
    )
  `;

  const { data: books, error: booksError } = await db
    .from('books')
    .select(sel)
    .order('updated_at', { ascending: false });

  if (booksError) {
    throw new Error(`Failed to fetch books: ${booksError.message}`);
  }

  const bookIds = ((books ?? []) as BookProjection[]).map((b) => b.id);
  const tagsByBook = new Map<string, string[]>();

  if (bookIds.length > 0) {
    // 2) Fetch tags for all books in one go and group
    const { data: tagRows, error: tagsError } = await db
      .from('book_tags')
      .select('book_id, tags:tags ( name )')
      .in('book_id', bookIds);

    if (tagsError) {
      throw new Error(`Failed to fetch book tags: ${tagsError.message}`);
    }

    for (const row of (tagRows ?? []) as TagJoinRow[]) {
      const name = row.tags?.name ?? undefined;
      if (!name) continue;
      const arr = tagsByBook.get(row.book_id) ?? [];
      arr.push(name);
      tagsByBook.set(row.book_id, arr);
    }
  }

  return ((books ?? []) as BookProjection[]).map((b) => ({
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
  }));
}

export async function getBook(id: string): Promise<BookWithCategoryAndTags | null> {
  const db = await getServerDb();

  const sel = `
    id, title_zh, title_en, description_zh, description_en,
    cover_image, quantity, created_at, updated_at, has_english_translation,
    content_summary_zh, content_summary_en, author_zh, author_en, publisher_zh, publisher_en,
    category:categories!books_category_id_fkey (
      id, type, name_zh, name_en, description_zh, description_en
    )
  `;

  const { data: b, error } = await db.from('books').select(sel).eq('id', id).maybeSingle();

  if (error) {
    throw new Error(`Failed to fetch book: ${error.message}`);
  }
  if (!b) return null;

  const { data: tagRows, error: tagsError } = await db
    .from('book_tags')
    .select('book_id, tags:tags ( name )')
    .eq('book_id', id);

  if (tagsError) {
    throw new Error(`Failed to fetch book tags: ${tagsError.message}`);
  }

  const names: string[] = [];
  for (const row of (tagRows ?? []) as TagJoinRow[]) {
    const n = row.tags?.name ?? undefined;
    if (n) names.push(n);
  }

  const book = b as BookProjection;
  return {
    id: book.id,
    title_zh: book.title_zh,
    title_en: book.title_en,
    description_zh: book.description_zh,
    description_en: book.description_en,
    cover_image: book.cover_image,
    quantity: book.quantity,
    created_at: book.created_at,
    updated_at: book.updated_at,
    has_english_translation: book.has_english_translation,
    content_summary_zh: book.content_summary_zh,
    content_summary_en: book.content_summary_en,
    author_zh: book.author_zh,
    author_en: book.author_en,
    publisher_zh: book.publisher_zh,
    publisher_en: book.publisher_en,
    category: book.category,
    search_tags: names,
  };
}
