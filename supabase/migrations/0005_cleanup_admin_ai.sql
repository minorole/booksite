-- 0005_cleanup_admin_ai.sql — Remove unused admin AI legacy schema elements
-- Safe, idempotent drops guarded with IF EXISTS

-- 1) Drop unused tables: system_prompts, system_settings, tag_history
DROP TABLE IF EXISTS public.system_prompts CASCADE;
DROP TABLE IF EXISTS public.system_settings CASCADE;
DROP TABLE IF EXISTS public.tag_history CASCADE;

-- 2) Drop similarity artifacts not used by current code
DROP FUNCTION IF EXISTS public.similar_books_nn(uuid, int);
DROP TABLE IF EXISTS public.book_similarities CASCADE;

-- 3) Prune unused columns on books
-- Drop vector index then column
DROP INDEX IF EXISTS public.books_embedding_ivfflat_idx;
ALTER TABLE public.books DROP COLUMN IF EXISTS embedding;

-- Remove generic ai_metadata column (superseded by image_analysis_data)
ALTER TABLE public.books DROP COLUMN IF EXISTS ai_metadata;

