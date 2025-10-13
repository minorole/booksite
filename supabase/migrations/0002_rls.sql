-- 0002_rls.sql — RLS policies and admin helper

-- Admin helper: SECURITY DEFINER that checks if current auth user is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role IN ('ADMIN','SUPER_ADMIN')
  );
$$;

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.books ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.book_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.book_similarities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shipping_addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.carts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_prompts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tag_history ENABLE ROW LEVEL SECURITY;

-- Profiles: users can select/update own row; admins unrestricted
DROP POLICY IF EXISTS profiles_self_select ON public.profiles;
CREATE POLICY profiles_self_select ON public.profiles
  FOR SELECT USING (id = auth.uid());

DROP POLICY IF EXISTS profiles_self_update ON public.profiles;
CREATE POLICY profiles_self_update ON public.profiles
  FOR UPDATE USING (id = auth.uid()) WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS profiles_self_insert ON public.profiles;
CREATE POLICY profiles_self_insert ON public.profiles
  FOR INSERT WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS profiles_admin_rw ON public.profiles;
CREATE POLICY profiles_admin_rw ON public.profiles
  FOR ALL USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Categories: public read; admin write
DROP POLICY IF EXISTS categories_public_read ON public.categories;
CREATE POLICY categories_public_read ON public.categories FOR SELECT USING (true);

DROP POLICY IF EXISTS categories_admin_write ON public.categories;
CREATE POLICY categories_admin_write ON public.categories FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Books: public read; admin write
DROP POLICY IF EXISTS books_public_read ON public.books;
CREATE POLICY books_public_read ON public.books FOR SELECT USING (true);

DROP POLICY IF EXISTS books_admin_write ON public.books;
CREATE POLICY books_admin_write ON public.books FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Tags and book_tags: public read; admin write
DROP POLICY IF EXISTS tags_public_read ON public.tags;
CREATE POLICY tags_public_read ON public.tags FOR SELECT USING (true);

DROP POLICY IF EXISTS tags_admin_write ON public.tags;
CREATE POLICY tags_admin_write ON public.tags FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS book_tags_public_read ON public.book_tags;
CREATE POLICY book_tags_public_read ON public.book_tags FOR SELECT USING (true);

DROP POLICY IF EXISTS book_tags_admin_write ON public.book_tags;
CREATE POLICY book_tags_admin_write ON public.book_tags FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Shipping addresses: user-scoped; admin unrestricted
DROP POLICY IF EXISTS shipping_user_select ON public.shipping_addresses;
CREATE POLICY shipping_user_select ON public.shipping_addresses
  FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS shipping_user_insert ON public.shipping_addresses;
CREATE POLICY shipping_user_insert ON public.shipping_addresses
  FOR INSERT WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS shipping_user_update ON public.shipping_addresses;
CREATE POLICY shipping_user_update ON public.shipping_addresses
  FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS shipping_admin_rw ON public.shipping_addresses;
CREATE POLICY shipping_admin_rw ON public.shipping_addresses FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Orders: user-scoped; admin unrestricted
DROP POLICY IF EXISTS orders_user_select ON public.orders;
CREATE POLICY orders_user_select ON public.orders FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS orders_user_insert ON public.orders;
CREATE POLICY orders_user_insert ON public.orders FOR INSERT WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS orders_user_update ON public.orders;
CREATE POLICY orders_user_update ON public.orders FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS orders_admin_rw ON public.orders;
CREATE POLICY orders_admin_rw ON public.orders FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Order items: scoped via owning order; admin unrestricted
DROP POLICY IF EXISTS order_items_user_select ON public.order_items;
CREATE POLICY order_items_user_select ON public.order_items
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND o.user_id = auth.uid())
  );

DROP POLICY IF EXISTS order_items_user_insert ON public.order_items;
CREATE POLICY order_items_user_insert ON public.order_items
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND o.user_id = auth.uid())
  );

DROP POLICY IF EXISTS order_items_user_update ON public.order_items;
CREATE POLICY order_items_user_update ON public.order_items
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND o.user_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND o.user_id = auth.uid())
  );

DROP POLICY IF EXISTS order_items_admin_rw ON public.order_items;
CREATE POLICY order_items_admin_rw ON public.order_items FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Carts: user-scoped; admin unrestricted
DROP POLICY IF EXISTS carts_user_rw ON public.carts;
CREATE POLICY carts_user_rw ON public.carts FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS carts_admin_rw ON public.carts;
CREATE POLICY carts_admin_rw ON public.carts FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Cart items: scoped via owning cart; admin unrestricted
DROP POLICY IF EXISTS cart_items_user_rw ON public.cart_items;
CREATE POLICY cart_items_user_rw ON public.cart_items
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.carts c WHERE c.id = cart_id AND c.user_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM public.carts c WHERE c.id = cart_id AND c.user_id = auth.uid())
  );

DROP POLICY IF EXISTS cart_items_admin_rw ON public.cart_items;
CREATE POLICY cart_items_admin_rw ON public.cart_items FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Admin tables: admin-only
DROP POLICY IF EXISTS admin_logs_admin_rw ON public.admin_logs;
CREATE POLICY admin_logs_admin_rw ON public.admin_logs FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS system_settings_admin_rw ON public.system_settings;
CREATE POLICY system_settings_admin_rw ON public.system_settings FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS system_prompts_admin_rw ON public.system_prompts;
CREATE POLICY system_prompts_admin_rw ON public.system_prompts FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS tag_history_admin_rw ON public.tag_history;
CREATE POLICY tag_history_admin_rw ON public.tag_history FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());
