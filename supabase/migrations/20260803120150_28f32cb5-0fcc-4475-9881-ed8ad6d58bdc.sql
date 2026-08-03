-- 1. Enum additions
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'ambos';
ALTER TYPE public.order_status ADD VALUE IF NOT EXISTS 'indo_loja' AFTER 'aceito';

-- 2. Admin helper (has_role is service_role only)
CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = 'admin'
  )
$$;
REVOKE ALL ON FUNCTION public.is_admin(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO authenticated, service_role;

-- 3. Profiles: moderation flags
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS bloqueado boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS suspenso boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS total_entregas integer NOT NULL DEFAULT 0;

CREATE POLICY "Admins gerenciam perfis"
ON public.profiles FOR UPDATE TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

-- 4. Orders: accepted timestamp + admin policies
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS aceito_em timestamptz;

CREATE POLICY "Admins veem todos os pedidos"
ON public.orders FOR SELECT TO authenticated
USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins editam todos os pedidos"
ON public.orders FOR UPDATE TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins apagam pedidos"
ON public.orders FOR DELETE TO authenticated
USING (public.is_admin(auth.uid()));

-- 5. Reviews: detailed criteria
ALTER TABLE public.reviews
  ADD COLUMN IF NOT EXISTS comunicacao integer,
  ADD COLUMN IF NOT EXISTS rapidez integer,
  ADD COLUMN IF NOT EXISTS educacao integer,
  ADD COLUMN IF NOT EXISTS confiabilidade integer;

-- 6. Order events (timeline)
CREATE TABLE IF NOT EXISTS public.order_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  autor_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  status public.order_status NOT NULL,
  nota text,
  criado_em timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS order_events_order_idx ON public.order_events(order_id, criado_em);
GRANT SELECT, INSERT ON public.order_events TO authenticated;
GRANT ALL ON public.order_events TO service_role;
ALTER TABLE public.order_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participantes veem eventos"
ON public.order_events FOR SELECT TO authenticated
USING (
  public.is_admin(auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = order_events.order_id
      AND (o.cliente_id = auth.uid() OR o.entregador_id = auth.uid())
  )
);

CREATE POLICY "Participantes registram eventos"
ON public.order_events FOR INSERT TO authenticated
WITH CHECK (
  autor_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = order_events.order_id
      AND (o.cliente_id = auth.uid() OR o.entregador_id = auth.uid())
  )
);

-- 7. Attachments (comprovantes)
CREATE TABLE IF NOT EXISTS public.order_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  uploader_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  path text NOT NULL,
  tipo text NOT NULL DEFAULT 'comprovante',
  descricao text,
  criado_em timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS order_attachments_order_idx ON public.order_attachments(order_id, criado_em);
GRANT SELECT, INSERT, DELETE ON public.order_attachments TO authenticated;
GRANT ALL ON public.order_attachments TO service_role;
ALTER TABLE public.order_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participantes veem comprovantes"
ON public.order_attachments FOR SELECT TO authenticated
USING (
  public.is_admin(auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = order_attachments.order_id
      AND (o.cliente_id = auth.uid() OR o.entregador_id = auth.uid())
  )
);

CREATE POLICY "Participantes enviam comprovantes"
ON public.order_attachments FOR INSERT TO authenticated
WITH CHECK (
  uploader_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = order_attachments.order_id
      AND (o.cliente_id = auth.uid() OR o.entregador_id = auth.uid())
  )
);

CREATE POLICY "Autor ou admin remove comprovante"
ON public.order_attachments FOR DELETE TO authenticated
USING (uploader_id = auth.uid() OR public.is_admin(auth.uid()));

-- 8. Disputes
CREATE TABLE IF NOT EXISTS public.disputes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  aberto_por uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  motivo text NOT NULL,
  descricao text,
  status text NOT NULL DEFAULT 'aberta',
  resposta_admin text,
  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS disputes_order_idx ON public.disputes(order_id);
GRANT SELECT, INSERT ON public.disputes TO authenticated;
GRANT ALL ON public.disputes TO service_role;
ALTER TABLE public.disputes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participantes veem disputas"
ON public.disputes FOR SELECT TO authenticated
USING (
  public.is_admin(auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = disputes.order_id
      AND (o.cliente_id = auth.uid() OR o.entregador_id = auth.uid())
  )
);

CREATE POLICY "Participantes abrem disputas"
ON public.disputes FOR INSERT TO authenticated
WITH CHECK (
  aberto_por = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = disputes.order_id
      AND (o.cliente_id = auth.uid() OR o.entregador_id = auth.uid())
  )
);

CREATE POLICY "Admins resolvem disputas"
ON public.disputes FOR UPDATE TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

-- 9. Admin read access to reviews already public to authenticated; keep as is.
CREATE OR REPLACE FUNCTION public.touch_atualizado_em()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.atualizado_em = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_disputes_atualizado_em
BEFORE UPDATE ON public.disputes
FOR EACH ROW EXECUTE FUNCTION public.touch_atualizado_em();