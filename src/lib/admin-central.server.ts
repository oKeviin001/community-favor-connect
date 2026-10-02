import type { SupabaseClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { Database } from "@/integrations/supabase/types";

type AuthContext = {
  supabase: SupabaseClient<Database>;
  userId: string;
  claims?: Record<string, unknown>;
};

export function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object";
}

function str(value: unknown, key: string, max = 4000): string {
  if (!isRecord(value)) throw new Error("Dados inválidos");
  const v = value[key];
  if (typeof v !== "string") throw new Error("Dados inválidos");
  return v.slice(0, max);
}

function optStr(value: unknown, key: string, max = 4000): string | null {
  if (!isRecord(value)) return null;
  const v = value[key];
  return typeof v === "string" ? v.slice(0, max) : null;
}

export function parseAdminQuery(value: unknown): { view: string; filtro: string; busca: string } {
  return {
    view: str(value, "view", 40),
    filtro: optStr(value, "filtro", 40) ?? "todos",
    busca: (optStr(value, "busca", 80) ?? "").trim(),
  };
}

export function parseAdminMutation(value: unknown): { acao: string; payload: Record<string, unknown> } {
  const acao = str(value, "acao", 60);
  const payload = isRecord(value) && isRecord(value["payload"]) ? value["payload"] : {};
  return { acao, payload };
}

async function currentAdmin(context: AuthContext) {
  const { data: userData } = await context.supabase.auth.getUser();
  const email = userData.user?.email?.toLowerCase() ?? "";
  const { data: role } = await context.supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", context.userId)
    .eq("role", "admin")
    .maybeSingle();
  if (role?.role !== "admin") {
    throw new Error("Sem permissão administrativa");
  }
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("nome")
    .eq("id", context.userId)
    .maybeSingle();
  return { id: context.userId, nome: profile?.nome ?? email ?? "Admin" };
}

async function log(
  admin: { id: string; nome: string },
  acao: string,
  alvoTipo?: string,
  alvoId?: string,
  detalhes: Record<string, unknown> = {},
) {
  await supabaseAdmin.from("admin_audit_log").insert({
    autor_id: admin.id,
    autor_nome: admin.nome,
    acao,
    alvo_tipo: alvoTipo ?? null,
    alvo_id: alvoId ?? null,
    detalhes: detalhes as never,
  });
}

export type ConfigGeral = {
  cadastroEntregadores?: boolean;
  pausarPedidos?: boolean;
  manutencao?: boolean;
  avisoHome?: string;
  limitePedidosUsuario?: number;
  bairrosAtivos?: string[];
};

const ATIVOS = ["aceito", "indo_loja", "em_compra", "compra_finalizada", "em_entrega"] as const;

function startOfToday() {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d.toISOString();
}

async function count(table: "profiles" | "orders" | "courier_applications", build?: (q: never) => never) {
  void build;
  const { count: c } = await supabaseAdmin.from(table).select("id", { count: "exact", head: true });
  return c ?? 0;
}

async function dashboard() {
  const hoje = startOfToday();
  const [usuarios, pedidos, entregadores, ativos, concluidos, cancelados, novosUsuarios, novosPedidos, novosEntregadores, candidaturas] =
    await Promise.all([
      supabaseAdmin.from("profiles").select("id", { count: "exact", head: true }),
      supabaseAdmin.from("orders").select("id", { count: "exact", head: true }),
      supabaseAdmin.from("profiles").select("id", { count: "exact", head: true }).in("tipo", ["entregador", "ambos"]),
      supabaseAdmin.from("orders").select("id", { count: "exact", head: true }).in("status", ATIVOS),
      supabaseAdmin.from("orders").select("id", { count: "exact", head: true }).in("status", ["entregue", "confirmado"]),
      supabaseAdmin.from("orders").select("id", { count: "exact", head: true }).eq("status", "cancelado"),
      supabaseAdmin.from("profiles").select("id", { count: "exact", head: true }).gte("criado_em", hoje),
      supabaseAdmin.from("orders").select("id", { count: "exact", head: true }).gte("criado_em", hoje),
      supabaseAdmin
        .from("courier_applications")
        .select("id", { count: "exact", head: true })
        .eq("status", "aprovado")
        .gte("atualizado_em", hoje),
      supabaseAdmin.from("courier_applications").select("id", { count: "exact", head: true }).eq("status", "pendente"),
    ]);

  return {
    totais: {
      usuarios: usuarios.count ?? 0,
      entregadores: entregadores.count ?? 0,
      pedidos: pedidos.count ?? 0,
      ativos: ativos.count ?? 0,
      concluidos: concluidos.count ?? 0,
      cancelados: cancelados.count ?? 0,
      novosUsuarios: novosUsuarios.count ?? 0,
      novosPedidos: novosPedidos.count ?? 0,
      novosEntregadores: novosEntregadores.count ?? 0,
      candidaturasPendentes: candidaturas.count ?? 0,
    },
  };
}

