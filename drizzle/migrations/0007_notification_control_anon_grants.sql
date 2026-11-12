-- Defense in depth: remove direct table access from anon/PUBLIC.
-- Authenticated administrators continue to read/update through the RLS policies
-- defined in 0004_notification_control_hardening.sql.

REVOKE ALL ON TABLE public.notification_control FROM PUBLIC, anon;
REVOKE INSERT, DELETE ON TABLE public.notification_control FROM authenticated;
GRANT SELECT, UPDATE ON TABLE public.notification_control TO authenticated;
