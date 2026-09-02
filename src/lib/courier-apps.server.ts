import type { SupabaseClient } from "@supabase/supabase-js";
import { DEV_EMAIL } from "./dev-constants";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { Database } from "@/integrations/supabase/types";

type AuthContext = {
  supabase: SupabaseClient<Database>;
  userId: string;
  claims?: Record<string, unknown>;
};

const LIST_SELECT =
  "id, user_id, nome_completo, cidade, estado, bairro, transporte, status, criado_em, atualizado_em";

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
    throw new Error("Candidatura inválida");
  }
  return value;
}

export function parseApplicationIdInput(value: unknown): { id: string } {
  return { id: assertUuid(readString(value, "id")) };
}

export function parseDecisionInput(value: unknown): { id: string; decisao: "aprovado" | "reprovado"; nota: string | null } {
  const id = assertUuid(readString(value, "id"));
  const decisao = readString(value, "decisao");
  if (decisao !== "aprovado" && decisao !== "reprovado") throw new Error("Decisão inválida");
  const nota = isRecord(value) && typeof value["nota"] === "string" ? value["nota"].slice(0, 250) : null;
  return { id, decisao, nota };
}

export async function assertAdminAccess(context: AuthContext) {
  const { data: userData } = await context.supabase.auth.getUser();
  const claimEmail = typeof context.claims?.email === "string" ? context.claims.email : "";
  const email = (userData.user?.email ?? claimEmail).toLowerCase();

  const { data: role } = await context.supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", context.userId)
    .eq("role", "admin")
    .maybeSingle();

  if (email !== DEV_EMAIL && role?.role !== "admin") {
    throw new Error("Sem permissão para gerenciar candidaturas");
  }
}

export async function listApplicationsFor(context: AuthContext) {
  await assertAdminAccess(context);
  const { data, error } = await supabaseAdmin
    .from("courier_applications")
    .select(LIST_SELECT)
    .order("criado_em", { ascending: false })
    .limit(200);
  if (error) throw error;
  return { applications: data ?? [] };
}

export async function getApplicationFor(context: AuthContext, id: string) {
  await assertAdminAccess(context);
  const { data, error } = await supabaseAdmin
    .from("courier_applications")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("Candidatura não encontrada");

  const { data: eventos } = await supabaseAdmin
    .from("courier_application_events")
    .select("id, status, nota, criado_em, autor_id")
    .eq("application_id", id)
    .order("criado_em", { ascending: false });

  const docPaths = [data.doc_frente_url, data.doc_selfie_url, data.comprovante_residencia_url].filter(
    (p): p is string => typeof p === "string" && p.length > 0,
  );
  const documentos: Record<string, string> = {};
  for (const path of docPaths) {
    const { data: signed } = await supabaseAdmin.storage.from("documentos").createSignedUrl(path, 60 * 30);
    if (signed?.signedUrl) documentos[path] = signed.signedUrl;
  }

  return { application: data, eventos: eventos ?? [], documentos };
}

export async function decideApplicationFor(
  context: AuthContext,
  id: string,
  decisao: "aprovado" | "reprovado",
  nota: string | null,
) {
  await assertAdminAccess(context);
  const { data: app, error: appError } = await supabaseAdmin
    .from("courier_applications")
    .select("id, user_id")
    .eq("id", id)
    .maybeSingle();
  if (appError) throw appError;
  if (!app) throw new Error("Candidatura não encontrada");

  const { error } = await supabaseAdmin
    .from("courier_applications")
    .update({
      status: decisao,
      analise_observacao: nota,
      analisado_em: new Date().toISOString(),
      analisado_por: context.userId,
    })
    .eq("id", id);
  if (error) throw error;

  await supabaseAdmin.from("courier_application_events").insert({
    application_id: id,
    autor_id: context.userId,
    status: decisao,
    nota,
  });

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("tipo")
    .eq("id", app.user_id)
    .maybeSingle();

  if (decisao === "aprovado") {
    const tipo = profile?.tipo === "entregador" ? "entregador" : "ambos";
    await supabaseAdmin.from("profiles").update({ tipo }).eq("id", app.user_id);
  } else if (profile?.tipo === "ambos" || profile?.tipo === "entregador") {
    await supabaseAdmin.from("profiles").update({ tipo: "cliente" }).eq("id", app.user_id);
  }

  return { ok: true };
}