async function relatorios() {
  const desde = new Date(Date.now() - 13 * 86400000).toISOString();
  const [orders, profiles, apps] = await Promise.all([
    supabaseAdmin.from("orders").select("criado_em, status").gte("criado_em", desde),
    supabaseAdmin.from("profiles").select("criado_em, tipo").gte("criado_em", desde),
    supabaseAdmin.from("courier_applications").select("criado_em, status").gte("criado_em", desde),
  ]);
  const dias: Record<string, { dia: string; pedidos: number; entregas: number; usuarios: number; entregadores: number }> = {};
  for (let i = 13; i >= 0; i--) {
    const dia = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
    dias[dia] = { dia, pedidos: 0, entregas: 0, usuarios: 0, entregadores: 0 };
  }
  for (const o of orders.data ?? []) {
    const k = o.criado_em.slice(0, 10);
    if (!dias[k]) continue;
    dias[k].pedidos += 1;
    if (o.status === "entregue" || o.status === "confirmado") dias[k].entregas += 1;
  }
  for (const p of profiles.data ?? []) {
    const k = p.criado_em.slice(0, 10);
    if (dias[k]) dias[k].usuarios += 1;
  }
  for (const a of apps.data ?? []) {
    const k = a.criado_em.slice(0, 10);
    if (dias[k] && a.status === "aprovado") dias[k].entregadores += 1;
  }
  return { dias: Object.values(dias) };
}

async function listUsers(filtro: string, busca: string) {
  let q = supabaseAdmin
    .from("profiles")
    .select("id, nome, telefone, bairro, tipo, criado_em, bloqueado, suspenso, teste, nota_media, total_entregas")
    .order("criado_em", { ascending: false })
    .limit(300);
  if (filtro === "clientes") q = q.eq("tipo", "cliente");
  if (filtro === "entregadores") q = q.in("tipo", ["entregador", "ambos"]);
  if (busca) q = q.ilike("nome", `%${busca}%`);
  const { data, error } = await q;
  if (error) throw error;
  let users = data ?? [];
  const { data: roles } = await supabaseAdmin.from("user_roles").select("user_id, role").eq("role", "admin");
  const adminIds = new Set((roles ?? []).map((r) => r.user_id));
  if (filtro === "admins") users = users.filter((u) => adminIds.has(u.id));
  return { users: users.map((u) => ({ ...u, admin: adminIds.has(u.id) })) };
}

async function listCouriers(filtro: string, busca: string) {
  const { data: apps } = await supabaseAdmin
    .from("courier_applications")
    .select("id, user_id, status, criado_em, bairro, cidade, transporte, nome_completo")
    .order("criado_em", { ascending: false })
    .limit(300);
  const list = apps ?? [];
  const ids = list.map((a) => a.user_id);
  const { data: profs } = ids.length
    ? await supabaseAdmin
        .from("profiles")
        .select("id, nome, bairro, telefone, nota_media, total_entregas, suspenso, bloqueado, tipo")
        .in("id", ids)
    : { data: [] as never[] };
  const byId = new Map((profs ?? []).map((p) => [p.id, p]));
  let rows = list.map((a) => {
    const p = byId.get(a.user_id);
    const suspenso = p?.suspenso || p?.bloqueado || false;
    const estado = suspenso ? "suspenso" : a.status;
    return {
      applicationId: a.id,
      userId: a.user_id,
      nome: p?.nome ?? a.nome_completo,
      bairro: p?.bairro ?? a.bairro ?? null,
      telefone: p?.telefone ?? null,
      nota: p?.nota_media ?? null,
      entregas: p?.total_entregas ?? 0,
      statusCandidatura: a.status,
      estado,
      criado_em: a.criado_em,
      transporte: a.transporte,
    };
  });
  if (filtro === "ativos") rows = rows.filter((r) => r.estado === "aprovado");
  if (filtro === "pendentes") rows = rows.filter((r) => r.estado === "pendente");
  if (filtro === "reprovados") rows = rows.filter((r) => r.estado === "reprovado");
  if (filtro === "suspensos") rows = rows.filter((r) => r.estado === "suspenso");
  if (busca) rows = rows.filter((r) => r.nome.toLowerCase().includes(busca.toLowerCase()));
  return { couriers: rows };
}

