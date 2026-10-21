-- Atualização 21/10/2026: propostas privadas por pedido e categorias aprovadas.
-- A migration é aditiva: não remove tabelas, colunas, permissões ou dados existentes.

alter table public.courier_applications
  add column if not exists categorias_solicitadas text[] not null default '{}',
  add column if not exists categorias_aprovadas text[] not null default '{}';

create table if not exists public.order_proposals (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  courier_id uuid not null references auth.users(id) on delete cascade,
  valor_proposto numeric(10,2),
  distancia_estimada_km numeric(8,2),
  observacao text,
  status text not null default 'enviada'
    check (status in ('enviada','selecionada','nao_selecionada','retirada')),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  constraint order_proposals_nonnegative_price check (valor_proposto is null or valor_proposto >= 0),
  constraint order_proposals_nonnegative_distance check (distancia_estimada_km is null or distancia_estimada_km >= 0),
  constraint order_proposals_unique_courier_per_order unique (order_id, courier_id)
);

create index if not exists order_proposals_order_created_idx
  on public.order_proposals (order_id, criado_em desc);
create index if not exists order_proposals_courier_created_idx
  on public.order_proposals (courier_id, criado_em desc);
create unique index if not exists order_proposals_one_selected_per_order
  on public.order_proposals (order_id) where status = 'selecionada';

alter table public.order_proposals enable row level security;

drop policy if exists "proposal parties can read proposals" on public.order_proposals;
create policy "proposal parties can read proposals"
on public.order_proposals for select to authenticated
using (
  public.is_admin(auth.uid())
  or courier_id = auth.uid()
  or exists (
    select 1 from public.orders o
    where o.id = order_proposals.order_id and o.cliente_id = auth.uid()
  )
);

drop policy if exists "approved couriers can submit proposals" on public.order_proposals;
create policy "approved couriers can submit proposals"
on public.order_proposals for insert to authenticated
with check (
  courier_id = auth.uid()
  and status = 'enviada'
  and exists (
    select 1
    from public.orders o
    join public.courier_applications ca on ca.user_id = auth.uid()
    where o.id = order_proposals.order_id
      and o.status = 'aguardando_entregador'
      and ca.status = 'aprovado'
      and o.cliente_id <> auth.uid()
      and (
        cardinality(coalesce(ca.categorias_aprovadas, '{}')) = 0
        or o.categoria::text = any(ca.categorias_aprovadas)
      )
  )
);

drop policy if exists "client or author can update proposal" on public.order_proposals;
create policy "client or author can update proposal"
on public.order_proposals for update to authenticated
using (
  public.is_admin(auth.uid())
  or courier_id = auth.uid()
  or exists (
    select 1 from public.orders o
    where o.id = order_proposals.order_id and o.cliente_id = auth.uid()
  )
)
with check (
  public.is_admin(auth.uid())
  or (
    courier_id = auth.uid()
    and status in ('enviada','retirada')
  )
  or (
    status in ('selecionada','nao_selecionada')
    and exists (
      select 1 from public.orders o
      where o.id = order_proposals.order_id and o.cliente_id = auth.uid()
    )
  )
);

drop policy if exists "admins manage proposals" on public.order_proposals;
create policy "admins manage proposals"
on public.order_proposals for all to authenticated
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

revoke delete on public.order_proposals from authenticated;
grant select, insert, update on public.order_proposals to authenticated;

-- Os clientes não veem propostas de outros pedidos; propostas não incluem endereço/telefone.
-- A seleção exclusiva é garantida pelo índice parcial, inclusive em acessos concorrentes.
