-- Impede que clientes alterem valor/distância/autor da proposta ao escolher.
create or replace function public.protect_order_proposal_changes()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  caller uuid := auth.uid();
  is_order_client boolean;
begin
  if public.is_admin(caller) then
    return new;
  end if;

  if new.id is distinct from old.id
     or new.order_id is distinct from old.order_id
     or new.courier_id is distinct from old.courier_id
     or new.valor_proposto is distinct from old.valor_proposto
     or new.distancia_estimada_km is distinct from old.distancia_estimada_km
     or new.observacao is distinct from old.observacao
     or new.criado_em is distinct from old.criado_em then
    if old.courier_id = caller then
      raise exception 'proposal content cannot be edited after submission';
    end if;
    raise exception 'only proposal status can be changed by the order client';
  end if;

  select exists (
    select 1 from public.orders o
    where o.id = old.order_id and o.cliente_id = caller
  ) into is_order_client;

  if is_order_client then
    if new.status not in ('selecionada','nao_selecionada')
       or old.status <> 'enviada' then
      raise exception 'invalid client proposal decision';
    end if;
    return new;
  end if;

  if old.courier_id = caller and old.status = 'enviada' and new.status = 'retirada' then
    return new;
  end if;

  raise exception 'not authorized to update proposal';
end;
$$;

drop trigger if exists trg_protect_order_proposal_changes on public.order_proposals;
create trigger trg_protect_order_proposal_changes
before update on public.order_proposals
for each row execute function public.protect_order_proposal_changes();

revoke all on function public.protect_order_proposal_changes() from public;
