-- ===== Categorias de serviço =====
create table public.service_categories (
  slug text primary key check (slug ~ '^[a-z0-9_]{2,40}$'),
  nome text not null check (char_length(btrim(nome)) between 2 and 60),
  descricao text,
  ativo boolean not null default true,
  ordem integer not null default 100,
  criado_em timestamptz not null default now()
);
create unique index service_categories_nome_unique on public.service_categories (lower(btrim(nome)));
grant select on public.service_categories to authenticated;
grant all on public.service_categories to service_role;
alter table public.service_categories enable row level security;
create policy "logados leem categorias" on public.service_categories for select to authenticated using (true);
create policy "admins gerenciam categorias" on public.service_categories for all to authenticated
  using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));
grant insert, update on public.service_categories to authenticated;

insert into public.service_categories (slug, nome, descricao, ordem) values
  ('mercado','Fazer compras','Ir ao mercado ou loja e comprar para o cliente.',10),
  ('retirada','Buscar e entregar','Buscar um item e entregar.',20),
  ('farmacia','Farmácia','Medicamentos e itens de farmácia.',30),
  ('padaria','Alimentação','Padaria, lanches e comida.',40),
  ('favor','Resolver algo','Pagamentos, documentos e pequenas resoluções.',50),
  ('lojas','Lojas','Compras em lojas físicas.',60),
  ('livre','Outro favor','Pedidos livres.',70);

-- Categoria específica opcional do pedido (para categorias criadas pelo admin)
alter table public.orders add column if not exists categoria_servico text;

-- ===== Categorias aprovadas por prestador =====
create table public.provider_categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  categoria_slug text not null references public.service_categories(slug),
  qualificacao text,
  aprovado_em timestamptz not null default now(),
  aprovado_por uuid,
  unique (user_id, categoria_slug)
);
grant select on public.provider_categories to authenticated;
grant all on public.provider_categories to service_role;
alter table public.provider_categories enable row level security;
create policy "prestador vê suas categorias" on public.provider_categories for select to authenticated
  using (user_id = auth.uid() or public.is_admin(auth.uid()));

-- Legado: entregadores já aprovados mantêm acesso a todas as categorias
insert into public.provider_categories (user_id, categoria_slug, qualificacao)
select p.id, c.slug, 'Aprovado como entregador antes da divisão por categorias'
from public.profiles p cross join public.service_categories c
where p.tipo in ('entregador','ambos')
on conflict do nothing;

-- ===== Solicitações de categoria =====
create table public.provider_category_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  itens jsonb not null,
  status text not null default 'pendente' check (status in ('pendente','aprovada','recusada','parcial')),
  categorias_aprovadas text[] not null default '{}',
  observacao_admin text,
  criado_em timestamptz not null default now(),
  analisado_em timestamptz,
  analisado_por uuid
);
create index on public.provider_category_requests (user_id, criado_em desc);
create unique index provider_category_requests_one_pending on public.provider_category_requests (user_id) where status = 'pendente';
grant select on public.provider_category_requests to authenticated;
grant all on public.provider_category_requests to service_role;
alter table public.provider_category_requests enable row level security;
create policy "prestador vê suas solicitações" on public.provider_category_requests for select to authenticated
  using (user_id = auth.uid() or public.is_admin(auth.uid()));

-- ===== Propostas =====
create table public.order_proposals (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  prestador_id uuid not null,
  tipo_valor text not null check (tipo_valor in ('fixo','a_combinar')),
  valor_inicial numeric(10,2),
  tipo_valor_inicial text not null check (tipo_valor_inicial in ('fixo','a_combinar')),
  valor_atual numeric(10,2),
  mensagem text check (mensagem is null or char_length(mensagem) <= 500),
  status text not null default 'enviada' check (status in ('enviada','selecionada','nao_selecionada','retirada')),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  unique (order_id, prestador_id),
  check ((tipo_valor = 'fixo' and valor_atual > 0) or (tipo_valor = 'a_combinar' and valor_atual is null))
);
create unique index order_proposals_one_selected on public.order_proposals (order_id) where status = 'selecionada';
grant select on public.order_proposals to authenticated;
grant all on public.order_proposals to service_role;
alter table public.order_proposals enable row level security;
create policy "autor, cliente e admin veem proposta" on public.order_proposals for select to authenticated
  using (prestador_id = auth.uid() or public.is_admin(auth.uid())
         or exists (select 1 from public.orders o where o.id = order_id and o.cliente_id = auth.uid()));

