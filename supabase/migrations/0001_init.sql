-- 0001_init.sql — Core schema (normalized) and performance indexes
-- Assumes extensions enabled: vector, pg_trgm, uuid-ossp (see 00000000000000_extensions.sql)

-- Helper: set updated_at timestamp on row update
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Helper: maintain English FTS tsvector on books
CREATE OR REPLACE FUNCTION public.books_update_tsv_en()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_tsv_en =
    setweight(to_tsvector('english', coalesce(NEW.title_en, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(NEW.author_en, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(NEW.description_en, '')), 'C');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Profiles: source of truth for roles
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NULL,
  role text NOT NULL DEFAULT 'USER' CHECK (role IN ('USER','ADMIN','SUPER_ADMIN')),
  language_preference text NULL,
  last_order_date timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Categories
CREATE TABLE IF NOT EXISTS public.categories (
  id uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  type text NOT NULL UNIQUE,
  name_zh text NOT NULL,
  name_en text NOT NULL,
  description_zh text NULL,
  description_en text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS categories_type_idx ON public.categories(type);
CREATE INDEX IF NOT EXISTS categories_updated_idx ON public.categories(updated_at DESC);

-- Books
CREATE TABLE IF NOT EXISTS public.books (
  id uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  category_id uuid NOT NULL REFERENCES public.categories(id) ON DELETE RESTRICT,
  title_zh text NOT NULL,
  title_en text NULL,
  description_zh text NOT NULL,
  description_en text NULL,
  cover_image text NULL,
  quantity int NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  has_english_translation boolean NOT NULL DEFAULT false,
  ai_metadata jsonb NULL,
  image_analysis_data jsonb NULL,
  views int NOT NULL DEFAULT 0,
  discontinued boolean NOT NULL DEFAULT false,
  discontinued_at timestamptz NULL,
  discontinued_by text NULL,
  discontinued_reason text NULL,
  last_quantity_update timestamptz NULL,
  last_llm_analysis timestamptz NULL,
  content_summary_zh text NULL,
  content_summary_en text NULL,
  author_zh text NULL,
  author_en text NULL,
  publisher_zh text NULL,
  publisher_en text NULL,
  embedding vector(1536) NULL,
  search_tsv_en tsvector,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS books_category_idx ON public.books(category_id);
CREATE INDEX IF NOT EXISTS books_discontinued_idx ON public.books(discontinued);
CREATE INDEX IF NOT EXISTS books_updated_idx ON public.books(updated_at DESC);
CREATE INDEX IF NOT EXISTS books_title_bilingual_idx ON public.books(title_zh, title_en);
CREATE INDEX IF NOT EXISTS books_author_bilingual_idx ON public.books(author_zh, author_en);
-- English FTS
CREATE INDEX IF NOT EXISTS books_tsv_en_gin_idx ON public.books USING GIN (search_tsv_en);
-- Chinese trigram search
CREATE INDEX IF NOT EXISTS books_title_zh_trgm_idx ON public.books USING GIN (title_zh gin_trgm_ops);
CREATE INDEX IF NOT EXISTS books_author_zh_trgm_idx ON public.books USING GIN (author_zh gin_trgm_ops);
-- Vector index (cosine distance)
CREATE INDEX IF NOT EXISTS books_embedding_ivfflat_idx ON public.books USING ivfflat (embedding vector_cosine_ops);

-- Maintain FTS and updated_at
DROP TRIGGER IF EXISTS trg_books_tsv_en ON public.books;
CREATE TRIGGER trg_books_tsv_en
BEFORE INSERT OR UPDATE OF title_en, author_en, description_en ON public.books
FOR EACH ROW EXECUTE FUNCTION public.books_update_tsv_en();

DROP TRIGGER IF EXISTS trg_books_updated_at ON public.books;
CREATE TRIGGER trg_books_updated_at
BEFORE UPDATE ON public.books
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Tags (normalized)
CREATE TABLE IF NOT EXISTS public.tags (
  id uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  name text NOT NULL UNIQUE
);
CREATE TABLE IF NOT EXISTS public.book_tags (
  book_id uuid NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
  tag_id uuid NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
  PRIMARY KEY (book_id, tag_id)
);
CREATE INDEX IF NOT EXISTS book_tags_book_idx ON public.book_tags(book_id);
CREATE INDEX IF NOT EXISTS book_tags_tag_idx ON public.book_tags(tag_id);

-- Similarities
CREATE TABLE IF NOT EXISTS public.book_similarities (
  book_id uuid NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
  similar_book_id uuid NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
  score real NOT NULL,
  PRIMARY KEY (book_id, similar_book_id)
);
CREATE INDEX IF NOT EXISTS book_similarities_book_idx ON public.book_similarities(book_id);
CREATE INDEX IF NOT EXISTS book_similarities_similar_idx ON public.book_similarities(similar_book_id);

-- Shipping addresses
CREATE TABLE IF NOT EXISTS public.shipping_addresses (
  id uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  address1 text NOT NULL,
  address2 text NULL,
  city text NOT NULL,
  state text NOT NULL,
  zip text NOT NULL,
  country text NOT NULL DEFAULT 'US',
  is_valid boolean NOT NULL DEFAULT false,
  validation_log jsonb NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS shipping_user_idx ON public.shipping_addresses(user_id);
CREATE INDEX IF NOT EXISTS shipping_country_idx ON public.shipping_addresses(country);
DROP TRIGGER IF EXISTS trg_shipping_updated_at ON public.shipping_addresses;
CREATE TRIGGER trg_shipping_updated_at
BEFORE UPDATE ON public.shipping_addresses
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Orders
CREATE TABLE IF NOT EXISTS public.orders (
  id uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  shipping_address_id uuid NOT NULL REFERENCES public.shipping_addresses(id) ON DELETE RESTRICT,
  status text NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','CONFIRMED','PROCESSING','SHIPPED','COMPLETED','CANCELLED')),
  total_items int NOT NULL,
  tracking_number text NULL,
  processed_by text NULL,
  processing_started_at timestamptz NULL,
  override_monthly boolean NOT NULL DEFAULT false,
  llm_processing_log jsonb NULL,
  notes text NULL,
  admin_notes text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS orders_user_idx ON public.orders(user_id);
CREATE INDEX IF NOT EXISTS orders_shipping_idx ON public.orders(shipping_address_id);
CREATE INDEX IF NOT EXISTS orders_status_idx ON public.orders(status);
CREATE INDEX IF NOT EXISTS orders_created_idx ON public.orders(created_at);
DROP TRIGGER IF EXISTS trg_orders_updated_at ON public.orders;
CREATE TRIGGER trg_orders_updated_at
BEFORE UPDATE ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Order items
CREATE TABLE IF NOT EXISTS public.order_items (
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  book_id uuid NOT NULL REFERENCES public.books(id) ON DELETE RESTRICT,
  quantity int NOT NULL,
  added_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (order_id, book_id)
);
CREATE INDEX IF NOT EXISTS order_items_book_idx ON public.order_items(book_id);

-- Carts
CREATE TABLE IF NOT EXISTS public.carts (
  id uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL
);
CREATE INDEX IF NOT EXISTS carts_user_idx ON public.carts(user_id);
CREATE INDEX IF NOT EXISTS carts_expires_idx ON public.carts(expires_at);
DROP TRIGGER IF EXISTS trg_carts_updated_at ON public.carts;
CREATE TRIGGER trg_carts_updated_at
BEFORE UPDATE ON public.carts
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Cart items
CREATE TABLE IF NOT EXISTS public.cart_items (
  cart_id uuid NOT NULL REFERENCES public.carts(id) ON DELETE CASCADE,
  book_id uuid NOT NULL REFERENCES public.books(id) ON DELETE RESTRICT,
  quantity int NOT NULL,
  added_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (cart_id, book_id)
);
CREATE INDEX IF NOT EXISTS cart_items_book_idx ON public.cart_items(book_id);
DROP TRIGGER IF EXISTS trg_cart_items_updated_at ON public.cart_items;
CREATE TRIGGER trg_cart_items_updated_at
BEFORE UPDATE ON public.cart_items
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Admin logs
CREATE TABLE IF NOT EXISTS public.admin_logs (
  id uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  action text NOT NULL CHECK (action IN (
    'DELETE_BOOK','EDIT_BOOK','CREATE_BOOK','UPDATE_QUANTITY','UPDATE_STATUS','PROCESS_ORDER','CANCEL_ORDER','MARK_SHIPPED','UPDATE_TRACKING','ANALYZE_IMAGE','CHECK_DUPLICATE','APPROVE_TAG','REJECT_TAG','UPDATE_TAGS','OVERRIDE_MONTHLY_LIMIT','UPDATE_SYSTEM_SETTINGS','UPDATE_PROMPTS','CHAT_MESSAGE','LLM_REQUEST','LLM_RESPONSE','FUNCTION_CALL','FUNCTION_SUCCESS','CONFIDENCE_CHECK_FAILED','CHAT_COMPLETE','LLM_RETRY'
  )),
  book_id uuid NULL,
  book_title text NULL,
  admin_email text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb NULL,
  llm_context jsonb NULL,
  related_items text[] NULL,
  confidence real NULL,
  session_id text NULL,
  prompt_version int NULL
);
CREATE INDEX IF NOT EXISTS admin_logs_admin_idx ON public.admin_logs(admin_email);
CREATE INDEX IF NOT EXISTS admin_logs_action_idx ON public.admin_logs(action);
CREATE INDEX IF NOT EXISTS admin_logs_created_idx ON public.admin_logs(created_at);

-- System settings
CREATE TABLE IF NOT EXISTS public.system_settings (
  id uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  key text NOT NULL UNIQUE,
  value jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by text NULL,
  description text NULL
);
CREATE INDEX IF NOT EXISTS system_settings_key_idx ON public.system_settings(key);

-- System prompts
CREATE TABLE IF NOT EXISTS public.system_prompts (
  id uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  name text NOT NULL UNIQUE,
  prompt_text text NOT NULL,
  use_case text NOT NULL,
  version int NOT NULL DEFAULT 1,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by text NULL,
  performance_metrics jsonb NULL
);
CREATE INDEX IF NOT EXISTS system_prompts_name_idx ON public.system_prompts(name);
CREATE INDEX IF NOT EXISTS system_prompts_use_case_idx ON public.system_prompts(use_case);
CREATE INDEX IF NOT EXISTS system_prompts_version_idx ON public.system_prompts(version);

-- Tag history
CREATE TABLE IF NOT EXISTS public.tag_history (
  id uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  book_id uuid NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
  tag text NOT NULL,
  is_auto boolean NOT NULL,
  added_by text NOT NULL,
  added_at timestamptz NOT NULL DEFAULT now(),
  approved boolean NOT NULL DEFAULT false,
  approved_by text NULL,
  approved_at timestamptz NULL,
  confidence real NULL,
  prompt_version int NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS tag_history_book_idx ON public.tag_history(book_id);
CREATE INDEX IF NOT EXISTS tag_history_tag_idx ON public.tag_history(tag);
CREATE INDEX IF NOT EXISTS tag_history_added_idx ON public.tag_history(added_at);
DROP TRIGGER IF EXISTS trg_tag_history_updated_at ON public.tag_history;
CREATE TRIGGER trg_tag_history_updated_at
BEFORE UPDATE ON public.tag_history
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
