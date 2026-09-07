-- 1) PROFILES: remover leitura ampla
DROP POLICY IF EXISTS "Profiles públicos para autenticados" ON public.profiles;

CREATE POLICY "Usuário vê próprio perfil"
ON public.profiles FOR SELECT TO authenticated
USING (auth.uid() = id);

CREATE POLICY "Admins veem todos os perfis"
ON public.profiles FOR SELECT TO authenticated
USING (public.is_admin(auth.uid()));

CREATE POLICY "Contraparte de pedido vê perfil"
ON public.profiles FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.orders o
    WHERE (o.cliente_id = auth.uid() AND o.entregador_id = profiles.id)
       OR (o.entregador_id = auth.uid() AND o.cliente_id = profiles.id)
       OR (o.cliente_id = profiles.id AND o.entregador_id IS NULL
           AND o.status = 'aguardando_entregador'::public.order_status)
  )
);

-- 2) REVIEWS: apenas envolvidos e admins
DROP POLICY IF EXISTS "Todos autenticados veem avaliações" ON public.reviews;

CREATE POLICY "Envolvidos e admins veem avaliações"
ON public.reviews FOR SELECT TO authenticated
USING (
  reviewer_id = auth.uid()
  OR reviewee_id = auth.uid()
  OR public.is_admin(auth.uid())
);

-- 3) CONFIG / AVISOS / CONTEÚDO: somente autenticados
DROP POLICY IF EXISTS "app_settings_read_all" ON public.app_settings;
CREATE POLICY "app_settings_read_auth"
ON public.app_settings FOR SELECT TO authenticated
USING (true);

DROP POLICY IF EXISTS "content_blocks_read_all" ON public.content_blocks;
CREATE POLICY "content_blocks_read_auth"
ON public.content_blocks FOR SELECT TO authenticated
USING (true);

DROP POLICY IF EXISTS "announcements_read_active" ON public.announcements;
CREATE POLICY "announcements_read_auth"
ON public.announcements FOR SELECT TO authenticated
USING (ativo = true OR public.has_role(auth.uid(), 'admin'::public.app_role));

REVOKE SELECT ON public.app_settings FROM anon;
REVOKE SELECT ON public.content_blocks FROM anon;
REVOKE SELECT ON public.announcements FROM anon;

-- 4) Funções internas não devem ser chamáveis por usuários
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.kevin_enqueue_change() FROM PUBLIC, anon, authenticated;