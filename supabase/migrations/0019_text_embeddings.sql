-- Text embeddings for books (1536 dims; OpenAI text-embedding-3-small default)
-- Requires extension "vector" (enabled in 00000000000000_extensions.sql)

create table if not exists public.book_text_embeddings (
  book_id uuid primary key references public.books(id) on delete cascade,
  embedding vector(1536) not null
);

-- HNSW index for cosine distance
create index if not exists book_text_embeddings_embedding_hnsw
  on public.book_text_embeddings using hnsw (embedding vector_cosine_ops)
  with (m = 16, ef_construction = 64);

-- RPC: cosine distance KNN search by text embedding, optional category type filter
create or replace function public.search_books_by_text_embedding(
  q vector(1536),
  match_limit int default 20,
  p_category_type text default null
)
returns table (book_id uuid, distance real)
language sql
stable
as $$
  select bte.book_id, (bte.embedding <=> q)::real as distance
  from public.book_text_embeddings bte
  join public.books b on b.id = bte.book_id
  join public.categories c on c.id = b.category_id
  where (p_category_type is null or c.type = p_category_type)
  order by bte.embedding <=> q
  limit match_limit
$$;

grant execute on function public.search_books_by_text_embedding(vector, int, text) to anon, authenticated, service_role;

