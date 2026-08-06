REVOKE EXECUTE ON FUNCTION public.kevin_enqueue_change() FROM PUBLIC, anon, authenticated;
CREATE POLICY "Admins veem backups" ON public.kevin_backups FOR SELECT TO authenticated USING (is_admin(auth.uid()));
GRANT SELECT ON public.kevin_backups TO authenticated;