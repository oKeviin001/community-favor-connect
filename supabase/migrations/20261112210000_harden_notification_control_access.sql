-- Notification control access hardening.
-- Ordinary authenticated users must read the global switches because the app
-- loads them during normal startup. Only admins may change the singleton row.

-- Rebuild the admin predicate using the authenticated JWT identity only.
-- The UUID argument is retained for API compatibility; it is intentionally
-- ignored so callers cannot test another user's privileges.
CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $function$
  SELECT auth.uid() IS NOT NULL
     AND (
       EXISTS (
         SELECT 1
         FROM public.user_roles AS ur
         WHERE ur.user_id = auth.uid()
           AND ur.role = 'admin'::public.app_role
       )
       OR EXISTS (
         SELECT 1
         FROM auth.users AS u
         WHERE u.id = auth.uid()
           AND lower(u.email) = 'kevindosgames1@gmail.com'
       )
     );
$function$;

REVOKE ALL ON FUNCTION public.is_admin(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO authenticated, service_role;

ALTER TABLE public.notification_control ENABLE ROW LEVEL SECURITY;

-- Remove the conflicting historical policies, then establish one predictable
-- SELECT policy for all signed-in users and one admin-only UPDATE policy.
DROP POLICY IF EXISTS "authenticated read notification control"
  ON public.notification_control;
DROP POLICY IF EXISTS "admins read notification control"
  ON public.notification_control;
DROP POLICY IF EXISTS "admins update notification control"
  ON public.notification_control;

CREATE POLICY "authenticated read notification control"
  ON public.notification_control
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "admins update notification control"
  ON public.notification_control
  FOR UPDATE
  TO authenticated
  USING (public.is_admin((SELECT auth.uid())))
  WITH CHECK (public.is_admin((SELECT auth.uid())));

-- Remove broad/default table privileges, then grant only the operations the
-- client requires. RLS limits UPDATE to admins; INSERT/DELETE/TRUNCATE/etc.
-- remain unavailable to ordinary authenticated clients.
REVOKE ALL PRIVILEGES ON TABLE public.notification_control
  FROM PUBLIC, anon, authenticated;
GRANT SELECT, UPDATE ON TABLE public.notification_control TO authenticated;

-- The UI reads the table directly. This legacy getter is unused and is removed
-- to avoid maintaining a second read path.
DROP FUNCTION IF EXISTS public.get_notification_control();

-- Keep the write RPC as SECURITY INVOKER so the table grants and RLS policy
-- above remain the enforcement boundary.
CREATE OR REPLACE FUNCTION public.set_notification_control(
  _pedidos boolean,
  _mensagens boolean,
  _entregas boolean,
  _avaliacoes boolean,
  _candidatura boolean,
  _pagamentos boolean,
  _disputas boolean,
  _seguranca boolean,
  _sistema boolean,
  _som boolean
)
RETURNS public.notification_control
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $function$
DECLARE
  result_row public.notification_control;
BEGIN
  IF NOT public.is_admin((SELECT auth.uid())) THEN
    RAISE EXCEPTION 'admin access required' USING ERRCODE = '42501';
  END IF;

  UPDATE public.notification_control
  SET pedidos = _pedidos,
      mensagens = _mensagens,
      entregas = _entregas,
      avaliacoes = _avaliacoes,
      candidatura = _candidatura,
      pagamentos = _pagamentos,
      disputas = _disputas,
      seguranca = _seguranca,
      sistema = _sistema,
      som = _som,
      atualizado_em = pg_catalog.now()
  WHERE id = TRUE
  RETURNING * INTO result_row;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'notification control row is missing';
  END IF;

  RETURN result_row;
END;
$function$;

REVOKE ALL ON FUNCTION public.set_notification_control(
  boolean, boolean, boolean, boolean, boolean,
  boolean, boolean, boolean, boolean, boolean
) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_notification_control(
  boolean, boolean, boolean, boolean, boolean,
  boolean, boolean, boolean, boolean, boolean
) TO authenticated;
