ALTER TABLE public.courier_applications
  ADD COLUMN IF NOT EXISTS ja_trabalhou_entregas boolean,
  ADD COLUMN IF NOT EXISTS possui_smartphone boolean,
  ADD COLUMN IF NOT EXISTS possui_documento boolean,
  ADD COLUMN IF NOT EXISTS possui_bag boolean,
  ADD COLUMN IF NOT EXISTS motivo text,
  ADD COLUMN IF NOT EXISTS info_adicional text,
  ADD COLUMN IF NOT EXISTS analise_observacao text,
  ADD COLUMN IF NOT EXISTS analisado_em timestamp with time zone,
  ADD COLUMN IF NOT EXISTS analisado_por uuid;

CREATE TABLE IF NOT EXISTS public.courier_application_events (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  application_id uuid NOT NULL REFERENCES public.courier_applications(id) ON DELETE CASCADE,
  autor_id uuid,
  status text NOT NULL,
  nota text,
  criado_em timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.courier_application_events TO authenticated;
GRANT ALL ON public.courier_application_events TO service_role;

ALTER TABLE public.courier_application_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Dono ve o historico da propria candidatura"
ON public.courier_application_events FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.courier_applications a
  WHERE a.id = application_id AND a.user_id = auth.uid()
));

CREATE POLICY "Admins veem todo o historico"
ON public.courier_application_events FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Dono registra evento da propria candidatura"
ON public.courier_application_events FOR INSERT TO authenticated
WITH CHECK (EXISTS (
  SELECT 1 FROM public.courier_applications a
  WHERE a.id = application_id AND a.user_id = auth.uid()
));

CREATE INDEX IF NOT EXISTS courier_application_events_app_idx
  ON public.courier_application_events (application_id, criado_em DESC);