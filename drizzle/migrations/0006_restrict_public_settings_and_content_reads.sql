-- Restrict broad reads flagged by the Lovable/Supabase security scan.
-- app_settings.geral contains only public runtime switches consumed by the app.
DROP POLICY IF EXISTS app_settings_read_auth ON public.app_settings;
CREATE POLICY app_settings_read_public_general
  ON public.app_settings
  FOR SELECT
  TO authenticated
  USING (chave = 'geral'::text);

-- content_blocks has no rows and no publication/visibility field.
-- Keep it admin-only until an explicit public-content contract exists.
DROP POLICY IF EXISTS content_blocks_read_auth ON public.content_blocks;
