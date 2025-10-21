-- 0008_backfill_profiles.sql — Ensure every auth user has a profile row

DO $$
BEGIN
  INSERT INTO public.profiles (id, name, role, created_at, updated_at)
  SELECT u.id, NULL::text, 'USER'::text, now(), now()
  FROM auth.users u
  LEFT JOIN public.profiles p ON p.id = u.id
  WHERE p.id IS NULL;
END $$;

