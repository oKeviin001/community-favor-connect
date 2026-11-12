CREATE TABLE IF NOT EXISTS public.kevin_v2_app_identity (
  singleton BOOLEAN PRIMARY KEY DEFAULT TRUE CHECK (singleton),
  app_id UUID NOT NULL DEFAULT gen_random_uuid(),
  app_slug TEXT NOT NULL DEFAULT 'pede-pro-kevin',
  app_name TEXT NOT NULL DEFAULT 'Pede pro Kevin',
  app_version TEXT NOT NULL DEFAULT '2.0.0',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
INSERT INTO public.kevin_v2_app_identity (singleton, app_slug, app_name, app_version)
VALUES (TRUE, 'pede-pro-kevin', 'Pede pro Kevin', '2.0.0')
ON CONFLICT (singleton) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.kevin_v2_pairing_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), code_hash TEXT NOT NULL UNIQUE,
  requested_scopes TEXT[] NOT NULL DEFAULT '{}', created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), expires_at TIMESTAMPTZ NOT NULL,
  consumed_at TIMESTAMPTZ, consumed_by_app_id TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','consumed','expired','revoked'))
);
CREATE INDEX IF NOT EXISTS kevin_v2_pairing_expiry_idx ON public.kevin_v2_pairing_codes(expires_at) WHERE status='active';

CREATE TABLE IF NOT EXISTS public.kevin_v2_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), local_app_id TEXT NOT NULL, remote_app_id TEXT NOT NULL,
  remote_name TEXT NOT NULL, remote_slug TEXT, remote_origin TEXT NOT NULL, remote_version TEXT,
  protocol_version TEXT NOT NULL DEFAULT 'kevin-protocol/2', scopes TEXT[] NOT NULL DEFAULT '{}',
  encrypted_shared_secret TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','connected','paused','revoked','error')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), confirmed_at TIMESTAMPTZ, last_seen_at TIMESTAMPTZ,
  last_successful_sync_at TIMESTAMPTZ, last_error_code TEXT, last_error_message TEXT, revoked_at TIMESTAMPTZ,
  UNIQUE(local_app_id, remote_app_id)
);

CREATE TABLE IF NOT EXISTS public.kevin_v2_nonces (
  id BIGSERIAL PRIMARY KEY,
  connection_id UUID NOT NULL REFERENCES public.kevin_v2_connections(id) ON DELETE CASCADE,
  nonce TEXT NOT NULL, expires_at TIMESTAMPTZ NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(connection_id, nonce)
);
CREATE INDEX IF NOT EXISTS kevin_v2_nonces_expiry_idx ON public.kevin_v2_nonces(expires_at);

CREATE TABLE IF NOT EXISTS public.kevin_v2_outbox (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), event_id UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  source_app_id TEXT NOT NULL, category TEXT NOT NULL, source_record_id TEXT NOT NULL,
  operation TEXT NOT NULL CHECK(operation IN ('upsert','delete')),
  entity_version BIGINT GENERATED ALWAYS AS IDENTITY,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS kevin_v2_outbox_record_idx ON public.kevin_v2_outbox(source_app_id,category,source_record_id,entity_version DESC);

CREATE TABLE IF NOT EXISTS public.kevin_v2_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  outbox_id UUID NOT NULL REFERENCES public.kevin_v2_outbox(id) ON DELETE CASCADE,
  connection_id UUID NOT NULL REFERENCES public.kevin_v2_connections(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','leased','delivered','dead_letter','cancelled')),
  attempts INTEGER NOT NULL DEFAULT 0 CHECK(attempts >= 0), available_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  lease_until TIMESTAMPTZ, last_error_code TEXT, last_error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), delivered_at TIMESTAMPTZ,
  UNIQUE(outbox_id, connection_id)
);
CREATE INDEX IF NOT EXISTS kevin_v2_deliveries_ready_idx ON public.kevin_v2_deliveries(available_at,created_at) WHERE status IN ('pending','leased');

CREATE TABLE IF NOT EXISTS public.kevin_v2_inbox (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), source_app_id TEXT NOT NULL, event_id UUID NOT NULL,
  category TEXT NOT NULL, source_record_id TEXT NOT NULL, entity_version BIGINT NOT NULL,
  operation TEXT NOT NULL CHECK(operation IN ('upsert','delete')), checksum TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'received' CHECK(status IN ('received','applied','duplicate','rejected')),
  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), applied_at TIMESTAMPTZ, error_code TEXT,
  UNIQUE(source_app_id, event_id)
);

CREATE TABLE IF NOT EXISTS public.kevin_storage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), source_app_id TEXT NOT NULL, category TEXT NOT NULL,
  source_record_id TEXT NOT NULL, payload JSONB, entity_version BIGINT NOT NULL, checksum TEXT NOT NULL,
  deleted_at TIMESTAMPTZ, received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), UNIQUE(source_app_id, category, source_record_id)
);
CREATE INDEX IF NOT EXISTS kevin_storage_category_updated_idx ON public.kevin_storage(category, updated_at DESC);

