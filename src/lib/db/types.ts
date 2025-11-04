import type { Tables } from '@/types/supabase.generated';

// Narrow, app-facing projections for DB selects and RPCs

export type CategoryProjection = Pick<
  Tables<'categories'>,
  'id' | 'type' | 'name_zh' | 'name_en' | 'description_zh' | 'description_en'
>;

export type BookProjection = Pick<
  Tables<'books'>,
  | 'id'
  | 'title_zh'
  | 'title_en'
  | 'description_zh'
  | 'description_en'
  | 'cover_image'
  | 'quantity'
  | 'created_at'
  | 'updated_at'
  | 'has_english_translation'
  | 'content_summary_zh'
  | 'content_summary_en'
  | 'author_zh'
  | 'author_en'
  | 'publisher_zh'
  | 'publisher_en'
> & { category: CategoryProjection };

export type TagJoinRow = { book_id: string; tags: { name: string | null } | null };

// Shape returned via search_books RPC used by admin search
export type SearchBooksRow = Pick<
  Tables<'books'>,
  | 'id'
  | 'category_id'
  | 'title_zh'
  | 'title_en'
  | 'description_zh'
  | 'description_en'
  | 'quantity'
  | 'cover_image'
>;
