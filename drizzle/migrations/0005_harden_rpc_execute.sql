-- Restrict SECURITY DEFINER RPCs and trigger functions to their intended callers.
-- Trigger functions are invoked by PostgreSQL triggers and do not need API EXECUTE grants.

REVOKE ALL ON FUNCTION public.bind_courier_application_event_author() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.ensure_notification_preferences() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.protect_courier_application_decision() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.protect_order_changes() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.protect_profile_system_fields() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.redact_system_maintenance_log() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.kevin_enqueue_change() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.redact_maintenance_secret(text) FROM PUBLIC, anon, authenticated;

-- Application RPCs retain authenticated access, never anonymous access.
REVOKE ALL ON FUNCTION public.accept_order(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.accept_order(uuid) TO authenticated;
REVOKE ALL ON FUNCTION public.get_courier_order(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_courier_order(uuid) TO authenticated;
REVOKE ALL ON FUNCTION public.get_order_counterparty_profile(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_order_counterparty_profile(uuid) TO authenticated;
REVOKE ALL ON FUNCTION public.list_available_orders() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.list_available_orders() TO authenticated;

-- Pin the helper search_path to avoid object-shadowing.
CREATE OR REPLACE FUNCTION public.redact_maintenance_secret(value text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path = ''
AS $function$
BEGIN
  IF value IS NULL THEN RETURN NULL; END IF;
  value := regexp_replace(value, '(?i)(bearer\s+)[A-Za-z0-9._~+/=-]{20,}', '\1[REDACTED]', 'g');
  value := regexp_replace(value, '(?i)((?:api[_-]?key|token|secret|password|authorization)\s*[:=]\s*)[^\s,;]+', '\1[REDACTED]', 'g');
  value := regexp_replace(value, '(?i)\b(sk-[A-Za-z0-9_-]{20,}|gh[pousr]_[A-Za-z0-9_]{20,}|xox[baprs]-[A-Za-z0-9-]{20,}|AIza[A-Za-z0-9_-]{20,})\b', '[REDACTED]', 'g');
  value := regexp_replace(value, '-----BEGIN [^-]+ PRIVATE KEY-----[\s\S]*?-----END [^-]+ PRIVATE KEY-----', '[REDACTED PRIVATE KEY]', 'g');
  RETURN value;
END;
$function$;
