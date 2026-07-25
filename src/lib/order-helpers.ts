export const CATEGORIAS = [
  { id: "mercado", label: "Mercado", emoji: "🛒", tint: "bg-orange-50" },
  { id: "farmacia", label: "Farmácia", emoji: "💊", tint: "bg-red-50" },
  { id: "padaria", label: "Padaria", emoji: "🥖", tint: "bg-amber-50" },
  { id: "lojas", label: "Lojas", emoji: "🛍️", tint: "bg-blue-50" },
  { id: "retirada", label: "Retirada", emoji: "📦", tint: "bg-zinc-100" },
  { id: "favor", label: "Favor", emoji: "🤝", tint: "bg-emerald-50" },
  { id: "livre", label: "Livre", emoji: "✨", tint: "bg-purple-50" },
] as const;

export type CategoriaId = (typeof CATEGORIAS)[number]["id"];

export const STATUS_LABEL: Record<string, string> = {
  aguardando_entregador: "Aguardando entregador",
  aceito: "Aceito",
  em_compra: "Comprando",
  compra_finalizada: "Compra finalizada",
  em_entrega: "A caminho",
  entregue: "Entregue",
  confirmado: "Confirmado",
  cancelado: "Cancelado",
  em_disputa: "Em disputa",
};

export const TIMELINE_STEPS = ["aceito", "em_compra", "em_entrega", "entregue"] as const;

export function statusIndex(status: string): number {
  const idx = (TIMELINE_STEPS as readonly string[]).indexOf(status);
  if (idx >= 0) return idx;
  if (status === "aguardando_entregador") return -1;
  if (status === "compra_finalizada") return 1;
  if (status === "confirmado") return 3;
  return -1;
}

export function formatBRL(v: number | string | null | undefined): string {
  const n = typeof v === "string" ? Number(v) : v ?? 0;
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function calcularTaxa(valorProduto: number): { frete: number; taxa: number; total: number } {
  const frete = Math.max(8, Math.round(valorProduto * 0.1));
  const taxa = Math.max(3, Math.round(valorProduto * 0.05));
  return { frete, taxa, total: valorProduto + frete + taxa };
}