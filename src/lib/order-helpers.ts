import { loadOverrides } from "./dev-mode";

export const CATEGORIAS_BASE = [
  { id: "mercado", label: "Mercado", emoji: "🛒", tint: "bg-orange-50" },
  { id: "farmacia", label: "Farmácia", emoji: "💊", tint: "bg-red-50" },
  { id: "padaria", label: "Padaria", emoji: "🥖", tint: "bg-amber-50" },
  { id: "lojas", label: "Lojas", emoji: "🛍️", tint: "bg-blue-50" },
  { id: "retirada", label: "Retirada", emoji: "📦", tint: "bg-zinc-100" },
  { id: "favor", label: "Favor", emoji: "🤝", tint: "bg-emerald-50" },
  { id: "livre", label: "Livre", emoji: "✨", tint: "bg-purple-50" },
] as const;

export type CategoriaId = (typeof CATEGORIAS_BASE)[number]["id"] | string;

export type Categoria = { id: string; label: string; emoji: string; tint: string };

export function getCategorias(): Categoria[] {
  const o = loadOverrides();
  return [...CATEGORIAS_BASE, ...o.categoriasExtra] as Categoria[];
}

// Legacy export kept for any static reference
export const CATEGORIAS = CATEGORIAS_BASE;

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
  const o = loadOverrides();
  const frete = Math.max(o.freteMin, Math.round(valorProduto * o.fretePct));
  const taxa = Math.max(o.taxaMin, Math.round(valorProduto * o.taxaPct));
  return { frete, taxa, total: valorProduto + frete + taxa };
}