-- Restrict the global notification control row to administrators only.
-- This closes the permissive authenticated SELECT policy created by
-- 20261002180000_centralize_notification_control.sql.
--
-- SECURITY INVOKER keeps the table's grants and RLS policies as the
-- enforcement boundary for both RPCs.

DROP POLICY IF EXISTS "authenticated read notification control"
  ON public.notification_control;
DROP POLICY IF EXISTS "admins read notification control"
  ON public.notification_control;
DROP POLICY IF EXISTS "admins update notification control"
  ON public.notification_control;

CREATE POLICY "admins read notification control"
  ON public.notification_control
  FOR SELECT
  TO authenticated
  USING (public.is_admin((SELECT auth.uid())));

CREATE POLICY "admins update notification control"
  ON public.notification_control
  FOR UPDATE
  TO authenticated
  USING (public.is_admin((SELECT auth.uid())))
  WITH CHECK (public.is_admin((SELECT auth.uid())));

-- RLS controls which authenticated users can see/update the singleton row.
-- Do not allow clients to insert or delete the global control record.
REVOKE ALL ON TABLE public.notification_control FROM PUBLIC, anon;
REVOKE INSERT, DELETE ON TABLE public.notification_control FROM authenticated;
GRANT SELECT, UPDATE ON TABLE public.notification_control TO authenticated;

CREATE OR REPLACE FUNCTION public.get_notification_control()
RETURNS public.notification_control
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $function$
DECLARE
  result_row public.notification_control;
BEGIN
  IF NOT public.is_admin((SELECT auth.uid())) THEN
    RAISE EXCEPTION 'admin access required' USING ERRCODE = '42501';
  END IF;

  SELECT c.* INTO result_row
  FROM public.notification_control AS c
  WHERE c.id = TRUE;

  RETURN result_row;
END;
$function$;

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
      atualizado_em = NOW()
  WHERE id = TRUE
  RETURNING * INTO result_row;

  RETURN result_row;
END;
$function$;

REVOKE ALL ON FUNCTION public.get_notification_control() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.set_notification_control(
  boolean, boolean, boolean, boolean, boolean,
  boolean, boolean, boolean, boolean, boolean
) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.get_notification_control() TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_notification_control(
  boolean, boolean, boolean, boolean, boolean,
  boolean, boolean, boolean, boolean, boolean
) TO authenticated;
