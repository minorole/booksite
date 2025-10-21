-- 0012_replace_place_order_snapshot.sql — Rewrite place_order to snapshot addresses and enforce ownership

BEGIN;

-- Replace place_order to snapshot address into order_shipping_addresses
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
  v_addr record;
  v_snapshot_id uuid;
BEGIN
  -- Validate monthly limit
  SELECT SUM( (elem->>'quantity')::int ) INTO v_total_items
  FROM jsonb_array_elements(items) AS elem;

  IF NOT public.can_place_order(user_id, COALESCE(v_total_items,0)) THEN
    RAISE EXCEPTION 'Monthly limit exceeded';
  END IF;

  -- Fetch and validate that address belongs to the user
  SELECT 
    s.recipient_name, s.phone, s.address1, s.address2, s.city, s.state, s.zip, s.country
  INTO v_addr
  FROM public.shipping_addresses s
  WHERE s.id = shipping_address_id AND s.user_id = user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid address for user';
  END IF;

  -- Create order
  v_order_id := extensions.uuid_generate_v4();
  INSERT INTO public.orders(id, user_id, shipping_address_id, total_items, status)
  VALUES (v_order_id, user_id, shipping_address_id, COALESCE(v_total_items,0), 'PENDING');

  -- Snapshot the address at time of order
  INSERT INTO public.order_shipping_addresses(
    order_id, user_id, recipient_name, phone, address1, address2, city, state, zip, country, normalized
  ) VALUES (
    v_order_id,
    user_id,
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

COMMIT;

