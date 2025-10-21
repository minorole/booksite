-- 0017_fix_place_order_and_seed.sql — Fix place_order param names to avoid ambiguity; seed sample data for a SUPER_ADMIN

BEGIN;

-- 1) Fix place_order to avoid ambiguous column/variable names
DROP FUNCTION IF EXISTS public.place_order(uuid, uuid, jsonb);
CREATE OR REPLACE FUNCTION public.place_order(
  p_user_id uuid,
  p_shipping_address_id uuid,
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
  v_addr record;
  v_snapshot_id uuid;
BEGIN
  -- Validate monthly limit
  SELECT SUM( (elem->>'quantity')::int ) INTO v_total_items
  FROM jsonb_array_elements(items) AS elem;

  IF NOT public.can_place_order(p_user_id, COALESCE(v_total_items,0)) THEN
    RAISE EXCEPTION 'Monthly limit exceeded';
  END IF;

  -- Fetch and validate that address belongs to the user
  SELECT 
    s.recipient_name, s.phone, s.address1, s.address2, s.city, s.state, s.zip, s.country
  INTO v_addr
  FROM public.shipping_addresses s
  WHERE s.id = p_shipping_address_id AND s."user_id" = p_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid address for user';
  END IF;

  -- Create order
  v_order_id := extensions.uuid_generate_v4();
  INSERT INTO public.orders(id, user_id, shipping_address_id, total_items, status)
  VALUES (v_order_id, p_user_id, p_shipping_address_id, COALESCE(v_total_items,0), 'PENDING');

  -- Snapshot the address at time of order
  INSERT INTO public.order_shipping_addresses(
    order_id, user_id, recipient_name, phone, address1, address2, city, state, zip, country, normalized
  ) VALUES (
    v_order_id,
    p_user_id,
    v_addr.recipient_name,
    v_addr.phone,
    v_addr.address1,
    v_addr.address2,
    v_addr.city,
    v_addr.state,
    v_addr.zip,
    v_addr.country,
    NULL
  ) RETURNING id INTO v_snapshot_id;

  UPDATE public.orders SET order_shipping_address_id = v_snapshot_id WHERE id = v_order_id;

  -- Process items with stock checks
  FOR v_rec IN SELECT elem FROM jsonb_array_elements(items) AS elem LOOP
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

-- 2) Seed sample data for one SUPER_ADMIN user (idempotent guards)
WITH u AS (
  SELECT id FROM public.profiles WHERE role = 'SUPER_ADMIN' LIMIT 1
), ensure_cat AS (
  INSERT INTO public.categories(type, name_zh, name_en)
  SELECT 'OTHER_BOOKS', '其他书籍', 'Other Books'
  WHERE NOT EXISTS (SELECT 1 FROM public.categories WHERE type = 'OTHER_BOOKS')
  RETURNING id
), cat AS (
  SELECT id FROM ensure_cat
  UNION ALL
  SELECT id FROM public.categories WHERE type = 'OTHER_BOOKS'
  LIMIT 1
), ensure_b1 AS (
  INSERT INTO public.books(category_id, title_zh, title_en, description_zh, description_en, quantity)
  SELECT c.id, '样例书一', 'Sample Book One', '描述', 'Description', 50 FROM cat c
  WHERE NOT EXISTS (SELECT 1 FROM public.books WHERE title_zh = '样例书一')
  RETURNING id
), b1 AS (
  SELECT id FROM ensure_b1
  UNION ALL SELECT id FROM public.books WHERE title_zh = '样例书一'
  LIMIT 1
), ensure_b2 AS (
  INSERT INTO public.books(category_id, title_zh, title_en, description_zh, description_en, quantity)
  SELECT c.id, '样例书二', 'Sample Book Two', '描述', 'Description', 50 FROM cat c
  WHERE NOT EXISTS (SELECT 1 FROM public.books WHERE title_zh = '样例书二')
  RETURNING id
), b2 AS (
  SELECT id FROM ensure_b2
  UNION ALL SELECT id FROM public.books WHERE title_zh = '样例书二'
  LIMIT 1
), ensure_addr1 AS (
  INSERT INTO public.shipping_addresses(
    "user_id", recipient_name, phone, address1, address2, city, state, zip, country,
    is_default, is_valid, address_hash
  )
  SELECT u.id, 'Admin Recipient', '555-1000', '1 Admin Way', NULL, 'Admin City', 'CA', '94000', 'US',
         true, true, lower('Admin Recipient|555-1000|1 Admin Way||Admin City|CA|94000|US')
  FROM u
  WHERE NOT EXISTS (
    SELECT 1 FROM public.shipping_addresses s WHERE s."user_id" = (SELECT id FROM u) AND s.address1 = '1 Admin Way'
  )
  RETURNING id
), addr1 AS (
  SELECT id FROM ensure_addr1
  UNION ALL
  SELECT id FROM public.shipping_addresses WHERE "user_id" = (SELECT id FROM u) AND address1 = '1 Admin Way'
  LIMIT 1
), ensure_addr2 AS (
  INSERT INTO public.shipping_addresses(
    "user_id", recipient_name, phone, address1, address2, city, state, zip, country,
    is_default, is_valid, address_hash
  )
  SELECT u.id, 'Admin Recipient 2', '555-1001', '2 Admin Street', 'Suite 100', 'Admin Town', 'NY', '10002', 'US',
         false, false, lower('Admin Recipient 2|555-1001|2 Admin Street|Suite 100|Admin Town|NY|10002|US')
  FROM u
  WHERE NOT EXISTS (
    SELECT 1 FROM public.shipping_addresses s WHERE s."user_id" = (SELECT id FROM u) AND s.address1 = '2 Admin Street'
  )
  RETURNING id
), addr2 AS (
  SELECT id FROM ensure_addr2
  UNION ALL
  SELECT id FROM public.shipping_addresses WHERE "user_id" = (SELECT id FROM u) AND address1 = '2 Admin Street'
  LIMIT 1
)
SELECT 1;

