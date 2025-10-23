-- Image embeddings (CLIP ViT-L/14, 512 dims)
-- Requires extension "vector" (enabled in 00000000000000_extensions.sql)

create table if not exists public.book_image_embeddings_clip (
  book_id uuid primary key references public.books(id) on delete cascade,
  embedding vector(512) not null
);

-- HNSW index for cosine distance
create index if not exists book_image_embeddings_clip_hnsw
  on public.book_image_embeddings_clip using hnsw (embedding vector_cosine_ops)
  with (m = 16, ef_construction = 64);

-- RPC: cosine distance KNN search by CLIP image embedding, optional category type filter
create or replace function public.search_books_by_image_embedding_clip(
  q vector(512),
  match_limit int default 20,
  p_category_type text default null
)
returns table (book_id uuid, distance real)
language sql
stable
as $$
  select bie.book_id, (bie.embedding <=> q)::real as distance
  from public.book_image_embeddings_clip bie
  join public.books b on b.id = bie.book_id
  join public.categories c on c.id = b.category_id
  where (p_category_type is null or c.type = p_category_type)
  order by bie.embedding <=> q
  limit match_limit
$$;

grant execute on function public.search_books_by_image_embedding_clip(vector, int, text) to anon, authenticated, service_role;

