-- 0018_single_active_address.sql — Enforce single active address per user; keep history via order snapshots

BEGIN;

-- 1) Add archival flag on shipping addresses (active when false)
ALTER TABLE public.shipping_addresses
  ADD COLUMN IF NOT EXISTS is_archived boolean NOT NULL DEFAULT false;

-- 2) Data cleanup: mark all but one per user as archived (prefer current default, else newest)
WITH ranked AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY user_id
      ORDER BY (CASE WHEN is_default THEN 1 ELSE 0 END) DESC, created_at DESC, id
    ) AS rn
  FROM public.shipping_addresses
)
UPDATE public.shipping_addresses s
SET is_archived = (r.rn > 1)
FROM ranked r
WHERE s.id = r.id;

-- 3) Enforce one active address per user
CREATE UNIQUE INDEX IF NOT EXISTS shipping_addresses_one_active_per_user
  ON public.shipping_addresses(user_id)
  WHERE is_archived = false;

COMMIT;