-- Create two orders using the updated place_order
SELECT public.place_order(
  (SELECT id FROM public.profiles WHERE role = 'SUPER_ADMIN' LIMIT 1),
  (SELECT id FROM public.shipping_addresses WHERE address1 = '1 Admin Way' AND "user_id" = (SELECT id FROM public.profiles WHERE role = 'SUPER_ADMIN' LIMIT 1) LIMIT 1),
  jsonb_build_array(
    jsonb_build_object('book_id', (SELECT id FROM public.books WHERE title_zh = '样例书一' LIMIT 1), 'quantity', 1),
    jsonb_build_object('book_id', (SELECT id FROM public.books WHERE title_zh = '样例书二' LIMIT 1), 'quantity', 2)
  )
);

UPDATE public.orders SET status = 'CONFIRMED', created_at = now() - interval '5 days'
WHERE id = (
  SELECT id FROM public.orders WHERE "user_id" = (SELECT id FROM public.profiles WHERE role = 'SUPER_ADMIN' LIMIT 1)
  ORDER BY created_at DESC LIMIT 1
);

SELECT public.place_order(
  (SELECT id FROM public.profiles WHERE role = 'SUPER_ADMIN' LIMIT 1),
  (SELECT id FROM public.shipping_addresses WHERE address1 = '2 Admin Street' AND "user_id" = (SELECT id FROM public.profiles WHERE role = 'SUPER_ADMIN' LIMIT 1) LIMIT 1),
  jsonb_build_array(
    jsonb_build_object('book_id', (SELECT id FROM public.books WHERE title_zh = '样例书二' LIMIT 1), 'quantity', 1)
  )
);

UPDATE public.orders SET status = 'SHIPPED', tracking_number = 'ADMINSHIP123', created_at = now() - interval '2 days'
WHERE id = (
  SELECT id FROM public.orders WHERE "user_id" = (SELECT id FROM public.profiles WHERE role = 'SUPER_ADMIN' LIMIT 1)
  ORDER BY created_at DESC LIMIT 1
);

COMMIT;