create table public.order_proposal_events (
  id uuid primary key default gen_random_uuid(),
  proposal_id uuid not null references public.order_proposals(id) on delete cascade,
  autor_id uuid,
  evento text not null check (evento in ('criada','valor_alterado','selecionada','nao_selecionada','retirada')),
  tipo_valor text,
  valor numeric(10,2),
  criado_em timestamptz not null default now()
);
grant select on public.order_proposal_events to authenticated;
grant all on public.order_proposal_events to service_role;
alter table public.order_proposal_events enable row level security;
create policy "envolvidos veem histórico da proposta" on public.order_proposal_events for select to authenticated
  using (exists (select 1 from public.order_proposals pr join public.orders o on o.id = pr.order_id
                 where pr.id = proposal_id and (pr.prestador_id = auth.uid() or o.cliente_id = auth.uid() or public.is_admin(auth.uid()))));

-- ===== Fechar vazamentos de pedidos em aberto =====
drop policy if exists "Entregador vê pedidos disponíveis ou seus" on public.orders;
create policy "Entregador vê pedidos atribuídos" on public.orders for select to authenticated using (auth.uid() = entregador_id);
drop policy if exists "Cliente ou entregador atualiza pedido" on public.orders;
create policy "Cliente ou entregador atualiza pedido" on public.orders for update to authenticated
  using (auth.uid() = cliente_id or auth.uid() = entregador_id);
drop policy if exists "Contraparte de pedido vê perfil" on public.profiles;
create policy "Contraparte de pedido vê perfil" on public.profiles for select to authenticated
  using (exists (select 1 from public.orders o where
    (o.cliente_id = auth.uid() and o.entregador_id = profiles.id) or (o.entregador_id = auth.uid() and o.cliente_id = profiles.id)));

-- ===== Helpers =====
create or replace function public.is_active_provider(_uid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles p where p.id = _uid
    and p.tipo in ('entregador','ambos') and not p.bloqueado and not p.suspenso);
$$;

create or replace function public.order_category_slug(o public.orders)
returns text language sql immutable as $$ select coalesce(o.categoria_servico, o.categoria::text) $$;

-- ===== Pedido imutável para o cliente =====
create or replace function public.protect_order_changes()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null or public.is_admin(auth.uid()) then return new; end if;
  if tg_op = 'INSERT' then
    if new.cliente_id is distinct from auth.uid() then raise exception 'Pedido deve pertencer ao usuário logado'; end if;
    new.entregador_id := null; new.aceito_em := null;
    new.status := 'aguardando_entregador'; new.teste := false;
    if new.categoria_servico is not null and not exists (select 1 from public.service_categories c where c.slug = new.categoria_servico and c.ativo) then
      raise exception 'Categoria inválida';
    end if;
    return new;
  end if;
  -- conteúdo original nunca muda após o envio (somente admin)
  new.cliente_id := old.cliente_id; new.categoria := old.categoria; new.categoria_servico := old.categoria_servico;
  new.descricao := old.descricao; new.endereco_entrega := old.endereco_entrega; new.endereco_loja := old.endereco_loja;
  new.loja := old.loja; new.bairro := old.bairro; new.referencia := old.referencia; new.observacoes := old.observacoes;
  new.valor_produto := old.valor_produto; new.valor_frete := old.valor_frete; new.taxa_servico := old.taxa_servico;
  new.valor_estimado_min := old.valor_estimado_min; new.valor_estimado_max := old.valor_estimado_max; new.teste := old.teste;
  new.entregador_id := old.entregador_id; new.aceito_em := old.aceito_em;
  if old.cliente_id = auth.uid() and new.status is distinct from old.status then
    if not (new.status in ('cancelado','em_disputa') or (old.status = 'entregue' and new.status = 'confirmado')) then
      raise exception 'Alteração de status não permitida para o cliente';
    end if;
  end if;
  return new;
end; $$;
drop trigger if exists trg_protect_order_changes on public.orders;
create trigger trg_protect_order_changes before insert or update on public.orders
  for each row execute function public.protect_order_changes();

