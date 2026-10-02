revoke update, delete on public.system_maintenance_log from authenticated;
revoke update, delete on public.system_maintenance_log from anon;

alter table public.system_maintenance_log
  alter column responsible_user_id set default auth.uid();

drop policy if exists "admins can insert maintenance log" on public.system_maintenance_log;
create policy "admins can insert maintenance log"
on public.system_maintenance_log for insert to authenticated
with check (public.is_admin(auth.uid()) and responsible_user_id = auth.uid());
