create table if not exists public.notification_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  pedidos boolean not null default true,
  mensagens boolean not null default true,
  entregas boolean not null default true,
  avaliacoes boolean not null default true,
  candidatura boolean not null default true,
  sistema boolean not null default true,
  som boolean not null default true,
  atualizado_em timestamptz not null default now()
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  tipo text not null check (tipo in ('pedido','mensagem','entrega','avaliacao','candidatura','sistema')),
  titulo text not null,
  mensagem text not null,
  dados jsonb not null default '{}'::jsonb,
  lida boolean not null default false,
  criado_em timestamptz not null default now()
);

create index if not exists notifications_user_created_idx
  on public.notifications (user_id, criado_em desc);

create table if not exists public.notification_devices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null,
  subscription jsonb not null,
  user_agent text,
  ativo boolean not null default true,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  unique (user_id, endpoint)
);

alter table public.notification_preferences enable row level security;
alter table public.notifications enable row level security;
alter table public.notification_devices enable row level security;

drop policy if exists "users read own notification preferences" on public.notification_preferences;
create policy "users read own notification preferences"
on public.notification_preferences for select to authenticated
using (user_id = (select auth.uid()));

drop policy if exists "users insert own notification preferences" on public.notification_preferences;
create policy "users insert own notification preferences"
on public.notification_preferences for insert to authenticated
with check (user_id = (select auth.uid()));

drop policy if exists "users update own notification preferences" on public.notification_preferences;
create policy "users update own notification preferences"
on public.notification_preferences for update to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

drop policy if exists "users read own notifications" on public.notifications;
create policy "users read own notifications"
on public.notifications for select to authenticated
using (user_id = (select auth.uid()));

drop policy if exists "users update own notifications" on public.notifications;
create policy "users update own notifications"
on public.notifications for update to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

drop policy if exists "admins insert notifications" on public.notifications;
create policy "admins insert notifications"
on public.notifications for insert to authenticated
with check (public.is_admin(auth.uid()));

drop policy if exists "users read own notification devices" on public.notification_devices;
create policy "users read own notification devices"
on public.notification_devices for select to authenticated
using (user_id = (select auth.uid()));

drop policy if exists "users insert own notification devices" on public.notification_devices;
create policy "users insert own notification devices"
on public.notification_devices for insert to authenticated
with check (user_id = (select auth.uid()));

drop policy if exists "users update own notification devices" on public.notification_devices;
create policy "users update own notification devices"
on public.notification_devices for update to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

drop policy if exists "users delete own notification devices" on public.notification_devices;
create policy "users delete own notification devices"
on public.notification_devices for delete to authenticated
using (user_id = (select auth.uid()));

create or replace function public.ensure_notification_preferences()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.notification_preferences (user_id)
  values (new.id)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists trg_profiles_notification_preferences on public.profiles;
create trigger trg_profiles_notification_preferences
after insert on public.profiles
for each row execute function public.ensure_notification_preferences();

revoke all on function public.ensure_notification_preferences() from public;

alter publication supabase_realtime add table public.notifications;
