-- Private, bilateral Kevin V2 file-transfer metadata and storage bucket.
create table if not exists public.kevin_v2_files (
  id uuid primary key default gen_random_uuid(),
  transfer_id uuid not null,
  connection_id uuid not null references public.kevin_v2_connections(id) on delete cascade,
  source_app_id text not null,
  target_app_id text not null,
  object_path text not null,
  file_name text not null,
  content_type text not null,
  size_bytes bigint not null check (size_bytes > 0 and size_bytes <= 10485760),
  sha256 text not null check (sha256 ~ '^[a-f0-9]{64}$'),
  direction text not null check (direction in ('inbound','outbound')),
  status text not null default 'received' check (status in ('pending','received','verified','rejected','deleted')),
  created_at timestamptz not null default now(),
  verified_at timestamptz,
  unique (connection_id, transfer_id)
);
create index if not exists kevin_v2_files_connection_created_idx
  on public.kevin_v2_files(connection_id, created_at desc);
alter table public.kevin_v2_files enable row level security;
revoke all on public.kevin_v2_files from anon, authenticated;
grant all on public.kevin_v2_files to service_role;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'kevin-v2-files',
  'kevin-v2-files',
  false,
  10485760,
  array[
    'application/pdf',
    'application/json',
    'application/zip',
    'text/plain',
    'image/jpeg',
    'image/png',
    'image/webp'
  ]
)
on conflict (id) do nothing;
