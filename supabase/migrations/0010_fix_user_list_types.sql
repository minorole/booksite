-- 0010_fix_user_list_types.sql — Fix return type mismatches by casting to text

BEGIN;

-- Ensure returned columns match declared types (cast to text)
CREATE OR REPLACE FUNCTION public.list_users()
RETURNS TABLE (
  id uuid,
  email text,
  name text,
  role text,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  RETURN QUERY
  SELECT
    u.id,
    u.email::text AS email,
    p.name::text AS name,
    p.role::text AS role,
    u.created_at
  FROM auth.users u
  LEFT JOIN public.profiles p ON p.id = u.id;
END;
$$;

-- Paginated version: cast email/name/role to text consistently
CREATE OR REPLACE FUNCTION public.list_users_paginated(
  q text DEFAULT NULL,
  page_limit int DEFAULT 50,
  page_offset int DEFAULT 0
)
RETURNS TABLE (
  id uuid,
  email text,
  name text,
  role text,
  created_at timestamptz,
  total_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  RETURN QUERY
  SELECT
    u.id,
    u.email::text AS email,
    p.name::text AS name,
    p.role::text AS role,
    u.created_at,
    COUNT(*) OVER () AS total_count
  FROM auth.users u
  LEFT JOIN public.profiles p ON p.id = u.id
  WHERE (
    q IS NULL OR q = '' OR
    lower(u.email) LIKE ('%' || lower(q) || '%') OR
    lower(coalesce(p.name, '')) LIKE ('%' || lower(q) || '%')
  )
  ORDER BY u.created_at DESC
  LIMIT GREATEST(1, LEAST(page_limit, 200))
  OFFSET GREATEST(0, page_offset);
END;
$$;

COMMIT;

