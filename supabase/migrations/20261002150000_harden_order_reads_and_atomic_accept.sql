-- Close the remaining order/profile read leaks and make order acceptance atomic.

alter table public.orders enable row level security;
alter table public.profiles enable row level security;

do $$
declare
  p record;
begin
  for p in
    select policyname
    from pg_policies
    where schemaname = 'public'
      and tablename = 'orders'
      and cmd = 'SELECT'
  loop
    execute format('drop policy if exists %I on public.orders', p.policyname);
  end loop;

  for p in
    select policyname
    from pg_policies
    where schemaname = 'public'
      and tablename = 'profiles'
      and cmd = 'SELECT'
  loop
    execute format('drop policy if exists %I on public.profiles', p.policyname);
  end loop;
end
$$;

create policy "orders_select_admin"
on public.orders
for select
to authenticated
using ((select public.is_admin()));

create policy "orders_select_client"
on public.orders
for select
to authenticated
using ((select auth.uid()) = cliente_id);

create policy "orders_select_assigned_courier"
on public.orders
for select
to authenticated
using ((select auth.uid()) = entregador_id);

create policy "profiles_select_self"
on public.profiles
for select
to authenticated
using ((select auth.uid()) = id);

create policy "profiles_select_admin"
on public.profiles
for select
to authenticated
using ((select public.is_admin()));

create policy "profiles_select_accepted_counterparty"
on public.profiles
for select
to authenticated
using (
  exists (
    select 1
    from public.orders o
    where o.entregador_id is not null
      and (
        (o.cliente_id = (select auth.uid()) and o.entregador_id = public.profiles.id)
        or
        (o.entregador_id = (select auth.uid()) and o.cliente_id = public.profiles.id)
      )
  )
);

grant select on public.orders to authenticated;
grant select on public.profiles to authenticated;

create or replace function public.list_available_orders()
returns table (
  id uuid,
  categoria public.order_category,
  loja text,
  bairro text,
  valor_frete numeric,
  valor_estimado_min numeric,
  valor_estimado_max numeric,
  status public.order_status,
  criado_em timestamptz
)
language plpgsql
security definer
set search_path = ''
stable
as $$
begin
  if not exists (
    select 1
    from public.profiles p
    where p.id = (select auth.uid())
      and p.tipo in ('entregador'::public.user_role, 'ambos'::public.user_role)
      and coalesce(p.bloqueado, false) = false
      and coalesce(p.suspenso, false) = false
  ) then
    raise exception 'user is not an active courier';
  end if;

  return query
  select
    o.id,
    o.categoria,
    o.loja,
    o.bairro,
    o.valor_frete,
    o.valor_estimado_min,
    o.valor_estimado_max,
    o.status,
    o.criado_em
  from public.orders o
  where o.status = 'aguardando_entregador'::public.order_status
    and o.entregador_id is null
  order by o.criado_em desc;
end;
$$;

