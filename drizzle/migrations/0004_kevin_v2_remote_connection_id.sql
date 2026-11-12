-- Keep the Central-side connection UUID separately from this app's local row UUID.
ALTER TABLE public.kevin_v2_connections
  ADD COLUMN IF NOT EXISTS remote_connection_id UUID;

-- Backfill the already-paired production Central connection.
-- This is the connection UUID returned by Central during the successful handshake.
UPDATE public.kevin_v2_connections
SET remote_connection_id = '2b5d6e6c-f508-4bd0-ac58-8f4548bd845b'::uuid
WHERE remote_origin = 'https://little-idea-land.lovable.app'
  AND status = 'connected'
  AND remote_connection_id IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS kevin_v2_connections_remote_connection_id_uidx
  ON public.kevin_v2_connections(remote_connection_id)
  WHERE remote_connection_id IS NOT NULL;
