
-- Enums
CREATE TYPE public.user_role AS ENUM ('cliente', 'entregador');
CREATE TYPE public.order_status AS ENUM (
  'aguardando_entregador','aceito','em_compra','compra_finalizada',
  'em_entrega','entregue','confirmado','cancelado','em_disputa'
);
CREATE TYPE public.order_category AS ENUM ('mercado','farmacia','padaria','lojas','retirada','favor','livre');
CREATE TYPE public.payment_status AS ENUM ('depositado','liberado','reembolsado','cancelado');

-- profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  telefone TEXT,
  avatar_url TEXT,
  tipo public.user_role NOT NULL DEFAULT 'cliente',
  bairro TEXT,
  nota_media NUMERIC(3,2) DEFAULT 0,
  total_avaliacoes INT DEFAULT 0,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Profiles públicos para autenticados" ON public.profiles
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Usuário edita próprio perfil" ON public.profiles
  FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "Usuário insere próprio perfil" ON public.profiles
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

-- Trigger para criar profile automaticamente
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, nome, tipo)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nome', NEW.raw_user_meta_data->>'full_name', split_part(NEW.email,'@',1)),
    COALESCE((NEW.raw_user_meta_data->>'tipo')::public.user_role, 'cliente')
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- orders
CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  entregador_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  categoria public.order_category NOT NULL DEFAULT 'livre',
  descricao TEXT NOT NULL,
  loja TEXT,
  endereco_loja TEXT,
  endereco_entrega TEXT NOT NULL,
  observacoes TEXT,
  valor_produto NUMERIC(10,2) NOT NULL DEFAULT 0,
  valor_frete NUMERIC(10,2) NOT NULL DEFAULT 0,
  taxa_servico NUMERIC(10,2) NOT NULL DEFAULT 0,
  total NUMERIC(10,2) GENERATED ALWAYS AS (valor_produto + valor_frete + taxa_servico) STORED,
  status public.order_status NOT NULL DEFAULT 'aguardando_entregador',
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.orders TO authenticated;
GRANT ALL ON public.orders TO service_role;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Cliente vê próprios pedidos" ON public.orders
  FOR SELECT TO authenticated USING (auth.uid() = cliente_id);
CREATE POLICY "Entregador vê pedidos disponíveis ou seus" ON public.orders
  FOR SELECT TO authenticated USING (
    entregador_id IS NULL OR auth.uid() = entregador_id
  );
CREATE POLICY "Cliente cria pedido" ON public.orders
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = cliente_id);
CREATE POLICY "Cliente ou entregador atualiza pedido" ON public.orders
  FOR UPDATE TO authenticated USING (
    auth.uid() = cliente_id OR auth.uid() = entregador_id OR
    (entregador_id IS NULL AND status = 'aguardando_entregador')
  );

CREATE INDEX idx_orders_cliente ON public.orders(cliente_id);
CREATE INDEX idx_orders_entregador ON public.orders(entregador_id);
CREATE INDEX idx_orders_status ON public.orders(status);

-- messages
CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  texto TEXT NOT NULL,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.messages TO authenticated;
GRANT ALL ON public.messages TO service_role;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participantes leem mensagens" ON public.messages
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_id AND (o.cliente_id = auth.uid() OR o.entregador_id = auth.uid())
    )
  );
CREATE POLICY "Participantes enviam mensagens" ON public.messages
  FOR INSERT TO authenticated WITH CHECK (
    sender_id = auth.uid() AND EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_id AND (o.cliente_id = auth.uid() OR o.entregador_id = auth.uid())
    )
  );

CREATE INDEX idx_messages_order ON public.messages(order_id, criado_em);
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER TABLE public.messages REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
ALTER TABLE public.orders REPLICA IDENTITY FULL;

-- reviews
CREATE TABLE public.reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  reviewer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reviewee_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  nota INT NOT NULL CHECK (nota BETWEEN 1 AND 5),
  comentario TEXT,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(order_id, reviewer_id)
);
GRANT SELECT, INSERT ON public.reviews TO authenticated;
GRANT ALL ON public.reviews TO service_role;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Todos autenticados veem avaliações" ON public.reviews
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Participantes avaliam pedido entregue" ON public.reviews
  FOR INSERT TO authenticated WITH CHECK (
    reviewer_id = auth.uid() AND EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_id
        AND o.status IN ('entregue','confirmado')
        AND (o.cliente_id = auth.uid() OR o.entregador_id = auth.uid())
    )
  );

-- payments
CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  valor NUMERIC(10,2) NOT NULL,
  status public.payment_status NOT NULL DEFAULT 'depositado',
  ref_externa TEXT,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.payments TO authenticated;
GRANT ALL ON public.payments TO service_role;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participantes veem pagamentos" ON public.payments
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_id AND (o.cliente_id = auth.uid() OR o.entregador_id = auth.uid())
    )
  );
CREATE POLICY "Cliente cria pagamento próprio" ON public.payments
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND o.cliente_id = auth.uid())
  );
