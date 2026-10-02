create or replace function public.get_order_counterparty_profile(_order_id uuid)
returns table (
  id uuid,
  nome text,
  telefone text
)
language plpgsql
security definer
set search_path = ''
stable
as $$
declare
  caller uuid := (select auth.uid());
  other_id uuid;
begin
  select
    case
      when o.cliente_id = caller then o.entregador_id
      when o.entregador_id = caller then o.cliente_id
      else null
    end
  into other_id
  from public.orders o
  where o.id = _order_id
    and o.entregador_id is not null
    and (o.cliente_id = caller or o.entregador_id = caller);

  if other_id is null then
    return;
  end if;

  return query
  select p.id, p.nome, p.telefone
  from public.profiles p
  where p.id = other_id;
end;
$$;

revoke execute on function public.get_order_counterparty_profile(uuid) from public;
grant execute on function public.get_order_counterparty_profile(uuid) to authenticated;
