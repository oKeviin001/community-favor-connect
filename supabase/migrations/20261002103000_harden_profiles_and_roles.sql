-- Prevent client-side privilege/status tampering in profiles and role assignments.
create or replace function public.protect_profile_system_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.is_admin(auth.uid()) then
    return new;
  end if;

  if tg_op = 'INSERT' then
    if new.id is distinct from auth.uid() then
      raise exception 'profile id must match authenticated user';
    end if;
    new.tipo := 'cliente'::public.user_role;
    new.bloqueado := false;
    new.suspenso := false;
    new.teste := false;
    new.nota_media := null;
    new.total_avaliacoes := 0;
    new.total_entregas := 0;
  else
    new.tipo := old.tipo;
    new.bloqueado := old.bloqueado;
    new.suspenso := old.suspenso;
    new.teste := old.teste;
    new.nota_media := old.nota_media;
    new.total_avaliacoes := old.total_avaliacoes;
    new.total_entregas := old.total_entregas;
    new.id := old.id;
    new.criado_em := old.criado_em;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_protect_profile_system_fields on public.profiles;
create trigger trg_protect_profile_system_fields
before insert or update on public.profiles
for each row execute function public.protect_profile_system_fields();

revoke insert, update, delete on public.user_roles from authenticated;

alter table public.user_roles enable row level security;
drop policy if exists "admins manage user roles" on public.user_roles;
create policy "admins manage user roles"
on public.user_roles for all to authenticated
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

revoke all on function public.protect_profile_system_fields() from public;
