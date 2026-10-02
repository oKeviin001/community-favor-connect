-- Security integrity hardening for payments, reviews, account deletion,
-- consent versions, restricted-user writes, and courier document uploads.

-- The app does not process payments. Authenticated clients may only read
-- payment records belonging to an order they participate in.
revoke insert, update, delete on public.payments from authenticated;

drop policy if exists "Cliente cria pagamento próprio" on public.payments;
drop policy if exists "Participantes veem pagamentos" on public.payments;
create policy "Participantes veem pagamentos"
on public.payments
for select to authenticated
using (
  exists (
    select 1
    from public.orders o
    where o.id = payments.order_id
      and (o.cliente_id = auth.uid() or o.entregador_id = auth.uid())
  )
);

-- Review integrity: the counterpart is derived from the order, never supplied
-- by an untrusted client.
create or replace function public.protect_review_integrity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  o public.orders%rowtype;
  caller uuid := auth.uid();
  counterpart uuid;
begin
  select * into o
  from public.orders
  where o.id = new.order_id
  for share;

  if not found then
    raise exception 'order not found';
  end if;

  if o.status not in ('entregue'::public.order_status, 'confirmado'::public.order_status) then
    raise exception 'only delivered orders can be reviewed';
  end if;

  if caller is null or (o.cliente_id <> caller and coalesce(o.entregador_id, caller) <> caller) then
    raise exception 'reviewer is not an order participant';
  end if;

  if o.cliente_id = caller then
    counterpart := o.entregador_id;
  else
    counterpart := o.cliente_id;
  end if;

  if counterpart is null or counterpart = caller then
    raise exception 'review counterpart is invalid';
  end if;

  new.reviewer_id := caller;
  new.reviewee_id := counterpart;
  return new;
end;
$$;

drop trigger if exists trg_protect_review_integrity on public.reviews;
create trigger trg_protect_review_integrity
before insert or update on public.reviews
for each row execute function public.protect_review_integrity();

revoke all on function public.protect_review_integrity() from public;

-- Account deletion requests always start in the pending state.
create or replace function public.protect_account_deletion_request()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin(auth.uid()) then
    if tg_op = 'INSERT' then
      if new.user_id is distinct from auth.uid() then
        raise exception 'deletion request user must match authenticated user';
      end if;
      new.status := 'pendente';
      new.atendido_em := null;
    else
      raise exception 'only admins can update deletion requests';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_protect_account_deletion_request on public.account_deletion_requests;
create trigger trg_protect_account_deletion_request
before insert or update on public.account_deletion_requests
for each row execute function public.protect_account_deletion_request();

revoke all on function public.protect_account_deletion_request() from public;

-- Consent versions are server-controlled. Keep these values aligned with the
-- public documents exposed by src/lib/kevin/shared.ts.
create or replace function public.force_current_consent_versions()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin(auth.uid()) then
    if new.user_id is distinct from auth.uid() then
      raise exception 'consent user must match authenticated user';
    end if;
    new.termos_versao := '1.0';
    new.privacidade_versao := '1.0';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_force_current_consent_versions on public.user_consents;
create trigger trg_force_current_consent_versions
before insert on public.user_consents
for each row execute function public.force_current_consent_versions();

revoke all on function public.force_current_consent_versions() from public;

-- Central helper for write-side suspension/block enforcement.
create or replace function public.is_active_user(_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = _user_id
      and coalesce(p.bloqueado, false) = false
      and coalesce(p.suspenso, false) = false
  );
$$;

revoke all on function public.is_active_user(uuid) from public;
grant execute on function public.is_active_user(uuid) to authenticated, service_role;

-- Messages
drop policy if exists "Participantes enviam mensagens" on public.messages;
create policy "Participantes enviam mensagens"
on public.messages
for insert to authenticated
with check (
  sender_id = auth.uid()
  and public.is_active_user(auth.uid())
  and exists (
    select 1 from public.orders o
    where o.id = messages.order_id
      and (o.cliente_id = auth.uid() or o.entregador_id = auth.uid())
  )
);

-- Order events
drop policy if exists "Participantes registram eventos" on public.order_events;
create policy "Participantes registram eventos"
on public.order_events
for insert to authenticated
with check (
  autor_id = auth.uid()
  and public.is_active_user(auth.uid())
  and exists (
    select 1 from public.orders o
    where o.id = order_events.order_id
      and (o.cliente_id = auth.uid() or o.entregador_id = auth.uid())
  )
);

-- Reviews
drop policy if exists "Participantes avaliam pedido entregue" on public.reviews;
create policy "Participantes avaliam pedido entregue"
on public.reviews
for insert to authenticated
with check (
  reviewer_id = auth.uid()
  and public.is_active_user(auth.uid())
  and exists (
    select 1 from public.orders o
    where o.id = reviews.order_id
      and o.status in ('entregue'::public.order_status, 'confirmado'::public.order_status)
      and (o.cliente_id = auth.uid() or o.entregador_id = auth.uid())
  )
);

-- Disputes
drop policy if exists "Participantes abrem disputas" on public.disputes;
create policy "Participantes abrem disputas"
on public.disputes
for insert to authenticated
with check (
  aberto_por = auth.uid()
  and public.is_active_user(auth.uid())
  and exists (
    select 1 from public.orders o
    where o.id = disputes.order_id
      and (o.cliente_id = auth.uid() or o.entregador_id = auth.uid())
  )
);

-- Order attachments
drop policy if exists "Participantes enviam comprovantes" on public.order_attachments;
create policy "Participantes enviam comprovantes"
on public.order_attachments
for insert to authenticated
with check (
  uploader_id = auth.uid()
  and public.is_active_user(auth.uid())
  and exists (
    select 1 from public.orders o
    where o.id = order_attachments.order_id
      and (o.cliente_id = auth.uid() or o.entregador_id = auth.uid())
  )
);

-- Courier applications: active users may submit/update their own application;
-- admins retain management access.
drop policy if exists "own application insert" on public.courier_applications;
create policy "own application insert"
on public.courier_applications
for insert to authenticated
with check (
  auth.uid() = user_id
  and public.is_active_user(auth.uid())
);

drop policy if exists "own application update" on public.courier_applications;
create policy "own application update"
on public.courier_applications
for update to authenticated
using (
  auth.uid() = user_id or public.is_admin(auth.uid())
)
with check (
  (auth.uid() = user_id and public.is_active_user(auth.uid()))
  or public.is_admin(auth.uid())
);

-- Courier document uploads: same-user folder, active applicant, known MIME,
-- and a conservative 10 MiB limit.
drop policy if exists "documentos own write" on storage.objects;
create policy "documentos own write"
on storage.objects
for insert to authenticated
with check (
  bucket_id = 'documentos'
  and auth.uid()::text = (storage.foldername(name))[1]
  and public.is_active_user(auth.uid())
  and case
    when metadata ? 'size' and (metadata->>'size') ~ '^[0-9]+$'
      then (metadata->>'size')::bigint <= 10485760
    else false
  end
  and lower(coalesce(metadata->>'mimetype', '')) in (
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/pdf'
  )
  and exists (
    select 1
    from public.courier_applications a
    where a.user_id = auth.uid()
  )
);

-- The storage object itself is not a substitute for an application record.
drop policy if exists "documentos own read" on storage.objects;
create policy "documentos own read"
on storage.objects
for select to authenticated
using (
  bucket_id = 'documentos'
  and (
    auth.uid()::text = (storage.foldername(name))[1]
    or public.is_admin(auth.uid())
  )
);
