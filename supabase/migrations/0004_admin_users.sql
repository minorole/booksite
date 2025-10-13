-- 0004_admin_users.sql — Admin user management RPCs

-- List users with profiles (admin-only)
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
  SELECT u.id, u.email, p.name, p.role, u.created_at
  FROM auth.users u
  LEFT JOIN public.profiles p ON p.id = u.id;
END;
$$;

-- Update a user's role (admin-only)
CREATE OR REPLACE FUNCTION public.update_user_role(uid uuid, new_role text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  IF new_role NOT IN ('USER','ADMIN','SUPER_ADMIN') THEN
    RAISE EXCEPTION 'invalid role';
  END IF;

  UPDATE public.profiles
  SET role = new_role, updated_at = now()
  WHERE id = uid;
END;
$$;

