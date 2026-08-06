import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  aprenderEstruturaDe,
  assertAdmin,
  autotesteFor,
  carregarPainelFor,
  conectarComCodigoFor,
  criarBackup,
  enviarDadosPara,
  gerarCodigoFor,
  receberDadosDe,
  restaurarBackup,
  sincronizarTudo,
  type KevinConnection,
} from "./kevin.server";

function rec(v: unknown): Record<string, unknown> {
  if (v === null || typeof v !== "object") throw new Error("Dados inválidos");
  return v as Record<string, unknown>;
}
function str(v: unknown, key: string): string {
  const value = rec(v)[key];
  if (typeof value !== "string" || !value.trim()) throw new Error(`Campo obrigatório: ${key}`);
  return value.trim();
}
function list(v: unknown, key: string): string[] {
  const value = rec(v)[key];
  return Array.isArray(value) ? value.filter((i): i is string => typeof i === "string") : [];
}

async function conexao(id: string): Promise<KevinConnection> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin.from("kevin_connections").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("Conexão não encontrada");
  return data as KevinConnection;
}

export const carregarPainelKevin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => carregarPainelFor(context));

export const gerarCodigoKevin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => ({ permissoes: list(d, "permissoes"), minutos: Number(rec(d).minutos) || 30 }))
  .handler(async ({ context, data }) => gerarCodigoFor(context, data.permissoes, data.minutos));

export const conectarCodigoKevin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => ({
    codigo: str(d, "codigo"),
    remoteBaseUrl: str(d, "remoteBaseUrl"),
    baseUrl: str(d, "baseUrl"),
  }))
  .handler(async ({ context, data }) =>
    conectarComCodigoFor(context, data.codigo, data.remoteBaseUrl, data.baseUrl),
  );

export const enviarDadosKevin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => ({ conexaoId: str(d, "conexaoId"), tipos: list(d, "tipos") }))
  .handler(async ({ context, data }) => {
    await assertAdmin(context);
    return enviarDadosPara(await conexao(data.conexaoId), data.tipos);
  });

export const receberDadosKevin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => ({ conexaoId: str(d, "conexaoId"), tipos: list(d, "tipos") }))
  .handler(async ({ context, data }) => {
    await assertAdmin(context);
    return receberDadosDe(await conexao(data.conexaoId), data.tipos);
  });

export const aprenderKevin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => ({ conexaoId: str(d, "conexaoId") }))
  .handler(async ({ context, data }) => {
    await assertAdmin(context);
    return aprenderEstruturaDe(await conexao(data.conexaoId));
  });

export const atualizarPermissoesKevin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => ({ conexaoId: str(d, "conexaoId"), permissoes: list(d, "permissoes") }))
  .handler(async ({ context, data }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("kevin_connections")
      .update({ permissoes: data.permissoes })
      .eq("id", data.conexaoId);
    if (error) throw error;
    return { ok: true };
  });

export const removerConexaoKevin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => ({ conexaoId: str(d, "conexaoId") }))
  .handler(async ({ context, data }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("kevin_connections").delete().eq("id", data.conexaoId);
    return { ok: true };
  });

export const criarBackupKevin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    return criarBackup();
  });

export const restaurarBackupKevin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => ({ backupId: str(d, "backupId") }))
  .handler(async ({ context, data }) => {
    await assertAdmin(context);
    return restaurarBackup(data.backupId);
  });

export const sincronizarKevin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    return sincronizarTudo();
  });

export const autotesteKevin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => ({ baseUrl: str(d, "baseUrl") }))
  .handler(async ({ context, data }) => autotesteFor(context, data.baseUrl.replace(/\/+$/, "")));