async function listOrders(filtro: string, busca: string) {
  let q = supabaseAdmin
    .from("orders")
    .select("id, cliente_id, entregador_id, categoria, descricao, status, criado_em, bairro, valor_frete, teste")
    .order("criado_em", { ascending: false })
    .limit(300);
  if (filtro === "aguardando") q = q.eq("status", "aguardando_entregador");
  if (filtro === "aceitos") q = q.eq("status", "aceito");
  if (filtro === "andamento") q = q.in("status", ATIVOS);
  if (filtro === "concluidos") q = q.in("status", ["entregue", "confirmado"]);
  if (filtro === "cancelados") q = q.eq("status", "cancelado");
  if (busca) q = q.ilike("descricao", `%${busca}%`);
  const { data, error } = await q;
  if (error) throw error;
  const orders = data ?? [];
  const ids = [...new Set(orders.flatMap((o) => [o.cliente_id, o.entregador_id]).filter((v): v is string => !!v))];
  const { data: profs } = ids.length
    ? await supabaseAdmin.from("profiles").select("id, nome").in("id", ids)
    : { data: [] as { id: string; nome: string }[] };
  const nomes = new Map((profs ?? []).map((p) => [p.id, p.nome]));
  return {
    orders: orders.map((o) => ({
      ...o,
      clienteNome: nomes.get(o.cliente_id) ?? "—",
      entregadorNome: o.entregador_id ? (nomes.get(o.entregador_id) ?? "—") : null,
    })),
  };
}

export async function adminQueryFor(context: AuthContext, view: string, filtro: string, busca: string) {
  await currentAdmin(context);
  switch (view) {
    case "dashboard":
      return dashboard();
    case "relatorios":
      return relatorios();
    case "usuarios":
      return listUsers(filtro, busca);
    case "entregadores":
      return listCouriers(filtro, busca);
    case "pedidos":
      return listOrders(filtro, busca);
    case "avisos": {
      const { data } = await supabaseAdmin.from("announcements").select("*").order("criado_em", { ascending: false });
      return { avisos: data ?? [] };
    }
    case "conteudo": {
      const { data } = await supabaseAdmin.from("content_blocks").select("*").order("chave");
      return { blocos: data ?? [] };
    }
    case "config": {
      const { data } = await supabaseAdmin.from("app_settings").select("valor").eq("chave", "geral").maybeSingle();
      return { config: (data?.valor ?? {}) as ConfigGeral };
    }
    case "auditoria": {
      const { data } = await supabaseAdmin
        .from("admin_audit_log")
        .select("*")
        .order("criado_em", { ascending: false })
        .limit(200);
      return { logs: data ?? [] };
    }
    default:
      throw new Error("Consulta inválida");
  }
}

async function setProfileFlags(id: string, patch: Record<string, unknown>) {
  const { error } = await supabaseAdmin.from("profiles").update(patch as never).eq("id", id);
  if (error) throw error;
}

async function criarUsuarioTeste(tipo: "cliente" | "entregador", nomeBase: string) {
  const suf = Math.random().toString(36).slice(2, 8);
  const email = `teste.${suf}@pedeprokevin.test`;
  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password: `Teste!${suf}A1`,
    email_confirm: true,
    user_metadata: { nome: `${nomeBase} ${suf.toUpperCase()}`, tipo: tipo === "entregador" ? "ambos" : "cliente" },
  });
  if (error) throw error;
  const uid = data.user.id;
  await supabaseAdmin
    .from("profiles")
    .update({
      nome: `[TESTE] ${nomeBase} ${suf.toUpperCase()}`,
      tipo: tipo === "entregador" ? "ambos" : "cliente",
      bairro: "Centro",
      telefone: "11999999999",
      teste: true,
    } as never)
    .eq("id", uid);
  return { id: uid, email };
}

async function pickTeste(tipo: "cliente" | "entregador") {
  const q = supabaseAdmin.from("profiles").select("id, nome").eq("teste", true).limit(1);
  const { data } = tipo === "entregador" ? await q.in("tipo", ["entregador", "ambos"]) : await q;
  return data?.[0] ?? null;
}

