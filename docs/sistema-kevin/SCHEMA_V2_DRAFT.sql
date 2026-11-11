-- SISTEMA KEVIN v2 — SCHEMA DRAFT; revisar antes de aplicar.
-- Não executar automaticamente. Central e Pede pro Kevin usam a mesma estrutura-base.
create table if not exists public.kevin_v2_app_identity (
 singleton boolean primary key default true check (singleton),
 app_id text not null unique, app_slug text not null, app_name text not null,
 app_version text not null default '2.0.0', created_at timestamptz not null default now()
);
-- Depois de aplicar o schema, inserir uma única identidade por banco:
-- Central: insert into public.kevin_v2_app_identity(singleton,app_id,app_slug,app_name) values(true,'central-kevin','central-kevin','Central Kevin');
-- Pede:    insert into public.kevin_v2_app_identity(singleton,app_id,app_slug,app_name) values(true,'pede-pro-kevin','pede-pro-kevin','Pede pro Kevin');
create table if not exists public.kevin_v2_pairing_codes (
 id uuid primary key default gen_random_uuid(), code_hash text not null unique,
 requested_scopes text[] not null default '{}', created_by uuid,
 created_at timestamptz not null default now(), expires_at timestamptz not null,
 consumed_at timestamptz, consumed_by_app_id text,
 status text not null default 'active' check (status in ('active','consumed','expired','revoked'))
);
create index if not exists kevin_v2_pairing_expiry_idx on public.kevin_v2_pairing_codes(expires_at) where status='active';
create table if not exists public.kevin_v2_connections (
 id uuid primary key default gen_random_uuid(), local_app_id text not null, remote_app_id text not null,
 remote_name text not null, remote_slug text, remote_origin text not null, remote_version text,
 protocol_version text not null default 'kevin-protocol/2', scopes text[] not null default '{}',
 encrypted_shared_secret text not null,
 status text not null default 'pending' check (status in ('pending','connected','paused','revoked','error')),
 created_at timestamptz not null default now(), confirmed_at timestamptz, last_seen_at timestamptz,
 last_successful_sync_at timestamptz, last_error_code text, last_error_message text, revoked_at timestamptz,
 unique(local_app_id,remote_app_id)
);
create table if not exists public.kevin_v2_outbox (
 id uuid primary key default gen_random_uuid(), event_id uuid not null unique default gen_random_uuid(),
 source_app_id text not null, category text not null, source_record_id text not null,
 operation text not null check(operation in ('upsert','delete')),
 entity_version bigint generated always as identity, occurred_at timestamptz not null default now(),
 created_at timestamptz not null default now()
);
create index if not exists kevin_v2_outbox_record_idx on public.kevin_v2_outbox(source_app_id,category,source_record_id,entity_version desc);
create table if not exists public.kevin_v2_deliveries (
 id uuid primary key default gen_random_uuid(), outbox_id uuid not null references public.kevin_v2_outbox(id) on delete cascade,
 connection_id uuid not null references public.kevin_v2_connections(id) on delete cascade,
 status text not null default 'pending' check(status in ('pending','leased','delivered','dead_letter','cancelled')),
 attempts integer not null default 0 check(attempts>=0), available_at timestamptz not null default now(),
 lease_until timestamptz, last_error_code text, last_error_message text, created_at timestamptz not null default now(),
 delivered_at timestamptz, unique(outbox_id,connection_id)
);
create index if not exists kevin_v2_deliveries_ready_idx on public.kevin_v2_deliveries(available_at,created_at) where status in ('pending','leased');
create table if not exists public.kevin_v2_inbox (
 id uuid primary key default gen_random_uuid(), source_app_id text not null, event_id uuid not null,
 category text not null, source_record_id text not null, entity_version bigint not null,
 operation text not null check(operation in ('upsert','delete')), checksum text not null,
 status text not null default 'received' check(status in ('received','applied','duplicate','rejected')),
 received_at timestamptz not null default now(), applied_at timestamptz, error_code text,
 unique(source_app_id,event_id)
);
create table if not exists public.kevin_storage (
 id uuid primary key default gen_random_uuid(), source_app_id text not null, category text not null,
 source_record_id text not null, payload jsonb, entity_version bigint not null, checksum text not null,
 deleted_at timestamptz, received_at timestamptz not null default now(),
 updated_at timestamptz not null default now(), unique(source_app_id,category,source_record_id)
);
create index if not exists kevin_storage_category_updated_idx on public.kevin_storage(category,updated_at desc);

-- Upsert atômico: evento antigo nunca sobrescreve uma versão mais nova.
create or replace function public.kevin_v2_apply_storage(
 p_source_app_id text, p_category text, p_source_record_id text,
 p_payload jsonb, p_entity_version bigint, p_checksum text, p_deleted_at timestamptz
) returns text
language plpgsql
security definer
set search_path=''
as $
begin
 insert into public.kevin_storage(
  source_app_id,category,source_record_id,payload,entity_version,checksum,deleted_at,received_at,updated_at
 ) values (
  p_source_app_id,p_category,p_source_record_id,p_payload,p_entity_version,p_checksum,p_deleted_at,now(),now()
 )
 on conflict(source_app_id,category,source_record_id) do update
 set payload=excluded.payload, entity_version=excluded.entity_version, checksum=excluded.checksum,
     deleted_at=excluded.deleted_at, received_at=now(), updated_at=now()
 where excluded.entity_version > public.kevin_storage.entity_version;
 if found then return 'applied'; end if;
 return 'stale';
