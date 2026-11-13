-- Manual regression test for notification_control RLS and grants.
-- Run against a non-production/staging database after applying the migration.
-- All data changes are rolled back at the end.

BEGIN;

-- 1) A normal authenticated account can read the global switches but cannot
--    update the row directly or through the admin RPC.
DO $test$
DECLARE
  v_user_id uuid;
BEGIN
  SELECT u.id INTO v_user_id
  FROM auth.users AS u
  WHERE lower(u.email) <> 'kevindosgames1@gmail.com'
    AND NOT EXISTS (
      SELECT 1 FROM public.user_roles AS ur
      WHERE ur.user_id = u.id AND ur.role = 'admin'::public.app_role
    )
  ORDER BY u.created_at
  LIMIT 1;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Test prerequisite missing: create a non-admin auth user';
  END IF;

  PERFORM pg_catalog.set_config('request.jwt.claim.sub', v_user_id::text, true);
END;
$test$;

SET LOCAL ROLE authenticated;

DO $test$
DECLARE
  v_count integer;
  v_before boolean;
  v_after boolean;
  v_rows integer;
BEGIN
  SELECT count(*), max(som) INTO v_count, v_before
  FROM public.notification_control
  WHERE id = TRUE;

  IF v_count <> 1 THEN
    RAISE EXCEPTION 'Authenticated SELECT failed: expected the singleton row';
  END IF;

  -- RLS silently filters UPDATE rows for non-admins; it does not necessarily
  -- raise insufficient_privilege. Verify that zero rows were changed.
  UPDATE public.notification_control SET som = NOT som WHERE id = TRUE;
  GET DIAGNOSTICS v_rows = ROW_COUNT;

  SELECT som INTO v_after
  FROM public.notification_control
  WHERE id = TRUE;

  IF v_rows <> 0 OR v_after IS DISTINCT FROM v_before THEN
    RAISE EXCEPTION 'Security failure: non-admin UPDATE changed notification_control';
  END IF;

  BEGIN
    PERFORM public.set_notification_control(true,true,true,true,true,true,true,true,true,true);
    RAISE EXCEPTION 'Security failure: non-admin RPC unexpectedly succeeded';
  EXCEPTION WHEN insufficient_privilege THEN
    NULL;
  END;
END;
$test$;

RESET ROLE;

-- 2) The canonical master account is an administrator even if its role row
--    was not manually recreated. Its identity comes from auth.users.email.
DO $test$
DECLARE
  v_user_id uuid;
BEGIN
  SELECT u.id INTO v_user_id
  FROM auth.users AS u
  WHERE lower(u.email) = 'kevindosgames1@gmail.com';

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Test prerequisite missing: canonical master auth user';
  END IF;

  -- Temporarily remove the role row so this specifically exercises the
  -- canonical-email fallback. The outer transaction rolls this back.
  DELETE FROM public.user_roles
  WHERE user_id = v_user_id
    AND role = 'admin'::public.app_role;

  PERFORM pg_catalog.set_config('request.jwt.claim.sub', v_user_id::text, true);
END;
$test$;

SET LOCAL ROLE authenticated;

DO $test$
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Canonical master was not recognized as admin';
  END IF;

  PERFORM public.set_notification_control(true,true,true,true,true,true,true,true,true,true);
END;
$test$;

RESET ROLE;

-- 3) An additional administrator granted through user_roles can use the RPC.
DO $test$
DECLARE
  v_user_id uuid;
BEGIN
  SELECT ur.user_id INTO v_user_id
  FROM public.user_roles AS ur
  JOIN auth.users AS u ON u.id = ur.user_id
  WHERE ur.role = 'admin'::public.app_role
    AND lower(u.email) <> 'kevindosgames1@gmail.com'
  ORDER BY u.created_at
  LIMIT 1;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Test prerequisite missing: additional admin in user_roles';
  END IF;

  PERFORM pg_catalog.set_config('request.jwt.claim.sub', v_user_id::text, true);
END;
$test$;

SET LOCAL ROLE authenticated;

DO $test$
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Additional admin role was not recognized';
  END IF;

  PERFORM public.set_notification_control(true,true,true,true,true,true,true,true,true,true);
END;
$test$;

RESET ROLE;

-- 4) Anonymous callers have no table read privilege.
SET LOCAL ROLE anon;

DO $test$
DECLARE
  v_count integer;
BEGIN
  BEGIN
    SELECT count(*) INTO v_count FROM public.notification_control;
    RAISE EXCEPTION 'Security failure: anon SELECT unexpectedly succeeded';
  EXCEPTION WHEN insufficient_privilege THEN
    NULL;
  END;
END;
$test$;

RESET ROLE;
ROLLBACK;
