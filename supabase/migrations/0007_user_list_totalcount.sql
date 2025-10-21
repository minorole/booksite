-- 0007_user_list_totalcount.sql — Add total_count to list_users_paginated

-- Replace by dropping old definition (signature change)
DROP FUNCTION IF EXISTS public.list_users_paginated(text, int, int);

CREATE OR REPLACE FUNCTION public.list_users_paginated(q text DEFAULT NULL, page_limit int DEFAULT 50, page_offset int DEFAULT 0)
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
    u.email,
    p.name,
    p.role,
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
