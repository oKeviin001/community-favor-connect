-- Courier applications: candidates may submit/edit application data, but never decide their own status.
create or replace function public.protect_courier_application_decision()
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
    if new.user_id is distinct from auth.uid() then
      raise exception 'application user must match authenticated user';
    end if;
    new.status := 'pendente';
    new.analisado_em := null;
    new.analisado_por := null;
    new.analise_observacao := null;
  else
    if old.user_id is distinct from auth.uid() then
      raise exception 'not your application';
    end if;
    new.user_id := old.user_id;
    new.status := old.status;
    new.analisado_em := old.analisado_em;
    new.analisado_por := old.analisado_por;
    new.analise_observacao := old.analise_observacao;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_protect_courier_application_decision on public.courier_applications;
create trigger trg_protect_courier_application_decision
before insert or update on public.courier_applications
for each row execute function public.protect_courier_application_decision();

-- Application events are system history; the caller cannot impersonate another author.
create or replace function public.bind_courier_application_event_author()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin(auth.uid()) then
    raise exception 'application events are created by the system';
  end if;
  new.autor_id := auth.uid();
  return new;
end;
$$;

drop trigger if exists trg_bind_courier_application_event_author on public.courier_application_events;
create trigger trg_bind_courier_application_event_author
before insert on public.courier_application_events
for each row execute function public.bind_courier_application_event_author();

revoke insert, update, delete on public.courier_application_events from authenticated;
revoke all on function public.protect_courier_application_decision() from public;
revoke all on function public.bind_courier_application_event_author() from public;
