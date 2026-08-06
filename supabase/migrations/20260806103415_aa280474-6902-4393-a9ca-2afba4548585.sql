-- ============ PROTOCOLO KEVIN ============

CREATE TABLE public.kevin_app_identity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  app_slug text NOT NULL,
  app_nome text NOT NULL,
  app_uuid uuid NOT NULL DEFAULT gen_random_uuid(),
  versao text NOT NULL DEFAULT '1.0.0',
  base_url text,
  criado_em timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.kevin_app_identity TO authenticated;
GRANT ALL ON public.kevin_app_identity TO service_role;
ALTER TABLE public.kevin_app_identity ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins veem identidade" ON public.kevin_app_identity FOR SELECT TO authenticated USING (is_admin(auth.uid()));

INSERT INTO public.kevin_app_identity (app_slug, app_nome, versao)
VALUES ('pede-pro-kevin', 'Pede pro Kevin', '1.0.0');

CREATE TABLE public.kevin_pairing_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo text NOT NULL UNIQUE,
  criado_por uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  criado_em timestamptz NOT NULL DEFAULT now(),
  expira_em timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'ativo',
  permissoes jsonb NOT NULL DEFAULT '[]'::jsonb,
  usado_por_nome text,
  usado_por_uuid uuid,
  usado_em timestamptz,
  token_emitido text
);
GRANT SELECT ON public.kevin_pairing_codes TO authenticated;
GRANT ALL ON public.kevin_pairing_codes TO service_role;
ALTER TABLE public.kevin_pairing_codes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins veem codigos" ON public.kevin_pairing_codes FOR SELECT TO authenticated USING (is_admin(auth.uid()));

CREATE TABLE public.kevin_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  remote_uuid uuid NOT NULL UNIQUE,
  remote_nome text NOT NULL,
  remote_slug text,
  remote_versao text,
  remote_base_url text,
  direcao text NOT NULL DEFAULT 'saida',
  token_entrada text,
  token_saida text,
  permissoes jsonb NOT NULL DEFAULT '[]'::jsonb,
  manifesto jsonb,
  estrutura jsonb,
  status text NOT NULL DEFAULT 'conectado',
  ultimo_erro text,
  conectado_em timestamptz NOT NULL DEFAULT now(),
  ultima_sync timestamptz
);
GRANT SELECT ON public.kevin_connections TO authenticated;
GRANT ALL ON public.kevin_connections TO service_role;
ALTER TABLE public.kevin_connections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins veem conexoes" ON public.kevin_connections FOR SELECT TO authenticated USING (is_admin(auth.uid()));

CREATE TABLE public.kevin_transfer_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conexao_id uuid REFERENCES public.kevin_connections(id) ON DELETE SET NULL,
  origem text NOT NULL,
  destino text NOT NULL,
  direcao text NOT NULL,
  operacao text NOT NULL,
  tipos jsonb NOT NULL DEFAULT '[]'::jsonb,
  registros integer NOT NULL DEFAULT 0,
  detalhes jsonb,
  status text NOT NULL DEFAULT 'concluido',
  erro text,
  criado_em timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.kevin_transfer_log TO authenticated;
GRANT ALL ON public.kevin_transfer_log TO service_role;
ALTER TABLE public.kevin_transfer_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins veem historico" ON public.kevin_transfer_log FOR SELECT TO authenticated USING (is_admin(auth.uid()));

CREATE TABLE public.kevin_backups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  origem text NOT NULL,
  itens jsonb NOT NULL DEFAULT '[]'::jsonb,
  registros integer NOT NULL DEFAULT 0,
  tamanho_bytes integer NOT NULL DEFAULT 0,
  conteudo jsonb NOT NULL,
  status text NOT NULL DEFAULT 'concluido',
  criado_em timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.kevin_backups TO service_role;
ALTER TABLE public.kevin_backups ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.kevin_inbox (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conexao_id uuid REFERENCES public.kevin_connections(id) ON DELETE CASCADE,
  origem text NOT NULL,
  tipo text NOT NULL,
  remote_id text NOT NULL,
  payload jsonb NOT NULL,
  recebido_em timestamptz NOT NULL DEFAULT now(),
  UNIQUE (conexao_id, tipo, remote_id)
);
GRANT SELECT ON public.kevin_inbox TO authenticated;
GRANT ALL ON public.kevin_inbox TO service_role;
ALTER TABLE public.kevin_inbox ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins veem dados recebidos" ON public.kevin_inbox FOR SELECT TO authenticated USING (is_admin(auth.uid()));

CREATE TABLE public.kevin_sync_queue (
  id bigserial PRIMARY KEY,
  tipo text NOT NULL,
  registro_id text NOT NULL,
  evento text NOT NULL,
  criado_em timestamptz NOT NULL DEFAULT now(),
  processado_em timestamptz
);
GRANT SELECT ON public.kevin_sync_queue TO authenticated;
GRANT ALL ON public.kevin_sync_queue TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.kevin_sync_queue_id_seq TO service_role;
ALTER TABLE public.kevin_sync_queue ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins veem fila" ON public.kevin_sync_queue FOR SELECT TO authenticated USING (is_admin(auth.uid()));
CREATE INDEX kevin_sync_queue_pendentes ON public.kevin_sync_queue (criado_em) WHERE processado_em IS NULL;

-- Registro automático de alterações relevantes
CREATE OR REPLACE FUNCTION public.kevin_enqueue_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.kevin_sync_queue (tipo, registro_id, evento)
  VALUES (TG_ARGV[0], COALESCE(NEW.id::text, OLD.id::text), lower(TG_OP));
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER kevin_sync_orders AFTER INSERT OR UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.kevin_enqueue_change('pedidos');
CREATE TRIGGER kevin_sync_profiles AFTER INSERT OR UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.kevin_enqueue_change('usuarios');
CREATE TRIGGER kevin_sync_reviews AFTER INSERT ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION public.kevin_enqueue_change('avaliacoes');
CREATE TRIGGER kevin_sync_disputes AFTER INSERT OR UPDATE ON public.disputes
  FOR EACH ROW EXECUTE FUNCTION public.kevin_enqueue_change('reclamacoes');

-- ============ LGPD ============

CREATE TABLE public.user_consents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  termos_versao text NOT NULL,
  privacidade_versao text NOT NULL,
  aceito_em timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, termos_versao, privacidade_versao)
);
GRANT SELECT, INSERT ON public.user_consents TO authenticated;
GRANT ALL ON public.user_consents TO service_role;
ALTER TABLE public.user_consents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Usuario ve proprio consentimento" ON public.user_consents FOR SELECT TO authenticated USING (auth.uid() = user_id OR is_admin(auth.uid()));
CREATE POLICY "Usuario registra consentimento" ON public.user_consents FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.account_deletion_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  motivo text,
  status text NOT NULL DEFAULT 'pendente',
  criado_em timestamptz NOT NULL DEFAULT now(),
  atendido_em timestamptz
);
GRANT SELECT, INSERT ON public.account_deletion_requests TO authenticated;
GRANT ALL ON public.account_deletion_requests TO service_role;
ALTER TABLE public.account_deletion_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Usuario ve propria solicitacao" ON public.account_deletion_requests FOR SELECT TO authenticated USING (auth.uid() = user_id OR is_admin(auth.uid()));
CREATE POLICY "Usuario solicita exclusao" ON public.account_deletion_requests FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins atualizam solicitacao" ON public.account_deletion_requests FOR UPDATE TO authenticated USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));