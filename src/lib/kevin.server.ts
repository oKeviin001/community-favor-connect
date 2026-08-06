import type { SupabaseClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { Database } from "@/integrations/supabase/types";
export type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

import { APP_SLUG, APP_VERSAO, KEVIN_PROTOCOL, TIPOS_IDS, type TipoDado } from "./kevin/shared";

type AuthContext = {
  supabase: SupabaseClient<Database>;
  userId: string;
  claims?: Record<string, unknown>;
};

/* ------------------------------ identidade ------------------------------ */

export async function getIdentity() {
  const { data, error } = await supabaseAdmin
    .from("kevin_app_identity")
    .select("*")
    .order("criado_em", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("Identidade Kevin não configurada");
  return data as {
    id: string;
    app_slug: string;
    app_nome: string;
    app_uuid: string;
    versao: string;
    base_url: string | null;
    criado_em: string;
  };
}

export async function setBaseUrl(baseUrl: string) {
  const identity = await getIdentity();
  if (identity.base_url === baseUrl) return identity;
  await supabaseAdmin.from("kevin_app_identity").update({ base_url: baseUrl }).eq("id", identity.id);
  return { ...identity, base_url: baseUrl };
}

export async function buildManifesto(baseUrl?: string) {
  const identity = baseUrl ? await setBaseUrl(baseUrl) : await getIdentity();
  const [{ count: conexoes }, ultima] = await Promise.all([
    supabaseAdmin.from("kevin_connections").select("id", { count: "exact", head: true }),
    supabaseAdmin
      .from("kevin_connections")
      .select("ultima_sync")
      .not("ultima_sync", "is", null)
      .order("ultima_sync", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);
  return {
    protocolo: KEVIN_PROTOCOL,
    compativel: true,
    nome: identity.app_nome,
    slug: identity.app_slug,
    identificador: identity.app_uuid,
    versao: identity.versao,
    criado_em: identity.criado_em,
    base_url: identity.base_url,
    recursos: [
      "pedidos",
      "entregas",
      "avaliacoes",
      "disputas",
      "comprovantes",
      "moderacao",
      "transferencia",
    ],
    modulos: ["cliente", "entregador", "administrativo", "transferencia"],
    permissoes_disponiveis: TIPOS_IDS,
    endpoints: {
      manifesto: "/api/public/kevin/manifest",
      handshake: "/api/public/kevin/handshake",
      aprender: "/api/public/kevin/learn",
      exportar: "/api/public/kevin/export",
      receber: "/api/public/kevin/receive",
    },
    conexoes: conexoes ?? 0,
    ultima_sincronizacao: ultima.data?.ultima_sync ?? null,
    status: "online",
  };
}

export async function buildEstrutura() {
  const manifesto = await buildManifesto();
  return {
    protocolo: KEVIN_PROTOCOL,
    aplicativo: manifesto.nome,
    identificador: manifesto.identificador,
    versao: manifesto.versao,
    modulos: manifesto.modulos,
    recursos: manifesto.recursos,
    tipos_de_usuario: ["cliente", "entregador", "ambos"],
    papeis_administrativos: ["admin", "moderator", "user"],
    categorias_de_pedido: [
      "mercado",
      "farmacia",
      "padaria",
      "lojas",
      "retirada",
      "favor",
      "livre",
    ],
    status_de_pedido: [
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
    ],
    status_de_pagamento: ["depositado", "liberado", "reembolsado", "cancelado"],
    criterios_de_avaliacao: ["nota", "comunicacao", "rapidez", "educacao", "confiabilidade"],
    areas_administrativas: ["pedidos", "disputas", "usuarios", "transferencia"],
    tipos_compartilhaveis: TIPOS_IDS,
    observacao:
      "Somente estrutura. Nenhum dado pessoal, credencial ou informação sigilosa é exposto por este recurso.",
  };
}

/* --------------------------------- auth --------------------------------- */

export async function assertAdmin(context: AuthContext) {
  const { data } = await context.supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", context.userId)
    .eq("role", "admin")
    .maybeSingle();
  if (data?.role === "admin") return;
  const { data: userData } = await context.supabase.auth.getUser();
  const email = (userData.user?.email ?? "").toLowerCase();
  const { DEV_EMAIL } = await import("./dev-constants");
  if (email !== DEV_EMAIL) throw new Error("Área restrita a administradores");
}

export async function connectionByToken(token: string | null) {
  if (!token) return null;
  const { data } = await supabaseAdmin
    .from("kevin_connections")
    .select("*")
    .eq("token_entrada", token)
    .maybeSingle();
  return data as KevinConnection | null;
}

export interface KevinConnection {
  id: string;
  remote_uuid: string;
  remote_nome: string;
  remote_slug: string | null;
  remote_versao: string | null;
  remote_base_url: string | null;
  direcao: string;
  token_entrada: string | null;
  token_saida: string | null;
  permissoes: string[];
  manifesto: Record<string, unknown> | null;
  estrutura: Record<string, unknown> | null;
  status: string;
  ultimo_erro: string | null;
  conectado_em: string;
  ultima_sync: string | null;
}

/* -------------------------------- códigos -------------------------------- */

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function bloco(n: number) {
  const bytes = crypto.getRandomValues(new Uint8Array(n));
  return Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join("");
}

export function novoCodigo() {
  return `KVN-${bloco(4)}-${bloco(4)}-${bloco(4)}`;
}

export function novoToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export async function expirarCodigos() {
  await supabaseAdmin
    .from("kevin_pairing_codes")
    .update({ status: "expirado" })
    .eq("status", "ativo")
    .lt("expira_em", new Date().toISOString());
}

export async function gerarCodigoFor(context: AuthContext, permissoes: string[], minutos: number) {
  await assertAdmin(context);
  await expirarCodigos();
  const validos = permissoes.filter((p) => TIPOS_IDS.includes(p as TipoDado));
  const expira = new Date(Date.now() + Math.min(Math.max(minutos, 5), 1440) * 60_000);
  const { data, error } = await supabaseAdmin
    .from("kevin_pairing_codes")
    .insert({
      codigo: novoCodigo(),
      criado_por: context.userId,
      expira_em: expira.toISOString(),
      permissoes: validos,
    })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

/* ------------------------------- handshake ------------------------------- */

interface ManifestoRemoto {
  protocolo?: string;
  nome?: string;
  slug?: string;
  identificador?: string;
  versao?: string;
  base_url?: string | null;
}

export async function registrarLog(entry: {
  conexao_id?: string | null;
  origem: string;
  destino: string;
  direcao: string;
  operacao: string;
  tipos?: string[];
  registros?: number;
  detalhes?: unknown;
  status?: string;
  erro?: string | null;
}) {
  await supabaseAdmin.from("kevin_transfer_log").insert({
    conexao_id: entry.conexao_id ?? null,
    origem: entry.origem,
    destino: entry.destino,
    direcao: entry.direcao,
    operacao: entry.operacao,
    tipos: entry.tipos ?? [],
    registros: entry.registros ?? 0,
    detalhes: (entry.detalhes ?? null) as never,
    status: entry.status ?? "concluido",
    erro: entry.erro ?? null,
  });
}

/** Executado no aplicativo que GEROU o código, quando outro app apresenta o código. */
export async function receberHandshake(codigo: string, manifestoRemoto: ManifestoRemoto, baseUrl: string) {
  const identity = await setBaseUrl(baseUrl);
  if (manifestoRemoto.protocolo !== KEVIN_PROTOCOL || !manifestoRemoto.identificador) {
    await registrarLog({
      origem: manifestoRemoto.nome ?? "desconhecido",
      destino: identity.app_nome,
      direcao: "entrada",
      operacao: "handshake",
      status: "falhou",
      erro: "Aplicativo encontrado, porém incompatível com o Protocolo Kevin.",
    });
    throw new Error("Aplicativo encontrado, porém incompatível com o Protocolo Kevin.");
  }

  await expirarCodigos();
  const { data: code } = await supabaseAdmin
    .from("kevin_pairing_codes")
    .select("*")
    .eq("codigo", codigo.trim().toUpperCase())
    .maybeSingle();

  if (!code || code.status !== "ativo" || new Date(code.expira_em).getTime() < Date.now()) {
    await registrarLog({
      origem: manifestoRemoto.nome ?? "desconhecido",
      destino: identity.app_nome,
      direcao: "entrada",
      operacao: "handshake",
      status: "falhou",
      erro: "Código inválido, já utilizado ou expirado.",
      detalhes: { codigo },
    });
    throw new Error("Código inválido, já utilizado ou expirado.");
  }

  const token = novoToken();
  const permissoes = (code.permissoes as string[]) ?? [];

  const { data: conexao, error } = await supabaseAdmin
    .from("kevin_connections")
    .upsert(
      {
        remote_uuid: manifestoRemoto.identificador,
        remote_nome: manifestoRemoto.nome ?? "Aplicativo Kevin",
        remote_slug: manifestoRemoto.slug ?? null,
        remote_versao: manifestoRemoto.versao ?? null,
        remote_base_url: manifestoRemoto.base_url ?? null,
        direcao: "entrada",
        token_entrada: token,
        token_saida: token,
        permissoes,
        manifesto: manifestoRemoto as never,
        status: "conectado",
        ultimo_erro: null,
        conectado_em: new Date().toISOString(),
      },
      { onConflict: "remote_uuid" },
    )
    .select("*")
    .single();
  if (error) throw error;

  await supabaseAdmin
    .from("kevin_pairing_codes")
    .update({
      status: "usado",
      usado_em: new Date().toISOString(),
      usado_por_nome: manifestoRemoto.nome ?? null,
      usado_por_uuid: manifestoRemoto.identificador,
      token_emitido: token,
    })
    .eq("id", code.id);

  await registrarLog({
    conexao_id: conexao.id,
    origem: manifestoRemoto.nome ?? "desconhecido",
    destino: identity.app_nome,
    direcao: "entrada",
    operacao: "handshake",
    detalhes: { codigo, permissoes },
  });

  return {
    ok: true,
    token,
    permissoes,
    manifesto: await buildManifesto(baseUrl),
  };
}

/** Executado no aplicativo que RECEBE o código digitado pelo admin. */
export async function conectarComCodigoFor(
  context: AuthContext,
  codigo: string,
  remoteBaseUrl: string,
  baseUrl: string,
) {
  await assertAdmin(context);
  const identity = await setBaseUrl(baseUrl);
  const alvo = remoteBaseUrl.replace(/\/+$/, "");

  let manifestoRemoto: ManifestoRemoto;
  try {
    const res = await fetch(`${alvo}/api/public/kevin/manifest`, { headers: { accept: "application/json" } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    manifestoRemoto = (await res.json()) as ManifestoRemoto;
  } catch (e) {
    const erro = `Aplicativo não encontrado ou sem Protocolo Kevin (${(e as Error).message}).`;
    await registrarLog({
      origem: identity.app_nome,
      destino: alvo,
      direcao: "saida",
      operacao: "deteccao",
      status: "falhou",
      erro,
    });
    throw new Error(erro);
  }

  if (manifestoRemoto.protocolo !== KEVIN_PROTOCOL) {
    const erro = "Aplicativo encontrado, porém incompatível com o Protocolo Kevin.";
    await registrarLog({
      origem: identity.app_nome,
      destino: alvo,
      direcao: "saida",
      operacao: "deteccao",
      status: "falhou",
      erro,
    });
    throw new Error(erro);
  }

  const meuManifesto = await buildManifesto(baseUrl);
  const res = await fetch(`${alvo}/api/public/kevin/handshake`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ codigo: codigo.trim().toUpperCase(), manifesto: meuManifesto }),
  });
  const body = (await res.json().catch(() => ({}))) as {
    ok?: boolean;
    token?: string;
    permissoes?: string[];
    manifesto?: ManifestoRemoto;
    error?: string;
  };

  if (!res.ok || !body.ok || !body.token) {
    const erro = body.error ?? `Handshake recusado (HTTP ${res.status}).`;
    await registrarLog({
      origem: identity.app_nome,
      destino: manifestoRemoto.nome ?? alvo,
      direcao: "saida",
      operacao: "handshake",
      status: "falhou",
      erro,
    });
    throw new Error(erro);
  }

  const remoto = body.manifesto ?? manifestoRemoto;
  const { data: conexao, error } = await supabaseAdmin
    .from("kevin_connections")
    .upsert(
      {
        remote_uuid: remoto.identificador!,
        remote_nome: remoto.nome ?? "Aplicativo Kevin",
        remote_slug: remoto.slug ?? null,
        remote_versao: remoto.versao ?? null,
        remote_base_url: alvo,
        direcao: "saida",
        token_entrada: body.token,
        token_saida: body.token,
        permissoes: body.permissoes ?? [],
        manifesto: remoto as never,
        status: "conectado",
        ultimo_erro: null,
        conectado_em: new Date().toISOString(),
      },
      { onConflict: "remote_uuid" },
    )
    .select("*")
    .single();
  if (error) throw error;

  await registrarLog({
    conexao_id: conexao.id,
    origem: identity.app_nome,
    destino: conexao.remote_nome,
    direcao: "saida",
    operacao: "handshake",
    detalhes: { codigo, permissoes: body.permissoes ?? [] },
  });

  return conexao;
}

/* ------------------------------ dados reais ------------------------------ */

const USUARIO_SELECT = "id, nome, bairro, tipo, nota_media, total_avaliacoes, total_entregas, bloqueado, suspenso, criado_em";
const PEDIDO_SELECT =
  "id, cliente_id, entregador_id, categoria, descricao, loja, status, valor_produto, valor_frete, taxa_servico, total, criado_em, atualizado_em";
const AVALIACAO_SELECT =
  "id, order_id, reviewer_id, reviewee_id, nota, comunicacao, rapidez, educacao, confiabilidade, criado_em";
const RECLAMACAO_SELECT = "id, order_id, motivo, status, criado_em, atualizado_em";

export async function coletarDados(tipos: string[], desde?: string | null) {
  const pedidos: Record<string, { remote_id: string; payload: unknown }[]> = {};
  const alvo = tipos.filter((t) => TIPOS_IDS.includes(t as TipoDado));

  for (const tipo of alvo) {
    if (tipo === "usuarios" || tipo === "entregadores") {
      let q = supabaseAdmin.from("profiles").select(USUARIO_SELECT).limit(500);
      if (tipo === "entregadores") q = q.in("tipo", ["entregador", "ambos"]);
      if (desde) q = q.gte("criado_em", desde);
      const { data } = await q;
      pedidos[tipo] = (data ?? []).map((r) => ({ remote_id: r.id, payload: r }));
    } else if (tipo === "pedidos") {
      let q = supabaseAdmin.from("orders").select(PEDIDO_SELECT).order("criado_em", { ascending: false }).limit(500);
      if (desde) q = q.gte("atualizado_em", desde);
      const { data } = await q;
      pedidos[tipo] = (data ?? []).map((r) => ({ remote_id: r.id, payload: r }));
    } else if (tipo === "avaliacoes") {
      let q = supabaseAdmin.from("reviews").select(AVALIACAO_SELECT).limit(500);
      if (desde) q = q.gte("criado_em", desde);
      const { data } = await q;
      pedidos[tipo] = (data ?? []).map((r) => ({ remote_id: r.id, payload: r }));
    } else if (tipo === "reclamacoes") {
      let q = supabaseAdmin.from("disputes").select(RECLAMACAO_SELECT).limit(500);
      if (desde) q = q.gte("atualizado_em", desde);
      const { data } = await q;
      pedidos[tipo] = (data ?? []).map((r) => ({ remote_id: r.id, payload: r }));
    } else if (tipo === "estatisticas" || tipo === "relatorios") {
      const [{ count: totalPedidos }, { count: totalUsuarios }, { count: totalAvaliacoes }] = await Promise.all([
        supabaseAdmin.from("orders").select("id", { count: "exact", head: true }),
        supabaseAdmin.from("profiles").select("id", { count: "exact", head: true }),
        supabaseAdmin.from("reviews").select("id", { count: "exact", head: true }),
      ]);
      pedidos[tipo] = [
        {
          remote_id: tipo,
          payload: {
            pedidos: totalPedidos ?? 0,
            usuarios: totalUsuarios ?? 0,
            avaliacoes: totalAvaliacoes ?? 0,
            gerado_em: new Date().toISOString(),
          },
        },
      ];
    } else if (tipo === "configuracoes" || tipo === "conteudo") {
      const estrutura = await buildEstrutura();
      pedidos[tipo] = [{ remote_id: tipo, payload: estrutura }];
    }
  }
  return pedidos;
}

export async function gravarRecebidos(
  conexao: KevinConnection,
  origem: string,
  registros: { tipo: string; remote_id: string; payload: unknown }[],
) {
  if (registros.length === 0) return 0;
  const rows = registros.map((r) => ({
    conexao_id: conexao.id,
    origem,
    tipo: r.tipo,
    remote_id: String(r.remote_id),
    payload: r.payload as never,
    recebido_em: new Date().toISOString(),
  }));
  const { error } = await supabaseAdmin
    .from("kevin_inbox")
    .upsert(rows, { onConflict: "conexao_id,tipo,remote_id" });
  if (error) throw error;
  return rows.length;
}

/* ------------------------------ envio / recebimento ------------------------------ */

export async function enviarDadosPara(conexao: KevinConnection, tipos: string[], desde?: string | null) {
  const identity = await getIdentity();
  if (!conexao.remote_base_url || !conexao.token_saida) {
    throw new Error(`Conexão ${conexao.remote_nome} não possui endereço para envio.`);
  }
  const permitidos = tipos.filter((t) => conexao.permissoes.length === 0 || conexao.permissoes.includes(t));
  if (permitidos.length === 0) throw new Error("Nenhum tipo autorizado para esta conexão.");

  const dados = await coletarDados(permitidos, desde);
  const registros = Object.entries(dados).flatMap(([tipo, itens]) =>
    itens.map((i) => ({ tipo, remote_id: i.remote_id, payload: i.payload })),
  );

  try {
    const res = await fetch(`${conexao.remote_base_url}/api/public/kevin/receive`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-kevin-token": conexao.token_saida },
      body: JSON.stringify({
        origem: identity.app_nome,
        identificador: identity.app_uuid,
        tipos: permitidos,
        registros,
      }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    await supabaseAdmin
      .from("kevin_connections")
      .update({ ultima_sync: new Date().toISOString(), status: "conectado", ultimo_erro: null })
      .eq("id", conexao.id);
    await registrarLog({
      conexao_id: conexao.id,
      origem: identity.app_nome,
      destino: conexao.remote_nome,
      direcao: "saida",
      operacao: "envio",
      tipos: permitidos,
      registros: registros.length,
      detalhes: Object.fromEntries(Object.entries(dados).map(([k, v]) => [k, v.length])),
    });
    return { registros: registros.length, tipos: permitidos };
  } catch (e) {
    const erro = (e as Error).message;
    await supabaseAdmin
      .from("kevin_connections")
      .update({ status: "falha", ultimo_erro: erro })
      .eq("id", conexao.id);
    await registrarLog({
      conexao_id: conexao.id,
      origem: identity.app_nome,
      destino: conexao.remote_nome,
      direcao: "saida",
      operacao: "envio",
      tipos: permitidos,
      status: "falhou",
      erro,
    });
    throw new Error(`Falha ao enviar para ${conexao.remote_nome}: ${erro}`);
  }
}

export async function receberDadosDe(conexao: KevinConnection, tipos: string[]) {
  const identity = await getIdentity();
  if (!conexao.remote_base_url || !conexao.token_saida) {
    throw new Error(`Conexão ${conexao.remote_nome} não possui endereço para leitura.`);
  }
  const query = encodeURIComponent(tipos.join(","));
  try {
    const res = await fetch(`${conexao.remote_base_url}/api/public/kevin/export?tipos=${query}`, {
      headers: { "x-kevin-token": conexao.token_saida, accept: "application/json" },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const body = (await res.json()) as {
      origem?: string;
      registros?: { tipo: string; remote_id: string; payload: unknown }[];
    };
    const registros = body.registros ?? [];
    const total = await gravarRecebidos(conexao, body.origem ?? conexao.remote_nome, registros);
    await supabaseAdmin
      .from("kevin_connections")
      .update({ ultima_sync: new Date().toISOString(), status: "conectado", ultimo_erro: null })
      .eq("id", conexao.id);
    await registrarLog({
      conexao_id: conexao.id,
      origem: conexao.remote_nome,
      destino: identity.app_nome,
      direcao: "entrada",
      operacao: "recebimento",
      tipos,
      registros: total,
    });
    return { registros: total };
  } catch (e) {
    const erro = (e as Error).message;
    await supabaseAdmin.from("kevin_connections").update({ status: "falha", ultimo_erro: erro }).eq("id", conexao.id);
    await registrarLog({
      conexao_id: conexao.id,
      origem: conexao.remote_nome,
      destino: identity.app_nome,
      direcao: "entrada",
      operacao: "recebimento",
      tipos,
      status: "falhou",
      erro,
    });
    throw new Error(`Falha ao receber de ${conexao.remote_nome}: ${erro}`);
  }
}

export async function aprenderEstruturaDe(conexao: KevinConnection) {
  const identity = await getIdentity();
  if (!conexao.remote_base_url || !conexao.token_saida) throw new Error("Conexão sem endereço.");
  try {
    const res = await fetch(`${conexao.remote_base_url}/api/public/kevin/learn`, {
      headers: { "x-kevin-token": conexao.token_saida, accept: "application/json" },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const estrutura = await res.json();
    await supabaseAdmin
      .from("kevin_connections")
      .update({ estrutura, ultima_sync: new Date().toISOString(), status: "conectado", ultimo_erro: null })
      .eq("id", conexao.id);
    await registrarLog({
      conexao_id: conexao.id,
      origem: conexao.remote_nome,
      destino: identity.app_nome,
      direcao: "entrada",
      operacao: "aprendizado",
      registros: 1,
    });
    return estrutura;
  } catch (e) {
    const erro = (e as Error).message;
    await registrarLog({
      conexao_id: conexao.id,
      origem: conexao.remote_nome,
      destino: identity.app_nome,
      direcao: "entrada",
      operacao: "aprendizado",
      status: "falhou",
      erro,
    });
    throw new Error(`Falha ao aprender estrutura: ${erro}`);
  }
}

/* -------------------------------- backups -------------------------------- */

export async function criarBackup(tipos: string[] = ["usuarios", "pedidos", "avaliacoes", "reclamacoes"]) {
  const identity = await getIdentity();
  const dados = await coletarDados(tipos);
  const registros = Object.values(dados).reduce((acc, v) => acc + v.length, 0);
  const conteudo = { gerado_em: new Date().toISOString(), dados };
  const tamanho = JSON.stringify(conteudo).length;
  const { data, error } = await supabaseAdmin
    .from("kevin_backups")
    .insert({
      origem: identity.app_nome,
      itens: tipos,
      registros,
      tamanho_bytes: tamanho,
      conteudo: conteudo as never,
    })
    .select("id, origem, itens, registros, tamanho_bytes, status, criado_em")
    .single();
  if (error) throw error;
  return data;
}

export async function restaurarBackup(id: string) {
  const { data, error } = await supabaseAdmin.from("kevin_backups").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("Backup não encontrado");
  const conteudo = data.conteudo as { dados?: Record<string, { remote_id: string; payload: Record<string, unknown> }[]> };
  const dados = conteudo.dados ?? {};
  let restaurados = 0;

  const alvo: Record<string, string> = {
    pedidos: "orders",
    avaliacoes: "reviews",
    reclamacoes: "disputes",
  };

  for (const [tipo, tabela] of Object.entries(alvo)) {
    const itens = dados[tipo] ?? [];
    if (itens.length === 0) continue;
    const { data: existentes } = await supabaseAdmin.from(tabela as "orders").select("id");
    const ids = new Set((existentes ?? []).map((r) => r.id));
    const faltando = itens.filter((i) => !ids.has(i.remote_id)).map((i) => i.payload);
    if (faltando.length === 0) continue;
    const { error: insErr } = await supabaseAdmin.from(tabela as "orders").insert(faltando as never);
    if (!insErr) restaurados += faltando.length;
  }

  await registrarLog({
    origem: data.origem,
    destino: (await getIdentity()).app_nome,
    direcao: "entrada",
    operacao: "restauracao",
    tipos: data.itens as string[],
    registros: restaurados,
    detalhes: { backup_id: id },
  });
  return { restaurados };
}

/* ----------------------------- sincronização ----------------------------- */

export async function sincronizarTudo() {
  const { data: conexoes } = await supabaseAdmin.from("kevin_connections").select("*").eq("status", "conectado");
  const lista = (conexoes ?? []) as KevinConnection[];
  const { data: pendentes } = await supabaseAdmin
    .from("kevin_sync_queue")
    .select("id, tipo")
    .is("processado_em", null)
    .limit(500);
  const fila = pendentes ?? [];

  const alvos = lista.filter((c) => c.remote_base_url && c.token_saida && c.permissoes.length > 0);
  if (alvos.length === 0) {
    return { conexoes: lista.length, pendentes: fila.length, enviados: 0, resultado: "sem_destino" };
  }
  if (fila.length === 0) {
    return { conexoes: lista.length, pendentes: 0, enviados: 0, resultado: "em_dia" };
  }

  const tipos = Array.from(new Set(fila.map((f) => f.tipo)));
  let enviados = 0;
  const erros: string[] = [];
  for (const conexao of alvos) {
    const permitidos = tipos.filter((t) => conexao.permissoes.includes(t));
    if (permitidos.length === 0) continue;
    try {
      const r = await enviarDadosPara(conexao, permitidos);
      enviados += r.registros;
    } catch (e) {
      erros.push((e as Error).message);
    }
  }

  if (erros.length === 0) {
    await supabaseAdmin
      .from("kevin_sync_queue")
      .update({ processado_em: new Date().toISOString() })
      .in("id", fila.map((f) => f.id));
    await criarBackup();
  }

  return { conexoes: lista.length, pendentes: fila.length, enviados, erros, resultado: erros.length ? "falha" : "ok" };
}

/* -------------------------------- consultas -------------------------------- */

export async function carregarPainelFor(context: AuthContext) {
  await assertAdmin(context);
  await expirarCodigos();
  const [identity, codigos, conexoes, historico, backups, inbox, fila] = await Promise.all([
    buildManifesto(),
    supabaseAdmin.from("kevin_pairing_codes").select("*").order("criado_em", { ascending: false }).limit(20),
    supabaseAdmin.from("kevin_connections").select("*").order("conectado_em", { ascending: false }),
    supabaseAdmin.from("kevin_transfer_log").select("*").order("criado_em", { ascending: false }).limit(50),
    supabaseAdmin
      .from("kevin_backups")
      .select("id, origem, itens, registros, tamanho_bytes, status, criado_em")
      .order("criado_em", { ascending: false })
      .limit(20),
    supabaseAdmin.from("kevin_inbox").select("id, origem, tipo, remote_id, recebido_em").order("recebido_em", { ascending: false }).limit(50),
    supabaseAdmin.from("kevin_sync_queue").select("id", { count: "exact", head: true }).is("processado_em", null),
  ]);

  const payload = {
    manifesto: identity,
    codigos: codigos.data ?? [],
    conexoes: conexoes.data ?? [],
    historico: historico.data ?? [],
    backups: backups.data ?? [],
    recebidos: inbox.data ?? [],
    pendentes: fila.count ?? 0,
  };
  return JSON.parse(JSON.stringify(payload)) as Record<string, JsonValue>;
}

/* -------------------------------- autoteste -------------------------------- */

export async function autotesteFor(context: AuthContext, baseUrl: string) {
  await assertAdmin(context);
  const etapas: { etapa: string; ok: boolean; detalhe: string }[] = [];
  const push = (etapa: string, ok: boolean, detalhe: string) => etapas.push({ etapa, ok, detalhe });
  let conexaoId: string | null = null;

  try {
    const manifesto = await buildManifesto(baseUrl);
    push("Manifesto Kevin", manifesto.protocolo === KEVIN_PROTOCOL, manifesto.protocolo);

    const res = await fetch(`${baseUrl}/api/public/kevin/manifest`);
    const remoto = (await res.json()) as ManifestoRemoto;
    push("Detecção de aplicativo", res.ok && remoto.protocolo === KEVIN_PROTOCOL, `HTTP ${res.status}`);

    const codigo = await gerarCodigoFor(context, ["usuarios", "pedidos", "avaliacoes"], 10);
    push("Geração de código", Boolean(codigo.codigo), codigo.codigo);

    const testeUuid = crypto.randomUUID();
    const hs = await fetch(`${baseUrl}/api/public/kevin/handshake`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        codigo: codigo.codigo,
        manifesto: {
          protocolo: KEVIN_PROTOCOL,
          nome: "Autoteste do Protocolo Kevin",
          slug: "autoteste-kevin",
          identificador: testeUuid,
          versao: APP_VERSAO,
          base_url: baseUrl,
        },
      }),
    });
    const hsBody = (await hs.json()) as { ok?: boolean; token?: string; error?: string };
    push("Handshake Kevin", Boolean(hsBody.ok && hsBody.token), hsBody.error ?? "conexão estabelecida");
    if (!hsBody.token) throw new Error(hsBody.error ?? "handshake falhou");

    const { data: conexao } = await supabaseAdmin
      .from("kevin_connections")
      .select("*")
      .eq("remote_uuid", testeUuid)
      .maybeSingle();
    conexaoId = conexao?.id ?? null;
    push("Validação de código", Boolean(conexao), conexao ? "código consumido e conexão registrada" : "conexão ausente");

    const reuso = await fetch(`${baseUrl}/api/public/kevin/handshake`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        codigo: codigo.codigo,
        manifesto: { protocolo: KEVIN_PROTOCOL, nome: "Autoteste", identificador: crypto.randomUUID(), versao: "1" },
      }),
    });
    push("Código de uso único", reuso.status >= 400, `HTTP ${reuso.status}`);

    const learn = await fetch(`${baseUrl}/api/public/kevin/learn`, { headers: { "x-kevin-token": hsBody.token } });
    const estrutura = (await learn.json()) as { modulos?: string[] };
    push("Aprendizado estrutural", learn.ok && Array.isArray(estrutura.modulos), `${estrutura.modulos?.length ?? 0} módulos`);

    const exp = await fetch(`${baseUrl}/api/public/kevin/export?tipos=usuarios,pedidos`, {
      headers: { "x-kevin-token": hsBody.token },
    });
    const expBody = (await exp.json()) as { registros?: unknown[] };
    push("Compartilhamento autorizado", exp.ok, `${expBody.registros?.length ?? 0} registros reais`);

    const rec = await fetch(`${baseUrl}/api/public/kevin/receive`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-kevin-token": hsBody.token },
      body: JSON.stringify({
        origem: "Autoteste do Protocolo Kevin",
        tipos: ["estatisticas"],
        registros: (expBody.registros ?? []).slice(0, 5),
      }),
    });
    push("Recebimento autorizado", rec.ok, `HTTP ${rec.status}`);

    const semToken = await fetch(`${baseUrl}/api/public/kevin/export?tipos=usuarios`);
    push("Bloqueio sem token", semToken.status === 401, `HTTP ${semToken.status}`);

    const backup = await criarBackup();
    push("Criação de backup", backup.registros >= 0, `${backup.registros} registros`);

    const sync = await sincronizarTudo();
    push("Verificação de sincronização", true, `${sync.pendentes} pendências / ${sync.enviados} enviados`);

    const { count } = await supabaseAdmin
      .from("kevin_transfer_log")
      .select("id", { count: "exact", head: true });
    push("Registro em histórico", (count ?? 0) > 0, `${count ?? 0} registros`);
  } catch (e) {
    push("Execução do teste", false, (e as Error).message);
  } finally {
    if (conexaoId) {
      await supabaseAdmin.from("kevin_inbox").delete().eq("conexao_id", conexaoId);
      await supabaseAdmin.from("kevin_connections").delete().eq("id", conexaoId);
    }
  }

  const ok = etapas.every((e) => e.ok);
  await registrarLog({
    origem: APP_SLUG,
    destino: APP_SLUG,
    direcao: "interno",
    operacao: "autoteste",
    registros: etapas.length,
    status: ok ? "concluido" : "falhou",
    detalhes: etapas,
    erro: ok ? null : etapas.filter((e) => !e.ok).map((e) => `${e.etapa}: ${e.detalhe}`).join(" | "),
  });
  return { ok, etapas };
}
