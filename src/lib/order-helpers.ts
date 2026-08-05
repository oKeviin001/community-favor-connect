import { loadOverrides } from "./dev-mode";

export const CATEGORIAS_BASE = [
  { id: "mercado", label: "Mercado", emoji: "🛒", tint: "bg-secondary" },
  { id: "farmacia", label: "Farmácia", emoji: "💊", tint: "bg-secondary" },
  { id: "padaria", label: "Padaria", emoji: "🥖", tint: "bg-secondary" },
  { id: "lojas", label: "Lojas", emoji: "🛍️", tint: "bg-secondary" },
  { id: "retirada", label: "Retirada", emoji: "📦", tint: "bg-secondary" },
  { id: "favor", label: "Favor", emoji: "🤝", tint: "bg-secondary" },
  { id: "livre", label: "Livre", emoji: "✨", tint: "bg-secondary" },
] as const;

export type CategoriaId = (typeof CATEGORIAS_BASE)[number]["id"] | string;

export type Categoria = { id: string; label: string; emoji: string; tint: string };

export function getCategorias(): Categoria[] {
  const o = loadOverrides();
  return CATEGORIAS_BASE.map((c) => {
    const ov = o.categoriaLabels[c.id] ?? {};
    return { ...c, label: ov.label ?? c.label, emoji: ov.emoji ?? c.emoji };
  });
}

// Legacy export kept for any static reference
export const CATEGORIAS = CATEGORIAS_BASE;

export const STATUS_LABEL: Record<string, string> = {
  aguardando_entregador: "Aguardando entregador",
  aceito: "Aceito",
  indo_loja: "Indo à loja",
  em_compra: "Comprando",
  compra_finalizada: "Compra finalizada",
  em_entrega: "Em deslocamento",
  entregue: "Entregue",
  confirmado: "Confirmado",
  cancelado: "Cancelado",
  em_disputa: "Em disputa",
};

export const TIMELINE_STEPS = ["aceito", "indo_loja", "em_compra", "em_entrega", "entregue"] as const;

export const ALL_STATUSES = [
  "aguardando_entregador",
  "aceito",
  "indo_loja",
  "em_compra",
  "compra_finalizada",
  "em_entrega",
  "entregue",
  "confirmado",
  "cancelado",
  "em_disputa",
] as const;

export type OrderStatus = (typeof ALL_STATUSES)[number];

export function statusIndex(status: string): number {
  const idx = (TIMELINE_STEPS as readonly string[]).indexOf(status);
  if (idx >= 0) return idx;
  if (status === "aguardando_entregador") return -1;
  if (status === "compra_finalizada") return 2;
  if (status === "confirmado") return 4;
  return -1;
}

export function whatsappLink(telefone: string | null | undefined, texto?: string): string | null {
  if (!telefone) return null;
  const digits = telefone.replace(/\D/g, "");
  if (digits.length < 10) return null;
  const withCountry = digits.startsWith("55") ? digits : `55${digits}`;
  const msg = texto ? `?text=${encodeURIComponent(texto)}` : "";
  return `https://wa.me/${withCountry}${msg}`;
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