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

-- Removed legacy system settings and prompts; kept categories only