-- ===== RPCs do prestador =====
create or replace function public.list_available_orders()
returns table (id uuid, categoria public.order_category, categoria_servico text, loja text, bairro text, descricao text,
  valor_frete numeric, valor_estimado_min numeric, valor_estimado_max numeric, status public.order_status,
  criado_em timestamptz, minha_proposta_status text)
language plpgsql stable security definer set search_path = public as $$
declare caller uuid := auth.uid(); adm boolean := public.is_admin(auth.uid());
begin
  if not adm and not public.is_active_provider(caller) then raise exception 'Você não é um prestador ativo'; end if;
  return query
  select o.id, o.categoria, o.categoria_servico, o.loja, o.bairro, left(o.descricao, 280),
    o.valor_frete, o.valor_estimado_min, o.valor_estimado_max, o.status, o.criado_em,
    (select pr.status from public.order_proposals pr where pr.order_id = o.id and pr.prestador_id = caller)
  from public.orders o
  where o.status = 'aguardando_entregador' and o.entregador_id is null and o.cliente_id <> caller
    and (adm or exists (select 1 from public.provider_categories pc join public.service_categories sc on sc.slug = pc.categoria_slug
         where pc.user_id = caller and sc.ativo and pc.categoria_slug = coalesce(o.categoria_servico, o.categoria::text)))
  order by o.criado_em desc;
end; $$;