CREATE OR REPLACE FUNCTION public.kevin_v2_apply_storage(
  p_source_app_id TEXT, p_category TEXT, p_source_record_id TEXT,
  p_payload JSONB, p_entity_version BIGINT, p_checksum TEXT, p_deleted_at TIMESTAMPTZ
) RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  INSERT INTO public.kevin_storage(source_app_id,category,source_record_id,payload,entity_version,checksum,deleted_at,received_at,updated_at)
  VALUES (p_source_app_id,p_category,p_source_record_id,p_payload,p_entity_version,p_checksum,p_deleted_at,NOW(),NOW())
  ON CONFLICT(source_app_id,category,source_record_id) DO UPDATE
  SET payload=excluded.payload, entity_version=excluded.entity_version, checksum=excluded.checksum,
      deleted_at=excluded.deleted_at, received_at=NOW(), updated_at=NOW()
  WHERE excluded.entity_version > public.kevin_storage.entity_version;
  IF FOUND THEN RETURN 'applied'; END IF;
  RETURN 'stale';
END $$;
REVOKE ALL ON FUNCTION public.kevin_v2_apply_storage(TEXT,TEXT,TEXT,JSONB,BIGINT,TEXT,TIMESTAMPTZ) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.kevin_v2_apply_storage(TEXT,TEXT,TEXT,JSONB,BIGINT,TEXT,TIMESTAMPTZ) TO service_role;

CREATE TABLE IF NOT EXISTS public.kevin_v2_sync_cursors (
  connection_id UUID NOT NULL REFERENCES public.kevin_v2_connections(id) ON DELETE CASCADE,
  category TEXT NOT NULL, cursor_value TEXT, updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY(connection_id, category)
);

CREATE TABLE IF NOT EXISTS public.kevin_v2_transfer_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), correlation_id UUID NOT NULL,
  connection_id UUID REFERENCES public.kevin_v2_connections(id) ON DELETE SET NULL,
  operation TEXT NOT NULL, direction TEXT NOT NULL CHECK(direction IN ('inbound','outbound','internal')),
  source_app_id TEXT, target_app_id TEXT, category TEXT, item_count INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL CHECK(status IN ('success','partial','error','rejected')),
  error_code TEXT, detail TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS kevin_v2_history_created_idx ON public.kevin_v2_transfer_history(created_at DESC);

CREATE TABLE IF NOT EXISTS public.kevin_v2_admin_commands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), target_app_id TEXT NOT NULL, command_type TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}', scopes TEXT[] NOT NULL DEFAULT '{}', idempotency_key TEXT NOT NULL,
  requested_by UUID, approved_by UUID,
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','executing','succeeded','failed','expired','rejected')),
  expires_at TIMESTAMPTZ NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), completed_at TIMESTAMPTZ,
  result JSONB, UNIQUE(target_app_id, idempotency_key)
);

CREATE TABLE IF NOT EXISTS public.kevin_v2_learning_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), app_id TEXT NOT NULL, repository TEXT NOT NULL,
  commit_sha TEXT NOT NULL, manifest JSONB NOT NULL, dependency_graph JSONB NOT NULL DEFAULT '{}',
  scan_status TEXT NOT NULL DEFAULT 'pending' CHECK(scan_status IN ('pending','clean','warning','blocked','error')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), UNIQUE(app_id, commit_sha)
);

CREATE TABLE IF NOT EXISTS public.kevin_v2_artifacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), source_app_id TEXT NOT NULL, module_id TEXT NOT NULL,
  module_version TEXT NOT NULL, source_commit_sha TEXT NOT NULL, artifact_manifest JSONB NOT NULL,
  artifact_checksum TEXT NOT NULL, license_id TEXT, compatibility JSONB NOT NULL DEFAULT '{}',
  review_status TEXT NOT NULL DEFAULT 'pending' CHECK(review_status IN ('pending','approved','rejected','blocked')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), UNIQUE(source_app_id, module_id, module_version, source_commit_sha)
);

DO $$
DECLARE tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'kevin_v2_app_identity','kevin_v2_pairing_codes','kevin_v2_connections','kevin_v2_outbox',
    'kevin_v2_deliveries','kevin_v2_inbox','kevin_storage','kevin_v2_sync_cursors',
    'kevin_v2_nonces','kevin_v2_transfer_history','kevin_v2_admin_commands',
    'kevin_v2_learning_snapshots','kevin_v2_artifacts'
  ] LOOP
    EXECUTE format('REVOKE ALL ON TABLE public.%I FROM PUBLIC, anon, authenticated', tbl);
    EXECUTE format('GRANT ALL ON TABLE public.%I TO service_role', tbl);
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tbl);
  END LOOP;
END $$;
GRANT USAGE, SELECT ON SEQUENCE public.kevin_v2_nonces_id_seq, public.kevin_v2_outbox_entity_version_seq TO service_role;