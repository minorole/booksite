-- 0016_seed_super_admin_function.sql — Define a seeding function and execute it once

BEGIN;

CREATE OR REPLACE FUNCTION public.seed_super_admin_sample()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_uid uuid;
  v_cat uuid;
  v_b1 uuid;
  v_b2 uuid;
  v_a1 uuid;
  v_a2 uuid;
  v_o1 uuid;
  v_o2 uuid;
BEGIN
  SELECT id INTO v_uid FROM public.profiles WHERE role = 'SUPER_ADMIN' LIMIT 1;
  IF v_uid IS NULL THEN
    RAISE NOTICE 'No SUPER_ADMIN profile found';
    RETURN;
  END IF;

  SELECT id INTO v_cat FROM public.categories WHERE type = 'OTHER_BOOKS' LIMIT 1;
  IF v_cat IS NULL THEN
    INSERT INTO public.categories(type, name_zh, name_en)
    VALUES ('OTHER_BOOKS', '其他书籍', 'Other Books')
    RETURNING id INTO v_cat;
  END IF;

  SELECT id INTO v_b1 FROM public.books WHERE title_zh = '样例书一' LIMIT 1;
  IF v_b1 IS NULL THEN
    INSERT INTO public.books(category_id, title_zh, title_en, description_zh, description_en, quantity)
    VALUES (v_cat, '样例书一', 'Sample Book One', '描述', 'Description', 50)
    RETURNING id INTO v_b1;
  ELSE
    UPDATE public.books SET quantity = GREATEST(quantity, 50) WHERE id = v_b1;
  END IF;

  SELECT id INTO v_b2 FROM public.books WHERE title_zh = '样例书二' LIMIT 1;
  IF v_b2 IS NULL THEN
    INSERT INTO public.books(category_id, title_zh, title_en, description_zh, description_en, quantity)
    VALUES (v_cat, '样例书二', 'Sample Book Two', '描述', 'Description', 50)
    RETURNING id INTO v_b2;
  ELSE
    UPDATE public.books SET quantity = GREATEST(quantity, 50) WHERE id = v_b2;
  END IF;

  -- Address 1 (default)
  SELECT id INTO v_a1 FROM public.shipping_addresses WHERE "user_id" = v_uid AND address1 = '1 Admin Way' LIMIT 1;
  IF v_a1 IS NULL THEN
    INSERT INTO public.shipping_addresses(
      "user_id", recipient_name, phone, address1, address2, city, state, zip, country, is_default, is_valid, address_hash
    ) VALUES (
      v_uid, 'Admin Recipient', '555-1000', '1 Admin Way', NULL, 'Admin City', 'CA', '94000', 'US', true, true,
      lower('Admin Recipient|555-1000|1 Admin Way||Admin City|CA|94000|US')
    ) RETURNING id INTO v_a1;
  END IF;

  -- Address 2
  SELECT id INTO v_a2 FROM public.shipping_addresses WHERE "user_id" = v_uid AND address1 = '2 Admin Street' LIMIT 1;
  IF v_a2 IS NULL THEN
    INSERT INTO public.shipping_addresses(
      "user_id", recipient_name, phone, address1, address2, city, state, zip, country, is_default, is_valid, address_hash
    ) VALUES (
      v_uid, 'Admin Recipient 2', '555-1001', '2 Admin Street', 'Suite 100', 'Admin Town', 'NY', '10002', 'US', false, false,
      lower('Admin Recipient 2|555-1001|2 Admin Street|Suite 100|Admin Town|NY|10002|US')
    ) RETURNING id INTO v_a2;
  END IF;

  -- Orders via place_order (captures snapshots)
  SELECT public.place_order(v_uid, v_a1,
    jsonb_build_array(
      jsonb_build_object('book_id', v_b1, 'quantity', 1),
      jsonb_build_object('book_id', v_b2, 'quantity', 2)
    )
  ) INTO v_o1;
  UPDATE public.orders SET status = 'CONFIRMED', created_at = now() - interval '5 days' WHERE id = v_o1;

  SELECT public.place_order(v_uid, v_a2,
    jsonb_build_array(
      jsonb_build_object('book_id', v_b2, 'quantity', 1)
    )
  ) INTO v_o2;
  UPDATE public.orders SET status = 'SHIPPED', tracking_number = 'ADMINSHIP123', created_at = now() - interval '2 days' WHERE id = v_o2;

END;
$$;

-- Execute once
SELECT public.seed_super_admin_sample();

COMMIT;