create or replace function public.get_courier_order(_order_id uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare o public.orders%rowtype; caller uuid := auth.uid(); adm boolean := public.is_admin(auth.uid()); minha jsonb;
begin
  select * into o from public.orders where id = _order_id;
  if not found then return null; end if;
  if o.entregador_id = caller then return to_jsonb(o); end if;
  if not adm and not public.is_active_provider(caller) then raise exception 'Você não é um prestador ativo'; end if;
  select to_jsonb(pr) into minha from public.order_proposals pr where pr.order_id = o.id and pr.prestador_id = caller;
  if not adm and not exists (select 1 from public.provider_categories pc where pc.user_id = caller
      and pc.categoria_slug = coalesce(o.categoria_servico, o.categoria::text)) and minha is null then
    return null;
  end if;
  return jsonb_build_object('id', o.id, 'categoria', o.categoria, 'categoria_servico', o.categoria_servico,
    'loja', o.loja, 'bairro', o.bairro, 'descricao', o.descricao,
    'valor_frete', o.valor_frete, 'valor_estimado_min', o.valor_estimado_min, 'valor_estimado_max', o.valor_estimado_max,
    'status', case when o.entregador_id is null then o.status else 'aceito' end,
    'criado_em', o.criado_em, 'entregador_id', null, 'cliente_id', null, 'restrito', true, 'minha_proposta', minha);
end; $$;

create or replace function public.get_order_counterparty_profile(_order_id uuid)
returns table (id uuid, nome text, telefone text)
language plpgsql stable security definer set search_path = public as $$
declare caller uuid := auth.uid(); other_id uuid;
begin
  select case when o.cliente_id = caller then o.entregador_id when o.entregador_id = caller then o.cliente_id end
  into other_id from public.orders o where o.id = _order_id and o.entregador_id is not null;
  if other_id is null then return; end if;
  return query select p.id, p.nome, p.telefone from public.profiles p where p.id = other_id;
end; $$;

create or replace function public.submit_proposal(_order_id uuid, _tipo_valor text, _valor numeric, _mensagem text)
returns uuid language plpgsql security definer set search_path = public as $$
declare caller uuid := auth.uid(); o public.orders%rowtype; pr public.order_proposals%rowtype; v numeric;
begin
  if caller is null then raise exception 'Faça login'; end if;
  if not public.is_active_provider(caller) then raise exception 'Apenas prestadores aprovados podem enviar propostas'; end if;
  if _tipo_valor not in ('fixo','a_combinar') then raise exception 'Tipo de valor inválido'; end if;
  if _tipo_valor = 'fixo' then
    if _valor is null or _valor <= 0 or _valor > 100000 then raise exception 'Informe um valor entre R$ 0,01 e R$ 100.000'; end if;
    v := round(_valor, 2);
  else v := null; end if;
  if _mensagem is not null and char_length(_mensagem) > 500 then raise exception 'Mensagem muito longa (máx. 500)'; end if;
  select * into o from public.orders where id = _order_id for update;
  if not found or o.status <> 'aguardando_entregador' or o.entregador_id is not null then raise exception 'Este pedido não está mais recebendo propostas'; end if;
  if o.cliente_id = caller then raise exception 'Você não pode propor no próprio pedido'; end if;
  if not exists (select 1 from public.provider_categories pc join public.service_categories sc on sc.slug = pc.categoria_slug
     where pc.user_id = caller and sc.ativo and pc.categoria_slug = coalesce(o.categoria_servico, o.categoria::text)) then
    raise exception 'Você não está aprovado para a categoria deste pedido';
  end if;
  select * into pr from public.order_proposals where order_id = _order_id and prestador_id = caller;
  if not found then
    insert into public.order_proposals (order_id, prestador_id, tipo_valor, valor_inicial, tipo_valor_inicial, valor_atual, mensagem)
    values (_order_id, caller, _tipo_valor, v, _tipo_valor, v, nullif(btrim(_mensagem), '')) returning * into pr;
    insert into public.order_proposal_events (proposal_id, autor_id, evento, tipo_valor, valor) values (pr.id, caller, 'criada', _tipo_valor, v);
  else
    if pr.status not in ('enviada','retirada') then raise exception 'Esta proposta não pode mais ser alterada'; end if;
    update public.order_proposals set tipo_valor = _tipo_valor, valor_atual = v, mensagem = nullif(btrim(_mensagem), ''),
      status = 'enviada', atualizado_em = now() where id = pr.id;
    insert into public.order_proposal_events (proposal_id, autor_id, evento, tipo_valor, valor) values (pr.id, caller, 'valor_alterado', _tipo_valor, v);
  end if;
  return pr.id;
end; $$;

create or replace function public.withdraw_proposal(_proposal_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare pr public.order_proposals%rowtype;
begin
  select * into pr from public.order_proposals where id = _proposal_id and prestador_id = auth.uid() for update;
  if not found then raise exception 'Proposta não encontrada'; end if;
  if pr.status <> 'enviada' then raise exception 'Somente propostas em análise podem ser retiradas'; end if;
  update public.order_proposals set status = 'retirada', atualizado_em = now() where id = pr.id;
  insert into public.order_proposal_events (proposal_id, autor_id, evento) values (pr.id, auth.uid(), 'retirada');
end; $$;

create or replace function public.list_my_proposals()
returns table (id uuid, order_id uuid, status text, tipo_valor text, valor_atual numeric, valor_inicial numeric,
  tipo_valor_inicial text, criado_em timestamptz, atualizado_em timestamptz,
  categoria public.order_category, categoria_servico text, loja text, bairro text, pedido_status public.order_status, sou_escolhido boolean)
language sql stable security definer set search_path = public as $$
  select pr.id, pr.order_id, pr.status, pr.tipo_valor, pr.valor_atual, pr.valor_inicial, pr.tipo_valor_inicial, pr.criado_em, pr.atualizado_em,
    o.categoria, o.categoria_servico, o.loja, o.bairro,
    case when o.entregador_id is null or o.entregador_id = auth.uid() then o.status else 'aceito'::public.order_status end,
    o.entregador_id = auth.uid()
  from public.order_proposals pr join public.orders o on o.id = pr.order_id
  where pr.prestador_id = auth.uid() order by pr.atualizado_em desc;
$$;

-- ===== RPCs do cliente =====
create or replace function public.list_order_proposals(_order_id uuid)
returns table (id uuid, prestador_id uuid, prestador_nome text, nota_media numeric, total_avaliacoes integer, total_entregas integer,
  qualificacao text, tipo_valor text, valor_atual numeric, tipo_valor_inicial text, valor_inicial numeric, mensagem text,
  status text, criado_em timestamptz, atualizado_em timestamptz, historico jsonb)
language plpgsql stable security definer set search_path = public as $$
declare o public.orders%rowtype;
begin
  select * into o from public.orders where orders.id = _order_id;
  if not found or (o.cliente_id <> auth.uid() and not public.is_admin(auth.uid())) then raise exception 'Sem acesso a este pedido'; end if;
  return query
  select pr.id, pr.prestador_id, split_part(p.nome, ' ', 1) || coalesce(' ' || left(nullif(split_part(p.nome, ' ', 2), ''), 1) || '.', ''),
    p.nota_media, p.total_avaliacoes, p.total_entregas,
    (select pc.qualificacao from public.provider_categories pc where pc.user_id = pr.prestador_id and pc.categoria_slug = coalesce(o.categoria_servico, o.categoria::text)),
    pr.tipo_valor, pr.valor_atual, pr.tipo_valor_inicial, pr.valor_inicial, pr.mensagem, pr.status, pr.criado_em, pr.atualizado_em,
    coalesce((select jsonb_agg(jsonb_build_object('evento', e.evento, 'tipo_valor', e.tipo_valor, 'valor', e.valor, 'criado_em', e.criado_em) order by e.criado_em)
      from public.order_proposal_events e where e.proposal_id = pr.id), '[]'::jsonb)
  from public.order_proposals pr left join public.profiles p on p.id = pr.prestador_id
  where pr.order_id = _order_id and pr.status <> 'retirada'
  order by pr.criado_em;
end; $$;

create or replace function public.select_proposal(_proposal_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare pr public.order_proposals%rowtype; o public.orders%rowtype;
begin
  select * into pr from public.order_proposals where id = _proposal_id;
  if not found then raise exception 'Proposta não encontrada'; end if;
  select * into o from public.orders where id = pr.order_id for update;
  if o.cliente_id <> auth.uid() then raise exception 'Apenas o cliente do pedido pode escolher'; end if;
  if o.status <> 'aguardando_entregador' or o.entregador_id is not null then raise exception 'Este pedido já tem um prestador escolhido'; end if;
  if pr.status <> 'enviada' then raise exception 'Esta proposta não está disponível'; end if;
  if not public.is_active_provider(pr.prestador_id) then raise exception 'Este prestador não está ativo no momento'; end if;
  update public.order_proposals set status = 'selecionada', atualizado_em = now() where id = pr.id;
  update public.order_proposals set status = 'nao_selecionada', atualizado_em = now() where order_id = o.id and id <> pr.id and status = 'enviada';
  insert into public.order_proposal_events (proposal_id, autor_id, evento) values (pr.id, auth.uid(), 'selecionada');
  insert into public.order_proposal_events (proposal_id, autor_id, evento)
    select id, auth.uid(), 'nao_selecionada' from public.order_proposals where order_id = o.id and status = 'nao_selecionada'
    and not exists (select 1 from public.order_proposal_events e where e.proposal_id = order_proposals.id and e.evento = 'nao_selecionada');
  update public.orders set entregador_id = pr.prestador_id, status = 'aceito', aceito_em = now(), atualizado_em = now() where id = o.id;
  insert into public.order_events (order_id, autor_id, status, nota) values (o.id, auth.uid(), 'aceito',
    'Proposta escolhida: ' || case when pr.tipo_valor = 'fixo' then 'R$ ' || to_char(pr.valor_atual, 'FM999G990D00') else 'a combinar' end);
end; $$;

-- ===== Solicitações de categorias =====
create or replace function public.submit_category_request(_itens jsonb)
returns uuid language plpgsql security definer set search_path = public as $$
declare caller uuid := auth.uid(); item jsonb; slugs text[] := '{}'; s text; j text; clean jsonb := '[]'::jsonb; rid uuid;
begin
  if caller is null then raise exception 'Faça login'; end if;
  if jsonb_typeof(_itens) <> 'array' or jsonb_array_length(_itens) = 0 then raise exception 'Selecione ao menos uma categoria'; end if;
  if jsonb_array_length(_itens) > 20 then raise exception 'Categorias demais'; end if;
  for item in select * from jsonb_array_elements(_itens) loop
    s := item->>'slug'; j := btrim(coalesce(item->>'justificativa', ''));
    if s is null or not exists (select 1 from public.service_categories where slug = s and ativo) then raise exception 'Categoria inválida: %', coalesce(s, '?'); end if;
    if s = any(slugs) then raise exception 'Categoria repetida: %', s; end if;
    if exists (select 1 from public.provider_categories where user_id = caller and categoria_slug = s) then raise exception 'Você já está aprovado em: %', s; end if;
    if char_length(j) < 10 or char_length(j) > 600 then raise exception 'Explique sua qualificação (10 a 600 caracteres) para cada categoria'; end if;
    slugs := slugs || s; clean := clean || jsonb_build_object('slug', s, 'justificativa', j);
  end loop;
  if exists (select 1 from public.provider_category_requests where user_id = caller and status = 'pendente') then
    raise exception 'Você já tem uma solicitação em análise';
  end if;
  insert into public.provider_category_requests (user_id, itens) values (caller, clean) returning id into rid;
  return rid;
end; $$;

create or replace function public.decide_category_request(_request_id uuid, _aprovadas text[], _observacao text)
returns void language plpgsql security definer set search_path = public as $$
declare r public.provider_category_requests%rowtype; item jsonb; ok text[] := '{}'; total int;
begin
  if not public.is_admin(auth.uid()) then raise exception 'Acesso restrito a administradores'; end if;
  select * into r from public.provider_category_requests where id = _request_id for update;
  if not found or r.status <> 'pendente' then raise exception 'Solicitação não está pendente'; end if;
  if r.user_id = auth.uid() and not exists (select 1 from public.user_roles where user_id = auth.uid() and role = 'admin') then raise exception 'Sem permissão'; end if;
  total := jsonb_array_length(r.itens);
  for item in select * from jsonb_array_elements(r.itens) loop
    if (item->>'slug') = any(coalesce(_aprovadas, '{}')) then
      insert into public.provider_categories (user_id, categoria_slug, qualificacao, aprovado_por)
      values (r.user_id, item->>'slug', item->>'justificativa', auth.uid())
      on conflict (user_id, categoria_slug) do update set qualificacao = excluded.qualificacao, aprovado_por = excluded.aprovado_por, aprovado_em = now();
      ok := ok || (item->>'slug');
    end if;
  end loop;
  update public.provider_category_requests set
    status = case when cardinality(ok) = 0 then 'recusada' when cardinality(ok) = total then 'aprovada' else 'parcial' end,
    categorias_aprovadas = ok, observacao_admin = nullif(btrim(_observacao), ''), analisado_em = now(), analisado_por = auth.uid()
  where id = r.id;
  insert into public.admin_audit_log (autor_id, acao, alvo_tipo, alvo_id, detalhes)
  values (auth.uid(), 'categoria_solicitacao_decidir', 'prestador', r.user_id::text, jsonb_build_object('aprovadas', ok, 'solicitacao', r.id));
end; $$;

create or replace function public.admin_list_category_requests(_status text)
returns table (id uuid, user_id uuid, nome text, tipo public.user_role, itens jsonb, status text, categorias_aprovadas text[],
  observacao_admin text, criado_em timestamptz, analisado_em timestamptz, aprovadas_atuais text[])
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin(auth.uid()) then raise exception 'Acesso restrito a administradores'; end if;
  return query select r.id, r.user_id, p.nome, p.tipo, r.itens, r.status, r.categorias_aprovadas, r.observacao_admin, r.criado_em, r.analisado_em,
    coalesce((select array_agg(pc.categoria_slug) from public.provider_categories pc where pc.user_id = r.user_id), '{}')
  from public.provider_category_requests r left join public.profiles p on p.id = r.user_id
  where _status is null or r.status = _status order by r.criado_em desc limit 200;
end; $$;

do $$ declare f text; begin
  foreach f in array array['public.is_active_provider(uuid)','public.list_available_orders()','public.get_courier_order(uuid)',
    'public.get_order_counterparty_profile(uuid)','public.submit_proposal(uuid,text,numeric,text)','public.withdraw_proposal(uuid)',
    'public.list_my_proposals()','public.list_order_proposals(uuid)','public.select_proposal(uuid)',
    'public.submit_category_request(jsonb)','public.decide_category_request(uuid,text[],text)','public.admin_list_category_requests(text)'] loop
    execute format('revoke all on function %s from public, anon', f);
    execute format('grant execute on function %s to authenticated', f);
  end loop;
end $$;
revoke all on function public.protect_order_changes() from public, anon, authenticated;