DROP POLICY IF EXISTS "authenticated read notification control" ON public.notification_control;
CREATE POLICY "active users read notification control"
ON public.notification_control
FOR SELECT
TO authenticated
USING (
  public.is_admin(auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.bloqueado = false
  )
);