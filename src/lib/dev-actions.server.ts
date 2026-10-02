import type { SupabaseClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { Database } from "@/integrations/supabase/types";

type AuthContext = {
  supabase: SupabaseClient<Database>;
  userId: string;
  claims?: Record<string, unknown>;
};

const ORDER_SELECT =
  "id, cliente_id, entregador_id, categoria, descricao, status, valor_produto, criado_em";
const PROFILE_SELECT = "id, nome, tipo, bairro";
const ORDER_STATUSES = [
  "aguardando_entregador",
  "aceito",
  "em_compra",
  "compra_finalizada",
  "em_entrega",
  "entregue",
  "confirmado",
  "cancelado",
  "em_disputa",
] as const;

type OrderStatus = (typeof ORDER_STATUSES)[number];

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object";
}

function readString(value: unknown, key: string): string {
  if (!isRecord(value)) throw new Error("Dados inválidos");
  const field = value[key];
  if (typeof field !== "string" || field.trim().length === 0) throw new Error("Dados inválidos");
  return field;
}

function assertUuid(value: string): string {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) {
    throw new Error("Pedido inválido");
  }
  return value;
}

export function parseOrderIdInput(value: unknown): { id: string } {
  return { id: assertUuid(readString(value, "id")) };
}

export function parseStatusInput(value: unknown): { id: string; status: OrderStatus } {
  const id = assertUuid(readString(value, "id"));
  const status = readString(value, "status");
  if (!ORDER_STATUSES.includes(status as OrderStatus)) throw new Error("Status inválido");
  return { id, status: status as OrderStatus };
}

async function assertDevAccess(context: AuthContext) {
  const { data: userData } = await context.supabase.auth.getUser();

  const { data: role } = await context.supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", context.userId)
    .eq("role", "admin")
    .maybeSingle();

  if (role?.role !== "admin") {
    throw new Error("Sem permissão para usar o Modo Deus");
  }
}

export async function listDevDataFor(context: AuthContext) {
  await assertDevAccess(context);
  const [orders, profiles] = await Promise.all([
    supabaseAdmin.from("orders").select(ORDER_SELECT).order("criado_em", { ascending: false }).limit(100),
    supabaseAdmin.from("profiles").select(PROFILE_SELECT).limit(100),
  ]);
  if (orders.error) throw orders.error;
  if (profiles.error) throw profiles.error;
  return { orders: orders.data ?? [], profiles: profiles.data ?? [] };
}

export async function deleteDevOrderFor(context: AuthContext, id: string) {
  await assertDevAccess(context);
  const deletes = [
    supabaseAdmin.from("messages").delete().eq("order_id", id),
    supabaseAdmin.from("payments").delete().eq("order_id", id),
    supabaseAdmin.from("reviews").delete().eq("order_id", id),
  ];
  const related = await Promise.all(deletes);
  const relatedError = related.find((result) => result.error)?.error;
  if (relatedError) throw relatedError;

  const { error } = await supabaseAdmin.from("orders").delete().eq("id", id);
  if (error) throw error;
  return { ok: true };
}

export async function updateDevOrderStatusFor(context: AuthContext, id: string, status: OrderStatus) {
  await assertDevAccess(context);
  const { error } = await supabaseAdmin
    .from("orders")
    .update({ status, atualizado_em: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
  return { ok: true };
}