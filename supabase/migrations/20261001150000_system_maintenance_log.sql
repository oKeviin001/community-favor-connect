create table if not exists public.system_maintenance_log (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  responsible_user_id uuid references auth.users(id),
  action_description text not null,
  prompt_reference text,
  objective text,
  affected_files text[] not null default '{}',
  result text not null default 'completed' check (result in ('pending','completed','failed')),
  tests text,
  errors_notes text,
  related_commit text
);

create or replace function public.redact_maintenance_secret(value text)
returns text
language plpgsql
immutable
as $$
begin
  if value is null then return null; end if;
  value := regexp_replace(value, '(?i)(bearer\s+)[A-Za-z0-9._~+/=-]{20,}', '\1[REDACTED]', 'g');
  value := regexp_replace(value, '(?i)((?:api[_-]?key|token|secret|password|authorization)\s*[:=]\s*)[^\s,;]+', '\1[REDACTED]', 'g');
  value := regexp_replace(value, '(?i)\b(sk-[A-Za-z0-9_-]{20,}|gh[pousr]_[A-Za-z0-9_]{20,}|xox[baprs]-[A-Za-z0-9-]{20,}|AIza[A-Za-z0-9_-]{20,})\b', '[REDACTED]', 'g');
  value := regexp_replace(value, '-----BEGIN [^-]+ PRIVATE KEY-----[\s\S]*?-----END [^-]+ PRIVATE KEY-----', '[REDACTED PRIVATE KEY]', 'g');
  return value;
end;
$$;

create or replace function public.redact_system_maintenance_log()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.action_description := public.redact_maintenance_secret(new.action_description);
  new.prompt_reference := public.redact_maintenance_secret(new.prompt_reference);
  new.objective := public.redact_maintenance_secret(new.objective);
  new.tests := public.redact_maintenance_secret(new.tests);
  new.errors_notes := public.redact_maintenance_secret(new.errors_notes);
  new.related_commit := public.redact_maintenance_secret(new.related_commit);
  new.affected_files := array(
    select public.redact_maintenance_secret(x) from unnest(coalesce(new.affected_files, '{}')) x
  );
  return new;
end;
$$;

drop trigger if exists trg_redact_system_maintenance_log on public.system_maintenance_log;
create trigger trg_redact_system_maintenance_log
before insert on public.system_maintenance_log
for each row execute function public.redact_system_maintenance_log();

alter table public.system_maintenance_log enable row level security;

drop policy if exists "admins can read maintenance log" on public.system_maintenance_log;
create policy "admins can read maintenance log"
on public.system_maintenance_log for select to authenticated
using (public.is_admin(auth.uid()));

drop policy if exists "admins can insert maintenance log" on public.system_maintenance_log;
create policy "admins can insert maintenance log"
on public.system_maintenance_log for insert to authenticated
with check (public.is_admin(auth.uid()) and responsible_user_id = auth.uid());

revoke update, delete on public.system_maintenance_log from authenticated;
revoke all on function public.redact_maintenance_secret(text) from public;
revoke all on function public.redact_system_maintenance_log() from public;
grant execute on function public.redact_maintenance_secret(text) to authenticated;
