-- Orders are immutable in their original business content after creation.
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
    -- Client cannot edit the original order after submission.
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
    new.total := old.total;
    new.entregador_id := old.entregador_id;
    new.aceito_em := old.aceito_em;
    new.teste := old.teste;
    -- Client may only move an active order to cancellation.
    if new.status <> old.status and new.status <> 'cancelado'::public.order_status then
      new.status := old.status;
    end if;
    return new;
  end if;

  if old.entregador_id is distinct from auth.uid() and caller_type not in ('entregador'::public.user_role, 'ambos'::public.user_role) then
    raise exception 'not authorized to modify order';
  end if;

  -- Courier may update execution state/assignment, never the original request.
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
  new.total := old.total;
  new.teste := old.teste;
  return new;
end;
$$;

drop trigger if exists trg_protect_order_changes on public.orders;
create trigger trg_protect_order_changes
before insert or update on public.orders
for each row execute function public.protect_order_changes();

revoke delete on public.orders from authenticated;
revoke all on function public.protect_order_changes() from public;
