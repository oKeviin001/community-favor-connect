REVOKE ALL ON FUNCTION public.touch_atualizado_em() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.touch_atualizado_em() TO service_role;