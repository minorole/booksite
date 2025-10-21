-- 0006_user_mgmt_hardening.sql — Harden user management RPCs and logging

-- 1) Secure role update with guardrails
--    - Admin-only via is_admin()
--    - Only SUPER_ADMIN can assign/touch SUPER_ADMIN
--    - Prevent self-demotion from SUPER_ADMIN
--    - Prevent demoting the last SUPER_ADMIN
CREATE OR REPLACE FUNCTION public.update_user_role_secure(uid uuid, new_role text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  my_id uuid := auth.uid();
  my_role text;
  target_role text;
  super_count int;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  IF new_role NOT IN ('USER','ADMIN','SUPER_ADMIN') THEN
    RAISE EXCEPTION 'invalid role';
  END IF;

  SELECT role INTO my_role FROM public.profiles WHERE id = my_id;
  SELECT role INTO target_role FROM public.profiles WHERE id = uid;

  IF target_role IS NULL THEN
    RAISE EXCEPTION 'target not found';
  END IF;

  -- Only SUPER_ADMIN can change or assign SUPER_ADMIN
  IF (target_role = 'SUPER_ADMIN' OR new_role = 'SUPER_ADMIN') AND my_role <> 'SUPER_ADMIN' THEN
    RAISE EXCEPTION 'forbidden_super';
  END IF;

  -- Prevent accidental self-demotion if requester is SUPER_ADMIN
  IF my_role = 'SUPER_ADMIN' AND uid = my_id AND new_role <> 'SUPER_ADMIN' THEN
    RAISE EXCEPTION 'self_demote_forbidden';
  END IF;

  -- Prevent demoting the last SUPER_ADMIN
  IF target_role = 'SUPER_ADMIN' AND new_role <> 'SUPER_ADMIN' THEN
    SELECT COUNT(*) INTO super_count FROM public.profiles WHERE role = 'SUPER_ADMIN';
    IF super_count <= 1 THEN
      RAISE EXCEPTION 'last_super_forbidden';
    END IF;
  END IF;

  UPDATE public.profiles
  SET role = new_role, updated_at = now()
  WHERE id = uid;
END;
$$;

-- 2) Paginated + searchable list_users (admin-only)
CREATE OR REPLACE FUNCTION public.list_users_paginated(q text DEFAULT NULL, page_limit int DEFAULT 50, page_offset int DEFAULT 0)
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

-- 3) Extend admin_logs action CHECK to include UPDATE_USER_ROLE
DO $$ BEGIN
  ALTER TABLE public.admin_logs DROP CONSTRAINT IF EXISTS admin_logs_action_check;
EXCEPTION WHEN undefined_object THEN
  NULL;
END $$;

ALTER TABLE public.admin_logs
ADD CONSTRAINT admin_logs_action_check CHECK (action IN (
  'DELETE_BOOK','EDIT_BOOK','CREATE_BOOK','UPDATE_QUANTITY','UPDATE_STATUS','PROCESS_ORDER','CANCEL_ORDER','MARK_SHIPPED','UPDATE_TRACKING','ANALYZE_IMAGE','CHECK_DUPLICATE','APPROVE_TAG','REJECT_TAG','UPDATE_TAGS','OVERRIDE_MONTHLY_LIMIT','UPDATE_SYSTEM_SETTINGS','UPDATE_PROMPTS','CHAT_MESSAGE','LLM_REQUEST','LLM_RESPONSE','FUNCTION_CALL','FUNCTION_SUCCESS','CONFIDENCE_CHECK_FAILED','CHAT_COMPLETE','LLM_RETRY','UPDATE_USER_ROLE'
));