end $;
revoke all on function public.kevin_v2_apply_storage(text,text,text,jsonb,bigint,text,timestamptz) from public,anon,authenticated;
grant execute on function public.kevin_v2_apply_storage(text,text,text,jsonb,bigint,text,timestamptz) to service_role;
create table if not exists public.kevin_v2_sync_cursors (
 connection_id uuid not null references public.kevin_v2_connections(id) on delete cascade,
 category text not null, cursor_value text, updated_at timestamptz not null default now(),
 primary key(connection_id,category)
);
create table if not exists public.kevin_v2_nonces (
 id bigserial primary key, connection_id uuid not null references public.kevin_v2_connections(id) on delete cascade,
 nonce text not null, expires_at timestamptz not null, created_at timestamptz not null default now(),
 unique(connection_id,nonce)
);
create index if not exists kevin_v2_nonces_expiry_idx on public.kevin_v2_nonces(expires_at);
create table if not exists public.kevin_v2_transfer_history (
 id uuid primary key default gen_random_uuid(), correlation_id uuid not null,
 connection_id uuid references public.kevin_v2_connections(id) on delete set null,
 operation text not null, direction text not null check(direction in ('inbound','outbound','internal')),
 source_app_id text, target_app_id text, category text, item_count integer not null default 0,
 status text not null check(status in ('success','partial','error','rejected')),
 error_code text, detail text, created_at timestamptz not null default now()
);
create index if not exists kevin_v2_history_created_idx on public.kevin_v2_transfer_history(created_at desc);
create table if not exists public.kevin_v2_admin_commands (
 id uuid primary key default gen_random_uuid(), target_app_id text not null, command_type text not null,
 payload jsonb not null default '{}', scopes text[] not null default '{}', idempotency_key text not null,
 requested_by uuid, approved_by uuid,
 status text not null default 'pending' check(status in ('pending','approved','executing','succeeded','failed','expired','rejected')),
 expires_at timestamptz not null, created_at timestamptz not null default now(), completed_at timestamptz,
 result jsonb, unique(target_app_id,idempotency_key)
);
create table if not exists public.kevin_v2_learning_snapshots (
 id uuid primary key default gen_random_uuid(), app_id text not null, repository text not null,
 commit_sha text not null, manifest jsonb not null, dependency_graph jsonb not null default '{}',
 scan_status text not null default 'pending' check(scan_status in ('pending','clean','warning','blocked','error')),
 created_at timestamptz not null default now(), unique(app_id,commit_sha)
);
create table if not exists public.kevin_v2_artifacts (
 id uuid primary key default gen_random_uuid(), source_app_id text not null, module_id text not null,
 module_version text not null, source_commit_sha text not null, artifact_manifest jsonb not null,
 artifact_checksum text not null, license_id text, compatibility jsonb not null default '{}',
 review_status text not null default 'pending' check(review_status in ('pending','approved','rejected','blocked')),
 created_at timestamptz not null default now(), unique(source_app_id,module_id,module_version,source_commit_sha)
);

do $$
declare t text;
begin
 foreach t in array array[
  'kevin_v2_app_identity','kevin_v2_pairing_codes','kevin_v2_connections','kevin_v2_outbox',
  'kevin_v2_deliveries','kevin_v2_inbox','kevin_storage','kevin_v2_sync_cursors',
  'kevin_v2_nonces','kevin_v2_transfer_history','kevin_v2_admin_commands',
  'kevin_v2_learning_snapshots','kevin_v2_artifacts'
 ] loop
  execute format('alter table public.%I enable row level security',t);
  execute format('revoke all on table public.%I from anon, authenticated',t);
  execute format('grant all on table public.%I to service_role',t);
 end loop;
end $$;
grant usage,select on sequence public.kevin_v2_nonces_id_seq, public.kevin_v2_outbox_entity_version_seq to service_role;

-- Somente no Pede pro Kevin, depois de conferir que estas tabelas e colunas existem:
create or replace function public.kevin_v2_enqueue_change()
returns trigger language plpgsql security definer set search_path='' as $
declare app_id_value text; record_id_value text; operation_value text; event_row public.kevin_v2_outbox%rowtype;
begin
 select app_id into app_id_value from public.kevin_v2_app_identity where singleton=true;
 if app_id_value is null then raise exception 'Identidade Kevin não configurada'; end if;
 if tg_op='DELETE' then record_id_value:=old.id::text; operation_value:='delete';
 else record_id_value:=new.id::text; operation_value:='upsert'; end if;
 insert into public.kevin_v2_outbox(source_app_id,category,source_record_id,operation)
 values(app_id_value,tg_argv[0],record_id_value,operation_value) returning * into event_row;
 insert into public.kevin_v2_deliveries(outbox_id,connection_id)
 select event_row.id,c.id from public.kevin_v2_connections c
 where c.status='connected' and c.scopes @> array[tg_argv[0]]::text[];
 if tg_op='DELETE' then return old; end if;
 return new;
end $$;
revoke all on function public.kevin_v2_enqueue_change() from public,anon,authenticated;

-- Após validação, anexar triggers AFTER INSERT OR UPDATE OR DELETE em:
-- public.orders ('orders'), public.profiles ('users'), public.reviews ('reviews'),
-- public.disputes ('complaints'). Não anexar esses triggers na Central, que é espelho.
