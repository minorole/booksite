-- 0003_rpcs.sql — core RPCs (search blend, vector NN, transactional order)

-- Simple blended search: English FTS + zh trigram, optional tags + category filter
CREATE OR REPLACE FUNCTION public.search_books(
  q text DEFAULT NULL,
  tag_names text[] DEFAULT NULL,
  category_type text DEFAULT NULL,
  page_limit int DEFAULT 24,
  after_updated_at timestamptz DEFAULT NULL,
  after_id uuid DEFAULT NULL
)
RETURNS SETOF public.books
LANGUAGE sql
STABLE
AS $$
  WITH base AS (
    SELECT b.id,
      b.updated_at,
      -- english fts rank
      CASE WHEN q IS NULL OR length(q) = 0 THEN 0
           ELSE ts_rank_cd(b.search_tsv_en, plainto_tsquery('english', q)) END AS fts_rank,
      -- zh trigram similarity (title + author)
      CASE WHEN q IS NULL OR length(q) = 0 THEN 0
           ELSE GREATEST(similarity(b.title_zh, q), similarity(b.author_zh, q)) END AS zh_sim
    FROM public.books b
    LEFT JOIN public.categories c ON c.id = b.category_id
    WHERE (
      q IS NULL OR
      ts_rank_cd(b.search_tsv_en, plainto_tsquery('english', q)) > 0 OR
      similarity(b.title_zh, q) > 0.3 OR similarity(b.author_zh, q) > 0.3
    )
    AND (
      category_type IS NULL OR (c.type = category_type)
    )
    AND (
      after_updated_at IS NULL OR (b.updated_at, b.id) < (after_updated_at, coalesce(after_id, '00000000-0000-0000-0000-000000000000'))
    )
  ),
  filtered_ids AS (
    SELECT DISTINCT b.id, b.updated_at
    FROM base b
    LEFT JOIN public.book_tags bt ON bt.book_id = b.id
    LEFT JOIN public.tags t ON t.id = bt.tag_id
    WHERE (
      tag_names IS NULL OR array_length(tag_names, 1) IS NULL OR t.name = ANY(tag_names)
    )
  )
  SELECT b0.*
  FROM public.books b0
  JOIN filtered_ids f ON f.id = b0.id
  ORDER BY b0.updated_at DESC, b0.id DESC
  LIMIT page_limit;
$$;

-- Vector nearest neighbors by book id
CREATE OR REPLACE FUNCTION public.similar_books_nn(
  src_book_id uuid,
  k int DEFAULT 10
)
RETURNS TABLE (similar_book_id uuid, score real)
LANGUAGE sql
STABLE
AS $$
  SELECT b2.id AS similar_book_id, (b1.embedding <=> b2.embedding)::real AS score
  FROM public.books b1
  JOIN public.books b2 ON b2.id <> b1.id
  WHERE b1.id = src_book_id
    AND b1.embedding IS NOT NULL
    AND b2.embedding IS NOT NULL
  ORDER BY b1.embedding <=> b2.embedding
  LIMIT k;
$$;

-- Monthly cap helper (default 50 items/month), admins bypass
CREATE OR REPLACE FUNCTION public.can_place_order(
  user_id uuid,
  items_count int
)
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  WITH monthly AS (
    SELECT COALESCE(SUM(total_items), 0) AS total
    FROM public.orders o
    WHERE o.user_id = user_id
      AND o.created_at >= (now() - interval '30 days')
  )
  SELECT CASE
    WHEN public.is_admin() THEN true
    ELSE (SELECT total FROM monthly) + items_count <= 50
  END;
$$;

-- Transactional order placement: validates stock, inserts order + items, decrements inventory
CREATE OR REPLACE FUNCTION public.place_order(
  user_id uuid,
  shipping_address_id uuid,
  items jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_order_id uuid;
  v_total_items int := 0;
  v_book_id uuid;
  v_qty int;
  v_rec record;
BEGIN
  -- Validate monthly limit
  SELECT SUM( (elem->>'quantity')::int ) INTO v_total_items
  FROM jsonb_array_elements(items) AS elem;

  IF NOT public.can_place_order(user_id, COALESCE(v_total_items,0)) THEN
    RAISE EXCEPTION 'Monthly limit exceeded';
  END IF;

  -- Create order
  v_order_id := extensions.uuid_generate_v4();
  INSERT INTO public.orders(id, user_id, shipping_address_id, total_items, status)
  VALUES (v_order_id, user_id, shipping_address_id, COALESCE(v_total_items,0), 'PENDING');

  -- Process items with stock checks
  FOR v_rec IN SELECT elem FROM jsonb_array_elements(items) AS elem
  LOOP
    v_book_id := (v_rec.elem->>'book_id')::uuid;
    v_qty := (v_rec.elem->>'quantity')::int;

    -- lock and validate stock
    PERFORM 1 FROM public.books WHERE id = v_book_id FOR UPDATE;
    IF (SELECT quantity FROM public.books WHERE id = v_book_id) < v_qty THEN
      RAISE EXCEPTION 'Insufficient stock for book %', v_book_id;
    END IF;

    -- insert order item
    INSERT INTO public.order_items(order_id, book_id, quantity) VALUES (v_order_id, v_book_id, v_qty);

    -- decrement stock
    UPDATE public.books SET quantity = quantity - v_qty, last_quantity_update = now(), updated_at = now() WHERE id = v_book_id;
  END LOOP;

  RETURN v_order_id;
END;
$$;
