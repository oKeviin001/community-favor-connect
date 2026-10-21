create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  tipo text not null check (tipo in ('pedido','mensagem','entrega','avaliacao','candidatura','pagamento','disputa','seguranca','sistema','proposta')),
  titulo text not null,
  mensagem text not null,
  dados jsonb not null default '{}'::jsonb,
  lida boolean not null default false,
  criado_em timestamptz not null default now()
);
create index if not exists notifications_user_created_idx on public.notifications (user_id, criado_em desc);

create table if not exists public.notification_devices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  endpoint text not null,
  subscription jsonb not null,
  user_agent text,
  ativo boolean not null default true,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  unique (user_id, endpoint)
);

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

grant select, update on public.notifications to authenticated;
grant insert on public.notifications to authenticated;
grant all on public.notifications to service_role;
grant select, insert, update, delete on public.notification_devices to authenticated;
grant all on public.notification_devices to service_role;
grant select on public.notification_control to authenticated;
grant all on public.notification_control to service_role;

alter table public.notifications enable row level security;
alter table public.notification_devices enable row level security;
alter table public.notification_control enable row level security;

create policy "users read own notifications" on public.notifications for select to authenticated using (user_id = (select auth.uid()));
create policy "users update own notifications" on public.notifications for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "admins insert notifications" on public.notifications for insert to authenticated with check (public.is_admin(auth.uid()));
create policy "users read own notification devices" on public.notification_devices for select to authenticated using (user_id = (select auth.uid()));
create policy "users insert own notification devices" on public.notification_devices for insert to authenticated with check (user_id = (select auth.uid()));
create policy "users update own notification devices" on public.notification_devices for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "users delete own notification devices" on public.notification_devices for delete to authenticated using (user_id = (select auth.uid()));
create policy "authenticated read notification control" on public.notification_control for select to authenticated using (true);

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
revoke all on function public.set_notification_control(boolean,boolean,boolean,boolean,boolean,boolean,boolean,boolean,boolean,boolean) from public, anon;
grant execute on function public.set_notification_control(boolean,boolean,boolean,boolean,boolean,boolean,boolean,boolean,boolean,boolean) to authenticated;

alter publication supabase_realtime add table public.notifications;