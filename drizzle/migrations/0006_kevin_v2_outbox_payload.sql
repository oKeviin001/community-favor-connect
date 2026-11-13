-- Persist the payload and checksum so Central-originated events can be retried.
ALTER TABLE public.kevin_v2_outbox
  ADD COLUMN IF NOT EXISTS payload JSONB NOT NULL DEFAULT 'null'::jsonb,
  ADD COLUMN IF NOT EXISTS checksum TEXT;