create or replace function public.get_courier_order(_order_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
stable
as $$
declare
  o public.orders%rowtype;
  caller uuid := (select auth.uid());
begin
  select *
    into o
  from public.orders
  where id = _order_id;

  if not found then
    return null;
  end if;

  if exists (
    select 1
    from public.profiles p
    where p.id = caller
      and p.tipo in ('entregador'::public.user_role, 'ambos'::public.user_role)
      and coalesce(p.bloqueado, false) = false
      and coalesce(p.suspenso, false) = false
  ) is false then
    raise exception 'user is not an active courier';
  end if;

  if o.entregador_id = caller then
    return to_jsonb(o);
  end if;

  if o.entregador_id is null
     and o.status = 'aguardando_entregador'::public.order_status then
    return jsonb_build_object(
      'id', o.id,
      'categoria', o.categoria,
      'loja', o.loja,
      'bairro', o.bairro,
      'valor_frete', o.valor_frete,
      'valor_estimado_min', o.valor_estimado_min,
      'valor_estimado_max', o.valor_estimado_max,
      'status', o.status,
      'criado_em', o.criado_em,
      'entregador_id', null,
      'cliente_id', null
    );
  end if;

  return jsonb_build_object(
    'id', o.id,
    'categoria', o.categoria,
    'loja', o.loja,
    'bairro', o.bairro,
    'status', o.status,
    'criado_em', o.criado_em,
    'entregador_id', null,
    'cliente_id', null
  );
end;
$$;

create or replace function public.accept_order(_order_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller uuid := (select auth.uid());
  o public.orders%rowtype;
begin
  if not exists (
    select 1
    from public.profiles p
    where p.id = caller
      and p.tipo in ('entregador'::public.user_role, 'ambos'::public.user_role)
      and coalesce(p.bloqueado, false) = false
      and coalesce(p.suspenso, false) = false
  ) then
    raise exception 'user is not an active courier';
  end if;

  update public.orders
  set
    entregador_id = caller,
    status = 'aceito'::public.order_status,
    aceito_em = now(),
    atualizado_em = now()
  where id = _order_id
    and status = 'aguardando_entregador'::public.order_status
    and entregador_id is null
  returning * into o;

  if not found then
    raise exception 'order is no longer available';
  end if;

  insert into public.order_events (order_id, autor_id, status)
  values (o.id, caller, 'aceito'::public.order_status);

  return to_jsonb(o);
end;
$$;

revoke execute on function public.list_available_orders() from public;
revoke execute on function public.get_courier_order(uuid) from public;
revoke execute on function public.accept_order(uuid) from public;

grant execute on function public.list_available_orders() to authenticated;
grant execute on function public.get_courier_order(uuid) to authenticated;
grant execute on function public.accept_order(uuid) to authenticated;

-- total is generated by the database; protect_order_changes must never assign it.
create or replace function public.protect_order_changes()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_is_admin boolean := public.is_admin(auth.uid());
  caller_type public.user_role;
  blocked boolean;
  suspended boolean;
begin
  select p.tipo, p.bloqueado, p.suspenso
    into caller_type, blocked, suspended
  from public.profiles p
  where p.id = auth.uid();

  if not caller_is_admin and (coalesce(blocked, false) or coalesce(suspended, false)) then
    raise exception 'user is blocked or suspended';
  end if;

  if caller_is_admin then
    return new;
  end if;

  if tg_op = 'INSERT' then
    if new.cliente_id is distinct from auth.uid() then
      raise exception 'order client must match authenticated user';
    end if;
    new.entregador_id := null;
    new.aceito_em := null;
    new.status := 'aguardando_entregador'::public.order_status;
    new.teste := false;
    return new;
  end if;

  if old.cliente_id = auth.uid() then
    new.cliente_id := old.cliente_id;
    new.categoria := old.categoria;
    new.descricao := old.descricao;
    new.endereco_entrega := old.endereco_entrega;
    new.endereco_loja := old.endereco_loja;
    new.loja := old.loja;
    new.bairro := old.bairro;
    new.referencia := old.referencia;
    new.observacoes := old.observacoes;
    new.valor_produto := old.valor_produto;
    new.valor_frete := old.valor_frete;
    new.taxa_servico := old.taxa_servico;
    new.valor_estimado_min := old.valor_estimado_min;
    new.valor_estimado_max := old.valor_estimado_max;
    new.entregador_id := old.entregador_id;
    new.aceito_em := old.aceito_em;
    new.teste := old.teste;
    if new.status <> old.status and new.status <> 'cancelado'::public.order_status then
      new.status := old.status;
    end if;
    return new;
  end if;

  if old.entregador_id is distinct from auth.uid()
     and caller_type not in ('entregador'::public.user_role, 'ambos'::public.user_role) then
    raise exception 'not authorized to modify order';
  end if;

  new.cliente_id := old.cliente_id;
  new.categoria := old.categoria;
  new.descricao := old.descricao;
  new.endereco_entrega := old.endereco_entrega;
  new.endereco_loja := old.endereco_loja;
  new.loja := old.loja;
  new.bairro := old.bairro;
  new.referencia := old.referencia;
  new.observacoes := old.observacoes;
  new.valor_produto := old.valor_produto;
  new.valor_frete := old.valor_frete;
  new.taxa_servico := old.taxa_servico;
  new.valor_estimado_min := old.valor_estimado_min;
  new.valor_estimado_max := old.valor_estimado_max;
  new.teste := old.teste;
  return new;
end;
$$;

revoke all on function public.protect_order_changes() from public;
