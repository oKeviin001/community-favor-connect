-- Privacy-preserving live location for collaborators who explicitly enable availability.
create table if not exists public.collaborator_presence (
  user_id uuid primary key references auth.users(id) on delete cascade,
  disponivel boolean not null default false,
  latitude double precision,
  longitude double precision,
  atualizado_em timestamptz not null default now(),
  constraint collaborator_presence_coordinates check (
    (latitude is null and longitude is null)
    or (latitude between -90 and 90 and longitude between -180 and 180)
  )
);
alter table public.collaborator_presence enable row level security;
revoke all on public.collaborator_presence from anon, authenticated;

create or replace function public.set_collaborator_presence(
  _disponivel boolean,
  _latitude double precision default null,
  _longitude double precision default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null or not public.is_active_provider(auth.uid()) then
    raise exception 'Somente colaboradores aprovados podem alterar a disponibilidade';
  end if;
  if _disponivel and (
    _latitude is null or _longitude is null
    or _latitude not between -90 and 90
    or _longitude not between -180 and 180
  ) then
    raise exception 'Ative a localização do aparelho para ficar disponível';
  end if;
  insert into public.collaborator_presence(user_id, disponivel, latitude, longitude, atualizado_em)
  values (auth.uid(), _disponivel, case when _disponivel then _latitude end,
          case when _disponivel then _longitude end, now())
  on conflict (user_id) do update
  set disponivel = excluded.disponivel,
      latitude = excluded.latitude,
      longitude = excluded.longitude,
      atualizado_em = now();
end;
$$;

create or replace function public.list_order_proposal_locations(_order_id uuid)
returns table (colaborador_id uuid, nome text, latitude double precision, longitude double precision, atualizado_em timestamptz)
language plpgsql
security definer
set search_path = ''
stable
as $$
begin
  if auth.uid() is null or not exists (
    select 1 from public.orders o
    where o.id = _order_id and o.cliente_id = auth.uid()
  ) then
    raise exception 'Pedido não pertence ao cliente autenticado';
  end if;
  return query
  select p.user_id, pr.nome, p.latitude, p.longitude, p.atualizado_em
  from public.order_proposals op
  join public.collaborator_presence p on p.user_id = op.prestador_id
  join public.profiles pr on pr.id = p.user_id
  where op.order_id = _order_id
    and op.status in ('enviada', 'selecionada')
    and p.disponivel = true
    and p.latitude is not null and p.longitude is not null
    and p.atualizado_em > now() - interval '2 minutes';
end;
$$;

revoke all on function public.set_collaborator_presence(boolean,double precision,double precision) from public, anon;
revoke all on function public.list_order_proposal_locations(uuid) from public, anon;
grant execute on function public.set_collaborator_presence(boolean,double precision,double precision) to authenticated;
grant execute on function public.list_order_proposal_locations(uuid) to authenticated;
