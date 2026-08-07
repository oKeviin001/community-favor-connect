ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS bairro text,
  ADD COLUMN IF NOT EXISTS referencia text,
  ADD COLUMN IF NOT EXISTS valor_estimado_min numeric,
  ADD COLUMN IF NOT EXISTS valor_estimado_max numeric;

CREATE TABLE IF NOT EXISTS public.courier_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nome_completo text NOT NULL,
  cpf text NOT NULL,
  data_nascimento date,
  telefone text NOT NULL,
  email text,
  endereco text,
  numero text,
  complemento text,
  bairro text,
  cidade text,
  estado text,
  cep text,
  doc_frente_url text,
  doc_selfie_url text,
  comprovante_residencia_url text,
  transporte text NOT NULL DEFAULT 'bicicleta',
  dias_semana text[] NOT NULL DEFAULT '{}',
  horarios text[] NOT NULL DEFAULT '{}',
  regiao_atuacao text,
  observacoes text,
  status text NOT NULL DEFAULT 'pendente',
  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.courier_applications TO authenticated;
GRANT ALL ON public.courier_applications TO service_role;

ALTER TABLE public.courier_applications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "own application select" ON public.courier_applications;
CREATE POLICY "own application select" ON public.courier_applications
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "own application insert" ON public.courier_applications;
CREATE POLICY "own application insert" ON public.courier_applications
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "own application update" ON public.courier_applications;
CREATE POLICY "own application update" ON public.courier_applications
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id OR public.is_admin(auth.uid()))
  WITH CHECK (auth.uid() = user_id OR public.is_admin(auth.uid()));

CREATE OR REPLACE FUNCTION public.touch_courier_application()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.atualizado_em = now(); RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS trg_touch_courier_application ON public.courier_applications;
CREATE TRIGGER trg_touch_courier_application BEFORE UPDATE ON public.courier_applications
FOR EACH ROW EXECUTE FUNCTION public.touch_courier_application();

DROP POLICY IF EXISTS "documentos own read" ON storage.objects;
CREATE POLICY "documentos own read" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'documentos' AND (auth.uid()::text = (storage.foldername(name))[1] OR public.is_admin(auth.uid())));

DROP POLICY IF EXISTS "documentos own write" ON storage.objects;
CREATE POLICY "documentos own write" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'documentos' AND auth.uid()::text = (storage.foldername(name))[1]);