-- Security hardening: role checks must always evaluate the authenticated caller.
-- The UUID parameter is retained only for API compatibility with existing clients.
create or replace function public.is_admin(_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles ur
    where ur.user_id = auth.uid()
      and ur.role = 'admin'::public.app_role
  );
$$;

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles ur
    where ur.user_id = auth.uid()
      and ur.role = _role
  );
$$;

revoke all on function public.is_admin(uuid) from public;
revoke all on function public.has_role(uuid, public.app_role) from public;
grant execute on function public.is_admin(uuid) to authenticated;
grant execute on function public.has_role(uuid, public.app_role) to authenticated;
