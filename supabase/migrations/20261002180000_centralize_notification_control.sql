-- Centralized notification control: end users do not configure notification categories.
create table if not exists public.notification_control (
  id boolean primary key default true check (id),
  pedidos boolean not null default true,
  mensagens boolean not null default true,
  entregas boolean not null default true,
  avaliacoes boolean not null default true,
  candidatura boolean not null default true,
  pagamentos boolean not null default true,
  disputas boolean not null default true,
  seguranca boolean not null default true,
  sistema boolean not null default true,
  som boolean not null default true,
  atualizado_em timestamptz not null default now()
);

insert into public.notification_control (id) values (true) on conflict (id) do nothing;

alter table public.notification_control enable row level security;
drop policy if exists "authenticated read notification control" on public.notification_control;
create policy "authenticated read notification control"
on public.notification_control for select to authenticated using (true);

revoke insert, update, delete on public.notification_control from authenticated;
grant select on public.notification_control to authenticated;

create or replace function public.get_notification_control()
returns public.notification_control
language sql security definer stable set search_path = public
as $$ select * from public.notification_control where id = true; $$;

create or replace function public.set_notification_control(
  _pedidos boolean, _mensagens boolean, _entregas boolean, _avaliacoes boolean,
  _candidatura boolean, _pagamentos boolean, _disputas boolean, _seguranca boolean,
  _sistema boolean, _som boolean
)
returns public.notification_control
language plpgsql security definer set search_path = public
as $$
declare result_row public.notification_control;
begin
  if not public.is_admin(auth.uid()) then raise exception 'admin access required'; end if;
  update public.notification_control
  set pedidos=_pedidos, mensagens=_mensagens, entregas=_entregas,
      avaliacoes=_avaliacoes, candidatura=_candidatura, pagamentos=_pagamentos,
      disputas=_disputas, seguranca=_seguranca, sistema=_sistema, som=_som,
      atualizado_em=now()
  where id=true returning * into result_row;
  return result_row;
end;
$$;

revoke all on function public.get_notification_control() from public;
grant execute on function public.get_notification_control() to authenticated;
revoke all on function public.set_notification_control(boolean,boolean,boolean,boolean,boolean,boolean,boolean,boolean,boolean,boolean) from public;
grant execute on function public.set_notification_control(boolean,boolean,boolean,boolean,boolean,boolean,boolean,boolean,boolean,boolean) to authenticated;
