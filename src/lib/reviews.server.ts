import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

type AuthContext = {
  supabase: SupabaseClient<Database>;
  userId: string;
};

export async function submitReviewFor(
  context: AuthContext,
  orderId: string,
  nota: number,
  comentario: string,
) {
  if (!Number.isInteger(nota) || nota < 1 || nota > 5) {
    throw new Error("Nota deve ser entre 1 e 5");
  }

  const { data: order, error: orderError } = await context.supabase
    .from("orders")
    .select("cliente_id, entregador_id, status")
    .eq("id", orderId)
    .maybeSingle();

  if (orderError) throw orderError;
  if (!order) throw new Error("Pedido não encontrado");
  if (order.cliente_id !== context.userId) throw new Error("Apenas o cliente pode avaliar");
  if (!["entregue", "confirmado"].includes(order.status)) {
    throw new Error("Só é possível avaliar pedidos entregues");
  }
  if (!order.entregador_id) throw new Error("Pedido sem entregador");

  const revieweeId = order.entregador_id;

  const { error: insertError } = await context.supabase.from("reviews").insert({
    order_id: orderId,
    reviewer_id: context.userId,
    reviewee_id: revieweeId,
    nota,
    comentario: comentario.trim() || null,
  });

  if (insertError) {
    if (insertError.message?.includes("duplicate key")) {
      throw new Error("Você já avaliou este pedido");
    }
    throw insertError;
  }

  const { data: stats } = await context.supabase
    .from("reviews")
    .select("nota")
    .eq("reviewee_id", revieweeId);

  const notas = stats?.map((r) => r.nota) ?? [];
  const total = notas.length;
  const media = total > 0 ? notas.reduce((a, b) => a + b, 0) / total : 0;

  const { error: updateError } = await context.supabase
    .from("profiles")
    .update({ nota_media: media, total_avaliacoes: total })
    .eq("id", revieweeId);

  if (updateError) throw updateError;

  return { ok: true };
}
