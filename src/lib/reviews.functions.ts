import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { submitReviewFor } from "./reviews.server";

function parseReviewInput(value: unknown): { orderId: string; nota: number; comentario: string } {
  if (!value || typeof value !== "object") throw new Error("Dados inválidos");
  const v = value as Record<string, unknown>;
  if (typeof v.orderId !== "string" || !v.orderId.trim()) throw new Error("Pedido inválido");
  if (typeof v.nota !== "number") throw new Error("Nota inválida");
  if (typeof v.comentario !== "string") throw new Error("Comentário inválido");
  return { orderId: v.orderId, nota: v.nota, comentario: v.comentario };
}

export const submitReview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(parseReviewInput)
  .handler(async ({ context, data }) =>
    submitReviewFor(context, data.orderId, data.nota, data.comentario),
  );