async function mutate(admin: { id: string; nome: string }, acao: string, p: Record<string, unknown>) {
  const id = typeof p["id"] === "string" ? p["id"] : "";
  switch (acao) {
    // ---- usuários
    case "user_aprovar":
      await setProfileFlags(id, { bloqueado: false, suspenso: false });
      await log(admin, "Reativou usuário", "usuario", id);
      return { ok: true };
    case "user_suspender":
      await setProfileFlags(id, { suspenso: true });
      await log(admin, "Suspendeu usuário", "usuario", id);
      return { ok: true };
    case "user_bloquear":
      await setProfileFlags(id, { bloqueado: true });
      await log(admin, "Bloqueou usuário", "usuario", id);
      return { ok: true };
    case "user_excluir": {
      await supabaseAdmin.from("orders").delete().eq("cliente_id", id);
      await supabaseAdmin.auth.admin.deleteUser(id).catch(() => undefined);
      await supabaseAdmin.from("profiles").delete().eq("id", id);
      await log(admin, "Excluiu usuário", "usuario", id);
      return { ok: true };
    }
    case "user_tornar_entregador":
      await setProfileFlags(id, { tipo: "ambos" });
      await log(admin, "Tornou usuário entregador", "usuario", id);
      return { ok: true };
    case "user_remover_entregador":
      await setProfileFlags(id, { tipo: "cliente" });
      await log(admin, "Removeu status de entregador", "usuario", id);
      return { ok: true };
    case "user_tornar_admin":
      await supabaseAdmin.from("user_roles").upsert({ user_id: id, role: "admin" } as never, {
        onConflict: "user_id,role",
      });
      await log(admin, "Tornou usuário administrador", "usuario", id);
      return { ok: true };
    case "user_remover_admin":
      await supabaseAdmin.from("user_roles").delete().eq("user_id", id).eq("role", "admin");
      await log(admin, "Removeu administrador", "usuario", id);
      return { ok: true };

    // ---- entregadores / candidaturas
    case "courier_decidir": {
      const decisao = p["decisao"] === "aprovado" ? "aprovado" : p["decisao"] === "pendente" ? "pendente" : "reprovado";
      const nota = typeof p["nota"] === "string" ? p["nota"].slice(0, 250) : null;
      const { data: app } = await supabaseAdmin
        .from("courier_applications")
        .select("id, user_id")
        .eq("id", id)
        .maybeSingle();
      if (!app) throw new Error("Candidatura não encontrada");
      await supabaseAdmin
        .from("courier_applications")
        .update({
          status: decisao,
          analise_observacao: nota,
          analisado_em: new Date().toISOString(),
          analisado_por: admin.id,
        })
        .eq("id", id);
      await supabaseAdmin
        .from("courier_application_events")
        .insert({ application_id: id, autor_id: admin.id, status: decisao, nota });
      if (decisao === "aprovado") await setProfileFlags(app.user_id, { tipo: "ambos", suspenso: false, bloqueado: false });
      if (decisao === "reprovado") await setProfileFlags(app.user_id, { tipo: "cliente" });
      await log(admin, `Candidatura marcada como ${decisao}`, "candidatura", id);
      return { ok: true };
    }
    case "courier_suspender":
      await setProfileFlags(id, { suspenso: true });
      await log(admin, "Suspendeu entregador", "entregador", id);
      return { ok: true };
    case "courier_reativar":
      await setProfileFlags(id, { suspenso: false, bloqueado: false });
      await log(admin, "Reativou entregador", "entregador", id);
      return { ok: true };

    // ---- pedidos
    case "order_status": {
      const status = typeof p["status"] === "string" ? p["status"] : "";
      await supabaseAdmin
        .from("orders")
        .update({ status: status as never, atualizado_em: new Date().toISOString() })
        .eq("id", id);
      await log(admin, `Alterou status do pedido para ${status}`, "pedido", id);
      return { ok: true };
    }
    case "order_encerrar":
      await supabaseAdmin.from("orders").update({ status: "confirmado" as never }).eq("id", id);
      await log(admin, "Encerrou pedido", "pedido", id);
      return { ok: true };
    case "order_cancelar":
      await supabaseAdmin.from("orders").update({ status: "cancelado" as never }).eq("id", id);
      await log(admin, "Cancelou pedido", "pedido", id);
      return { ok: true };
    case "order_reabrir":
      await supabaseAdmin
        .from("orders")
        .update({ status: "aguardando_entregador" as never, entregador_id: null })
        .eq("id", id);
      await log(admin, "Reabriu pedido", "pedido", id);
      return { ok: true };
    case "order_excluir":
      await supabaseAdmin.from("messages").delete().eq("order_id", id);
      await supabaseAdmin.from("payments").delete().eq("order_id", id);
      await supabaseAdmin.from("reviews").delete().eq("order_id", id);
      await supabaseAdmin.from("order_events").delete().eq("order_id", id);
      await supabaseAdmin.from("order_attachments").delete().eq("order_id", id);
      await supabaseAdmin.from("orders").delete().eq("id", id);
      await log(admin, "Excluiu pedido", "pedido", id);
      return { ok: true };

    // ---- avisos
    case "aviso_criar": {
      const titulo = typeof p["titulo"] === "string" ? p["titulo"].slice(0, 120) : "";
      const mensagem = typeof p["mensagem"] === "string" ? p["mensagem"].slice(0, 800) : "";
      const publico = ["todos", "clientes", "entregadores"].includes(String(p["publico"]))
        ? String(p["publico"])
        : "todos";
      if (!titulo || !mensagem) throw new Error("Preencha título e mensagem");
      await supabaseAdmin.from("announcements").insert({ titulo, mensagem, publico, criado_por: admin.id });
      await log(admin, `Criou aviso "${titulo}"`, "aviso");
      return { ok: true };
    }
    case "aviso_toggle":
      await supabaseAdmin.from("announcements").update({ ativo: p["ativo"] === true }).eq("id", id);
      await log(admin, "Alterou visibilidade de aviso", "aviso", id);
      return { ok: true };
    case "aviso_excluir":
      await supabaseAdmin.from("announcements").delete().eq("id", id);
      await log(admin, "Excluiu aviso", "aviso", id);
      return { ok: true };

    // ---- conteúdo
    case "conteudo_salvar": {
      const chave = typeof p["chave"] === "string" ? p["chave"].slice(0, 60) : "";
      const titulo = typeof p["titulo"] === "string" ? p["titulo"].slice(0, 120) : chave;
      const corpo = typeof p["corpo"] === "string" ? p["corpo"].slice(0, 20000) : "";
      if (!chave) throw new Error("Conteúdo inválido");
      await supabaseAdmin
        .from("content_blocks")
        .upsert({ chave, titulo, corpo, atualizado_por: admin.id }, { onConflict: "chave" });
      await log(admin, `Alterou o conteúdo "${titulo}"`, "conteudo", chave);
      return { ok: true };
    }

    // ---- configurações
    case "config_salvar": {
      const valor = isRecord(p["valor"]) ? p["valor"] : {};
      await supabaseAdmin.from("app_settings").upsert({ chave: "geral", valor: valor as never }, { onConflict: "chave" });
      await log(admin, "Atualizou as configurações gerais", "config", "geral", valor);
      return { ok: true };
    }

    // ---- laboratório
    case "lab_usuario": {
      const u = await criarUsuarioTeste("cliente", "Cliente teste");
      await log(admin, "Criou usuário de teste", "teste", u.id);
      return { ok: true, mensagem: `Cliente de teste criado (${u.email})` };
    }
    case "lab_entregador": {
      const u = await criarUsuarioTeste("entregador", "Entregador teste");
      await supabaseAdmin.from("courier_applications").insert({
        user_id: u.id,
        nome_completo: "[TESTE] Entregador",
        cpf: "00000000000",
        telefone: "11999999999",
        transporte: "moto",
        dias_semana: ["seg", "ter"],
        horarios: ["manha"],
        status: "pendente",
        bairro: "Centro",
        cidade: "São Paulo",
        estado: "SP",
      } as never);
      await log(admin, "Criou entregador de teste", "teste", u.id);
      return { ok: true, mensagem: "Entregador de teste criado com candidatura pendente" };
    }
    case "lab_pedido": {
      const cliente = await pickTeste("cliente");
      if (!cliente) throw new Error("Crie um usuário de teste primeiro");
      const { error } = await supabaseAdmin.from("orders").insert({
        cliente_id: cliente.id,
        categoria: "livre" as never,
        descricao: "[TESTE] Pedido fictício",
        endereco_entrega: "Rua de teste, 100",
        bairro: "Centro",
        valor_produto: 0,
        valor_frete: 15,
        taxa_servico: 0,
        valor_estimado_min: 15,
        valor_estimado_max: 15,
        status: "aguardando_entregador" as never,
        teste: true,
      } as never);
      if (error) throw error;
      await log(admin, "Criou pedido de teste", "teste");
      return { ok: true, mensagem: "Pedido de teste criado" };
    }
    case "lab_simular_entrega": {
      const { data: order } = await supabaseAdmin
        .from("orders")
        .select("id, cliente_id")
        .eq("teste", true)
        .neq("status", "confirmado")
        .limit(1)
        .maybeSingle();
      if (!order) throw new Error("Nenhum pedido de teste disponível");
      const entregador = await pickTeste("entregador");
      await supabaseAdmin
        .from("orders")
        .update({
          status: "confirmado" as never,
          entregador_id: entregador?.id ?? null,
          aceito_em: new Date().toISOString(),
        })
        .eq("id", order.id);
      await log(admin, "Simulou entrega concluída", "teste", order.id);
      return { ok: true, mensagem: "Entrega simulada" };
    }
    case "lab_avaliacao": {
      const { data: order } = await supabaseAdmin
        .from("orders")
        .select("id, cliente_id, entregador_id")
        .eq("teste", true)
        .not("entregador_id", "is", null)
        .limit(1)
        .maybeSingle();
      if (!order?.entregador_id) throw new Error("Simule uma entrega concluída antes");
      await supabaseAdmin.from("reviews").insert({
        order_id: order.id,
        reviewer_id: order.cliente_id,
        reviewee_id: order.entregador_id,
        nota: 5,
        comentario: "[TESTE] Avaliação fictícia",
      } as never);
      await log(admin, "Criou avaliação de teste", "teste", order.id);
      return { ok: true, mensagem: "Avaliação de teste criada" };
    }
    case "lab_conversa": {
      const { data: order } = await supabaseAdmin
        .from("orders")
        .select("id, cliente_id, entregador_id")
        .eq("teste", true)
        .limit(1)
        .maybeSingle();
      if (!order) throw new Error("Crie um pedido de teste primeiro");
      const linhas = [
        { sender: order.cliente_id, texto: "[TESTE] Oi, consegue pegar meu pedido?" },
        { sender: order.entregador_id ?? order.cliente_id, texto: "[TESTE] Consigo sim, já estou indo!" },
      ];
      for (const l of linhas) {
        await supabaseAdmin.from("messages").insert({ order_id: order.id, sender_id: l.sender, texto: l.texto } as never);
      }
      await log(admin, "Simulou conversa de teste", "teste", order.id);
      return { ok: true, mensagem: "Conversa simulada" };
    }
    case "lab_aprovar_entregador": {
      const { data: app } = await supabaseAdmin
        .from("courier_applications")
        .select("id, user_id")
        .eq("status", "pendente")
        .order("criado_em", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!app) throw new Error("Nenhuma candidatura pendente");
      await supabaseAdmin
        .from("courier_applications")
        .update({ status: "aprovado", analisado_em: new Date().toISOString(), analisado_por: admin.id })
        .eq("id", app.id);
      await setProfileFlags(app.user_id, { tipo: "ambos" });
      await log(admin, "Simulou aprovação de entregador", "teste", app.id);
      return { ok: true, mensagem: "Entregador aprovado" };
    }
    case "lab_limpar": {
      const { data: testOrders } = await supabaseAdmin.from("orders").select("id").eq("teste", true);
      for (const o of testOrders ?? []) {
        await supabaseAdmin.from("messages").delete().eq("order_id", o.id);
        await supabaseAdmin.from("reviews").delete().eq("order_id", o.id);
        await supabaseAdmin.from("payments").delete().eq("order_id", o.id);
        await supabaseAdmin.from("order_events").delete().eq("order_id", o.id);
        await supabaseAdmin.from("order_attachments").delete().eq("order_id", o.id);
      }
      await supabaseAdmin.from("orders").delete().eq("teste", true);
      const { data: testUsers } = await supabaseAdmin.from("profiles").select("id").eq("teste", true);
      for (const u of testUsers ?? []) {
        await supabaseAdmin.from("courier_applications").delete().eq("user_id", u.id);
        await supabaseAdmin.auth.admin.deleteUser(u.id).catch(() => undefined);
        await supabaseAdmin.from("profiles").delete().eq("id", u.id);
      }
      await log(admin, "Limpou os dados de teste", "teste");
      return { ok: true, mensagem: "Dados de teste removidos" };
    }
    default:
      throw new Error("Ação inválida");
  }
}

export async function adminMutateFor(context: AuthContext, acao: string, payload: Record<string, unknown>) {
  const admin = await currentAdmin(context);
  return mutate(admin, acao, payload);
}

export { count };
