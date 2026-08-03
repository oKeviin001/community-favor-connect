import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { submitReviewFor, type ReviewCriterios } from "./reviews.server";

const CRITERIOS = ["comunicacao", "rapidez", "educacao", "confiabilidade"] as const;

function parseReviewInput(value: unknown): {
  orderId: string;
  nota: number;
  comentario: string;
  criterios?: ReviewCriterios;
} {
  if (!value || typeof value !== "object") throw new Error("Dados inválidos");
  const v = value as Record<string, unknown>;
  if (typeof v.orderId !== "string" || !v.orderId.trim()) throw new Error("Pedido inválido");
  if (typeof v.nota !== "number") throw new Error("Nota inválida");
  if (typeof v.comentario !== "string") throw new Error("Comentário inválido");
  let criterios: ReviewCriterios | undefined;
  if (v.criterios && typeof v.criterios === "object") {
    const c = v.criterios as Record<string, unknown>;
    const out: Record<string, number> = {};
    for (const key of CRITERIOS) {
      if (typeof c[key] !== "number") throw new Error("Critérios inválidos");
      out[key] = c[key] as number;
    }
    criterios = out as unknown as ReviewCriterios;
  }
  return { orderId: v.orderId, nota: v.nota, comentario: v.comentario, criterios };
}

export const submitReview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(parseReviewInput)
  .handler(async ({ context, data }) =>
    submitReviewFor(context, data.orderId, data.nota, data.comentario, data.criterios),
  );
