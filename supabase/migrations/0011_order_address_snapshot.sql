-- 0011_order_address_snapshot.sql — Introduce order address snapshots and extend user addresses

BEGIN;

-- 1) Extend user addresses with recipient/phone/default/hash (for dedupe and UX)
ALTER TABLE public.shipping_addresses
  ADD COLUMN IF NOT EXISTS recipient_name text,
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS is_default boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS address_hash text;

-- Ensure at most one default per user
CREATE UNIQUE INDEX IF NOT EXISTS shipping_addresses_one_default_per_user
  ON public.shipping_addresses(user_id)
  WHERE is_default;

-- Dedupe/helper index for address lookup per user (optional)
CREATE INDEX IF NOT EXISTS shipping_addresses_user_hash
  ON public.shipping_addresses(user_id, address_hash);

-- 2) Order address snapshot table (immutable copy captured at order time)
CREATE TABLE IF NOT EXISTS public.order_shipping_addresses (
  id uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  order_id uuid UNIQUE NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  recipient_name text,
  phone text,
  address1 text NOT NULL,
  address2 text NULL,
  city text NOT NULL,
  state text NOT NULL,
  zip text NOT NULL,
  country text NOT NULL DEFAULT 'US',
  normalized jsonb NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- RLS for order_shipping_addresses
ALTER TABLE public.order_shipping_addresses ENABLE ROW LEVEL SECURITY;

-- Users can read their own order snapshot addresses
DROP POLICY IF EXISTS order_shipping_addresses_user_select ON public.order_shipping_addresses;
CREATE POLICY order_shipping_addresses_user_select ON public.order_shipping_addresses
  FOR SELECT USING (user_id = auth.uid());

-- Prevent user updates/deletes (immutable), but allow admins
DROP POLICY IF EXISTS order_shipping_addresses_admin_rw ON public.order_shipping_addresses;
CREATE POLICY order_shipping_addresses_admin_rw ON public.order_shipping_addresses
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- 3) Add FK from orders to snapshot (keeps legacy shipping_address_id for now)
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS order_shipping_address_id uuid NULL REFERENCES public.order_shipping_addresses(id) ON DELETE RESTRICT;

COMMIT;

