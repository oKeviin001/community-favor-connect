import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

type AuthContext = {
  supabase: SupabaseClient<Database>;
  userId: string;
};

export function parseOrderId(value: unknown): { orderId: string } {
  const v = value as Record<string, unknown> | null;
  if (!v || typeof v.orderId !== "string" || !v.orderId.trim()) throw new Error("Pedido inválido");
  return { orderId: v.orderId };
}

export async function confirmDeliveryFor(context: AuthContext, orderId: string) {
  const { data: order, error } = await context.supabase
    .from("orders")
    .select("id, cliente_id, entregador_id, status")
    .eq("id", orderId)
    .maybeSingle();
  if (error) throw error;
  if (!order) throw new Error("Pedido não encontrado");
  if (order.cliente_id !== context.userId) throw new Error("Apenas o cliente pode confirmar");
  if (order.status !== "entregue") throw new Error("O pedido ainda não foi marcado como entregue");

  const now = new Date().toISOString();
  const { error: upErr } = await context.supabase
    .from("orders")
    .update({ status: "confirmado", atualizado_em: now })
    .eq("id", orderId);
  if (upErr) throw upErr;

  await context.supabase.from("payments").update({ status: "liberado" }).eq("order_id", orderId);
  await context.supabase
    .from("order_events")
    .insert({ order_id: orderId, autor_id: context.userId, status: "confirmado" });

  if (order.entregador_id) {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { count } = await supabaseAdmin
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("entregador_id", order.entregador_id)
      .eq("status", "confirmado");
    await supabaseAdmin
      .from("profiles")
      .update({ total_entregas: count ?? 0 })
      .eq("id", order.entregador_id);
  }

  return { ok: true };
}