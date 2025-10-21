-- 0013_backfill_order_address_snapshots.sql — Backfill snapshots for existing orders

BEGIN;

-- Insert snapshots for orders missing them
WITH ins AS (
  INSERT INTO public.order_shipping_addresses (
    order_id, user_id, recipient_name, phone, address1, address2, city, state, zip, country, normalized
  )
  SELECT 
    o.id AS order_id,
    o.user_id,
    s.recipient_name,
    s.phone,
    s.address1,
    s.address2,
    s.city,
    s.state,
    s.zip,
    s.country,
    NULL::jsonb
  FROM public.orders o
  JOIN public.shipping_addresses s ON s.id = o.shipping_address_id
  WHERE o.order_shipping_address_id IS NULL
  ON CONFLICT (order_id) DO NOTHING
  RETURNING order_id, id
)
UPDATE public.orders o
SET order_shipping_address_id = i.id
FROM ins i
WHERE o.id = i.order_id AND o.order_shipping_address_id IS NULL;

COMMIT;

