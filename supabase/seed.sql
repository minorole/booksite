-- Idempotent seed data for initial app setup
-- Categories, system settings, and system prompts

-- Categories (normalized)
INSERT INTO public.categories (type, name_zh, name_en, description_zh, description_en)
VALUES
  ('PURE_LAND_BOOKS', '净土佛书', 'Pure Land Books', '净土经典与注疏', 'Pure Land sutras and commentaries'),
  ('OTHER_BOOKS', '其他佛书', 'Other Buddhist Books', '其他佛教经典与教义', 'Other Buddhist texts and teachings'),
  ('DHARMA_ITEMS', '法宝', 'Dharma Items', '修行所需的法宝', 'Practice items and materials'),
  ('BUDDHA_STATUES', '佛像', 'Buddha Statues', '佛菩萨圣像', 'Statues and images of Buddhas and Bodhisattvas')
ON CONFLICT (type) DO UPDATE SET
  name_zh = EXCLUDED.name_zh,
  name_en = EXCLUDED.name_en,
  description_zh = EXCLUDED.description_zh,
  description_en = EXCLUDED.description_en;

-- System settings (keyed)
-- Monthly item cap used by business logic (default 50)
INSERT INTO public.system_settings (key, value, updated_by, description)
VALUES
  ('orders.monthly_item_limit', jsonb_build_object('value', 50), 'seed', 'Maximum number of items per user in 30 days')
ON CONFLICT (key) DO UPDATE SET
  value = EXCLUDED.value,
  updated_by = 'seed',
  description = EXCLUDED.description,
  updated_at = now();

-- System prompts (store active copies of core prompts)
INSERT INTO public.system_prompts (name, prompt_text, use_case, version, is_active, created_by)
VALUES
  (
    'ADMIN_SYSTEM_PROMPT',
    $$You are a bilingual (Chinese/English) AI assistant for Buddhist book inventory management. You can analyze book covers, create/update listings, manage orders and inventory, search/analyze book information, and provide user guidance in the user's preferred language. Follow operational guidelines: check duplicates, consider character variants (简/繁), compare visual elements, confirm quantities, and log important actions. Categories: PURE_LAND_BOOKS (净土佛书), OTHER_BOOKS (其他佛书), DHARMA_ITEMS (法宝), BUDDHA_STATUES (佛像).$$,
    'admin', 1, true, 'seed'
  ),
  (
    'VISION_ANALYSIS_PROMPT',
    $$When analyzing book covers: first provide a natural language summary (titles, authors, publisher, category, notable visuals, quality issues). After user confirmation, output structured JSON with confidence scores, language detection, extracted text, and visual elements. Maintain conversation flow, ask clarifying questions, handle errors, and keep bilingual support.$$,
    'vision', 1, true, 'seed'
  ),
  (
    'ORDER_PROCESSING_PROMPT',
    $$Process orders by verifying stock, validating shipping, applying monthly limits, tracking status changes, and maintaining logs. Update quantities after shipping, track low inventory/popular items, and communicate clearly in the user's language with proper error handling.$$,
    'orders', 1, true, 'seed'
  )
ON CONFLICT (name) DO UPDATE SET
  prompt_text = EXCLUDED.prompt_text,
  use_case = EXCLUDED.use_case,
  is_active = true,
  updated_at = now(),
  created_by = 'seed';
