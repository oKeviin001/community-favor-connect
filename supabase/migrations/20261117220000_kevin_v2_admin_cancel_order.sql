-- Atomic administrative cancellation used by the signed Central Kevin command receiver.
-- The order state change and its history event commit or roll back together.
CREATE OR REPLACE FUNCTION public.kevin_v2_admin_cancel_order(
  p_order_id uuid,
  p_reason text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_order_id uuid;
BEGIN
  IF p_reason IS NULL OR length(btrim(p_reason)) = 0 OR length(p_reason) > 1000 THEN
    RAISE EXCEPTION 'Justificativa de cancelamento inválida.';
  END IF;

  UPDATE public.orders
  SET status = 'cancelado', atualizado_em = now()
  WHERE id = p_order_id AND status <> 'cancelado'
  RETURNING id INTO v_order_id;

  IF v_order_id IS NULL THEN
    RAISE EXCEPTION 'Pedido não encontrado ou já cancelado.';
  END IF;

  INSERT INTO public.order_events (order_id, status, nota)
  VALUES (v_order_id, 'cancelado', 'Cancelamento administrativo: ' || btrim(p_reason));

  RETURN jsonb_build_object('order_id', v_order_id, 'status', 'cancelado');
END;
$$;

REVOKE ALL ON FUNCTION public.kevin_v2_admin_cancel_order(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.kevin_v2_admin_cancel_order(uuid, text) TO service_role;
