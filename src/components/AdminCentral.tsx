import { useCallback, useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { Loader2, RefreshCw, Search } from "lucide-react";
import { adminMutate, adminQuery } from "@/lib/admin-central.functions";
import { STATUS_LABEL } from "@/lib/order-helpers";

/* ---------------------------------------------------------------- shared */

export function useAdmin() {
  const query = useServerFn(adminQuery);
  const mutate = useServerFn(adminMutate);
  return { query, mutate };
}

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`bg-card border border-border rounded-2xl p-4 ${className}`}>{children}</div>;
}

function Chips({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { id: string; label: string }[];
}) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
      {options.map((o) => (
        <button
          key={o.id}
          onClick={() => onChange(o.id)}
          className={`shrink-0 h-9 px-3 rounded-full text-xs font-medium border ${
            value === o.id ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border text-muted-foreground"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function ActionBtn({
  label,
  onClick,
  tone = "soft",
}: {
  label: string;
  onClick: () => void;
  tone?: "soft" | "danger" | "primary";
}) {
  const cls =
    tone === "danger"
      ? "bg-destructive/10 text-destructive border-destructive/20"
      : tone === "primary"
        ? "bg-primary text-primary-foreground border-primary"
        : "bg-secondary text-foreground border-transparent";
  return (
    <button onClick={onClick} className={`h-8 px-3 rounded-lg text-[11px] font-medium border ${cls}`}>
      {label}
    </button>
  );
}

function Loading() {
  return (
    <div className="flex justify-center py-10 text-muted-foreground">
      <Loader2 className="animate-spin" size={20} />
    </div>
  );
}

function useView<T>(view: string, filtro: string, busca: string) {
  const { query } = useAdmin();
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = (await query({ data: { view, filtro, busca } })) as T;
      setData(res);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível carregar");
    } finally {
      setLoading(false);
    }
  }, [query, view, filtro, busca]);
  useEffect(() => {
    load();
  }, [load]);
  return { data, loading, reload: load };
}

function SearchBox({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <label className="flex items-center gap-2 h-11 px-3 rounded-xl bg-card border border-border">
      <Search size={16} className="text-muted-foreground" />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Buscar por nome"
        className="flex-1 bg-transparent outline-none text-sm"
      />
    </label>
  );
}

async function run(fn: (args: { data: { acao: string; payload: Record<string, unknown> } }) => Promise<unknown>, acao: string, payload: Record<string, unknown>, reload: () => void) {
  try {
    const res = (await fn({ data: { acao, payload } })) as { mensagem?: string };
    toast.success(res?.mensagem ?? "Feito");
    reload();
  } catch (e) {
    toast.error(e instanceof Error ? e.message : "Não foi possível concluir");
  }
}

/* ------------------------------------------------------------- dashboard */

interface Totais {
  totais: {
    usuarios: number;
    entregadores: number;
    pedidos: number;
    ativos: number;
    concluidos: number;
    cancelados: number;
    novosUsuarios: number;
    novosPedidos: number;
    novosEntregadores: number;
    candidaturasPendentes: number;
  };
}

export function AdminDashboard() {
  const { data, loading, reload } = useView<Totais>("dashboard", "todos", "");
  if (loading && !data) return <Loading />;
  const t = data?.totais;
  if (!t) return null;
  const cards: { emoji: string; label: string; value: number }[] = [
    { emoji: "👤", label: "Usuários", value: t.usuarios },
    { emoji: "🚴", label: "Entregadores", value: t.entregadores },
    { emoji: "📦", label: "Pedidos", value: t.pedidos },
    { emoji: "🟢", label: "Pedidos ativos", value: t.ativos },
    { emoji: "✅", label: "Concluídos", value: t.concluidos },
    { emoji: "❌", label: "Cancelados", value: t.cancelados },
    { emoji: "📈", label: "Usuários hoje", value: t.novosUsuarios },
    { emoji: "📈", label: "Entregadores hoje", value: t.novosEntregadores },
    { emoji: "📈", label: "Pedidos hoje", value: t.novosPedidos },
  ];
  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <button onClick={reload} className="h-8 px-3 rounded-lg bg-secondary text-xs flex items-center gap-1">
          <RefreshCw size={12} /> Atualizar
        </button>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {cards.map((c) => (
          <Card key={c.label} className="text-center">
            <p className="text-lg">{c.emoji}</p>
            <p className="text-xl font-semibold">{c.value}</p>
            <p className="text-[10px] text-muted-foreground leading-tight">{c.label}</p>
          </Card>
        ))}
      </div>
      {t.candidaturasPendentes > 0 && (
        <Card className="bg-warning/10 border-warning/25">
          <p className="text-sm font-medium">🟡 {t.candidaturasPendentes} candidatura(s) aguardando análise</p>
        </Card>
      )}
    </div>
  );
}

/* --------------------------------------------------------------- usuários */

interface UserRow {
  id: string;
  nome: string;
  telefone: string | null;
  bairro: string | null;
  tipo: string;
  criado_em: string;
  bloqueado: boolean;
  suspenso: boolean;
  teste: boolean;
  admin: boolean;
}

export function AdminUsuarios() {
  const [filtro, setFiltro] = useState("todos");
  const [busca, setBusca] = useState("");
  const { data, loading, reload } = useView<{ users: UserRow[] }>("usuarios", filtro, busca);
  const { mutate } = useAdmin();
  return (
    <div className="space-y-3">
      <SearchBox value={busca} onChange={setBusca} />
      <Chips
        value={filtro}
        onChange={setFiltro}
        options={[
          { id: "todos", label: "Todos" },
          { id: "clientes", label: "Clientes" },
          { id: "entregadores", label: "Entregadores" },
          { id: "admins", label: "Administradores" },
        ]}
      />
      {loading && !data ? (
        <Loading />
      ) : (
        (data?.users ?? []).map((u) => (
          <Card key={u.id} className="space-y-2">
            <div>
              <p className="text-sm font-medium">
                {u.nome}{" "}
                {u.admin && <span className="text-[10px] text-primary font-semibold">ADMIN</span>}
                {u.teste && <span className="text-[10px] text-warning font-semibold"> TESTE</span>}
              </p>
              <p className="text-[11px] text-muted-foreground">
                {u.tipo} · {u.bairro ?? "sem bairro"} · {u.telefone ?? "sem WhatsApp"}
              </p>
              <p className="text-[10px] text-muted-foreground">
                Cadastro: {new Date(u.criado_em).toLocaleDateString("pt-BR")}
                {u.suspenso && " · 🟡 suspenso"}
                {u.bloqueado && " · 🔴 bloqueado"}
              </p>
            </div>
            <div className="flex flex-wrap gap-1.5">
              <ActionBtn label="Aprovar" tone="primary" onClick={() => run(mutate, "user_aprovar", { id: u.id }, reload)} />
              <ActionBtn label="Suspender" onClick={() => run(mutate, "user_suspender", { id: u.id }, reload)} />
              <ActionBtn label="Bloquear" tone="danger" onClick={() => run(mutate, "user_bloquear", { id: u.id }, reload)} />
              <ActionBtn
                label="Excluir"
                tone="danger"
                onClick={() => {
                  if (confirm(`Excluir ${u.nome}? Esta ação não pode ser desfeita.`)) {
                    run(mutate, "user_excluir", { id: u.id }, reload);
                  }
                }}
              />
              {u.tipo === "cliente" ? (
                <ActionBtn label="Tornar entregador" onClick={() => run(mutate, "user_tornar_entregador", { id: u.id }, reload)} />
              ) : (
                <ActionBtn label="Remover entregador" onClick={() => run(mutate, "user_remover_entregador", { id: u.id }, reload)} />
              )}
              {u.admin ? (
                <ActionBtn label="Remover admin" onClick={() => run(mutate, "user_remover_admin", { id: u.id }, reload)} />
              ) : (
                <ActionBtn label="Tornar admin" onClick={() => run(mutate, "user_tornar_admin", { id: u.id }, reload)} />
              )}
            </div>
          </Card>
        ))
      )}
      {!loading && (data?.users ?? []).length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-6">Nenhum usuário</p>
      )}
    </div>
  );
}

/* ----------------------------------------------------------- entregadores */

interface CourierRow {
  applicationId: string;
  userId: string;
  nome: string;
  bairro: string | null;
  telefone: string | null;
  nota: number | null;
  entregas: number;
  statusCandidatura: string;
  estado: string;
  criado_em: string;
  transporte: string;
}

const ESTADO_LABEL: Record<string, string> = {
  aprovado: "🟢 Ativo",
  pendente: "🟡 Aguardando aprovação",
  reprovado: "🔴 Reprovado",
  suspenso: "⏸️ Suspenso",
};

export function AdminEntregadores({ onVerCandidatura }: { onVerCandidatura: () => void }) {
  const [filtro, setFiltro] = useState("todos");
  const [busca, setBusca] = useState("");
  const { data, loading, reload } = useView<{ couriers: CourierRow[] }>("entregadores", filtro, busca);
  const { mutate } = useAdmin();
  return (
    <div className="space-y-3">
      <SearchBox value={busca} onChange={setBusca} />
      <Chips
        value={filtro}
        onChange={setFiltro}
        options={[
          { id: "todos", label: "Todos" },
          { id: "ativos", label: "Ativos" },
          { id: "pendentes", label: "Aguardando" },
          { id: "reprovados", label: "Reprovados" },
          { id: "suspensos", label: "Suspensos" },
        ]}
      />
      {loading && !data ? (
        <Loading />
      ) : (
        (data?.couriers ?? []).map((c) => (
          <Card key={c.applicationId} className="space-y-2">
            <div>
              <p className="text-sm font-medium">{c.nome}</p>
              <p className="text-[11px] text-muted-foreground">
                {c.bairro ?? "sem bairro"} · {c.transporte} · ⭐ {c.nota ?? "—"} · {c.entregas} entregas
              </p>
              <p className="text-[11px]">{ESTADO_LABEL[c.estado] ?? c.estado}</p>
            </div>
            <div className="flex flex-wrap gap-1.5">
              <ActionBtn
                label="Aprovar"
                tone="primary"
                onClick={() => run(mutate, "courier_decidir", { id: c.applicationId, decisao: "aprovado" }, reload)}
              />
              <ActionBtn
                label="Reprovar"
                tone="danger"
                onClick={() => run(mutate, "courier_decidir", { id: c.applicationId, decisao: "reprovado" }, reload)}
              />
              <ActionBtn label="Suspender" onClick={() => run(mutate, "courier_suspender", { id: c.userId }, reload)} />
              <ActionBtn label="Reativar" onClick={() => run(mutate, "courier_reativar", { id: c.userId }, reload)} />
              <ActionBtn label="Ver candidatura" onClick={onVerCandidatura} />
            </div>
          </Card>
        ))
      )}
      {!loading && (data?.couriers ?? []).length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-6">Nenhum entregador</p>
      )}
    </div>
  );
}

/* ---------------------------------------------------------------- pedidos */

interface OrderRow {
  id: string;
  clienteNome: string;
  entregadorNome: string | null;
  categoria: string;
  descricao: string;
  status: string;
  criado_em: string;
  bairro: string | null;
  teste: boolean;
}

export function AdminPedidos() {
  const [filtro, setFiltro] = useState("todos");
  const [busca, setBusca] = useState("");
  const { data, loading, reload } = useView<{ orders: OrderRow[] }>("pedidos", filtro, busca);
  const { mutate } = useAdmin();
  return (
    <div className="space-y-3">
      <SearchBox value={busca} onChange={setBusca} />
      <Chips
        value={filtro}
        onChange={setFiltro}
        options={[
          { id: "todos", label: "Todos" },
          { id: "aguardando", label: "Aguardando" },
          { id: "aceitos", label: "Aceitos" },
          { id: "andamento", label: "Em andamento" },
          { id: "concluidos", label: "Concluídos" },
          { id: "cancelados", label: "Cancelados" },
        ]}
      />
      {loading && !data ? (
        <Loading />
      ) : (
        (data?.orders ?? []).map((o) => (
          <Card key={o.id} className="space-y-2">
            <div>
              <p className="text-sm font-medium truncate">{o.descricao}</p>
              <p className="text-[11px] text-muted-foreground">
                Cliente: {o.clienteNome} · Entregador: {o.entregadorNome ?? "—"}
              </p>
              <p className="text-[11px] text-muted-foreground">
                {STATUS_LABEL[o.status] ?? o.status} · {new Date(o.criado_em).toLocaleString("pt-BR")}
                {o.teste && " · TESTE"}
              </p>
            </div>
            <select
              value={o.status}
              onChange={(e) => run(mutate, "order_status", { id: o.id, status: e.target.value }, reload)}
              className="w-full h-9 px-2 rounded-lg bg-secondary text-xs"
            >
              {Object.keys(STATUS_LABEL).map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABEL[s]}
                </option>
              ))}
            </select>
            <div className="flex flex-wrap gap-1.5">
              <ActionBtn label="Encerrar" tone="primary" onClick={() => run(mutate, "order_encerrar", { id: o.id }, reload)} />
              <ActionBtn label="Cancelar" onClick={() => run(mutate, "order_cancelar", { id: o.id }, reload)} />
              <ActionBtn label="Reabrir" onClick={() => run(mutate, "order_reabrir", { id: o.id }, reload)} />
              <ActionBtn
                label="Excluir"
                tone="danger"
                onClick={() => {
                  if (confirm("Excluir este pedido?")) run(mutate, "order_excluir", { id: o.id }, reload);
                }}
              />
              <Link to="/pedidos/$id" params={{ id: o.id }} className="h-8 px-3 rounded-lg bg-secondary text-[11px] font-medium flex items-center">
                Abrir
              </Link>
            </div>
          </Card>
        ))
      )}
      {!loading && (data?.orders ?? []).length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-6">Nenhum pedido</p>
      )}
    </div>
  );
}

/* ----------------------------------------------------------------- avisos */

interface AvisoRow {
  id: string;
  titulo: string;
  mensagem: string;
  publico: string;
  ativo: boolean;
  criado_em: string;
}

export function AdminAvisos() {
  const { data, loading, reload } = useView<{ avisos: AvisoRow[] }>("avisos", "todos", "");
  const { mutate } = useAdmin();
  const [titulo, setTitulo] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [publico, setPublico] = useState("todos");
  return (
    <div className="space-y-3">
      <Card className="space-y-2">
        <p className="text-sm font-semibold">Novo aviso</p>
        <input
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
          placeholder="Título"
          className="w-full h-11 px-3 rounded-xl bg-secondary text-sm"
        />
        <textarea
          value={mensagem}
          onChange={(e) => setMensagem(e.target.value)}
          placeholder="Mensagem exibida no aplicativo"
          rows={3}
          className="w-full p-3 rounded-xl bg-secondary text-sm"
        />
        <select value={publico} onChange={(e) => setPublico(e.target.value)} className="w-full h-11 px-3 rounded-xl bg-secondary text-sm">
          <option value="todos">Todos</option>
          <option value="clientes">Apenas clientes</option>
          <option value="entregadores">Apenas entregadores</option>
        </select>
        <button
          onClick={async () => {
            await run(mutate, "aviso_criar", { titulo, mensagem, publico }, reload);
            setTitulo("");
            setMensagem("");
          }}
          className="w-full h-11 rounded-xl bg-primary text-primary-foreground text-sm font-semibold"
        >
          Publicar aviso
        </button>
      </Card>
      {loading && !data ? (
        <Loading />
      ) : (
        (data?.avisos ?? []).map((a) => (
          <Card key={a.id} className="space-y-2">
            <p className="text-sm font-medium">{a.titulo}</p>
            <p className="text-[12px] text-muted-foreground">{a.mensagem}</p>
            <p className="text-[11px] text-muted-foreground">
              Para: {a.publico} · {a.ativo ? "🟢 ativo" : "⚪ oculto"}
            </p>
            <div className="flex gap-1.5">
              <ActionBtn
                label={a.ativo ? "Ocultar" : "Ativar"}
                onClick={() => run(mutate, "aviso_toggle", { id: a.id, ativo: !a.ativo }, reload)}
              />
              <ActionBtn label="Excluir" tone="danger" onClick={() => run(mutate, "aviso_excluir", { id: a.id }, reload)} />
            </div>
          </Card>
        ))
      )}
    </div>
  );
}

/* --------------------------------------------------------------- conteúdo */

const BLOCOS_PADRAO = [
  { chave: "home", titulo: "Texto da Home" },
  { chave: "tutorial", titulo: "Texto do tutorial" },
  { chave: "cadastro_entregador", titulo: "Texto do cadastro de entregadores" },
  { chave: "formulario_perguntas", titulo: "Perguntas do formulário" },
  { chave: "termos", titulo: "Termos de uso" },
  { chave: "privacidade", titulo: "Política de privacidade" },
];

interface BlocoRow {
  chave: string;
  titulo: string;
  corpo: string;
  atualizado_em: string;
}

export function AdminConteudo() {
  const { data, loading, reload } = useView<{ blocos: BlocoRow[] }>("conteudo", "todos", "");
  const { mutate } = useAdmin();
  const [draft, setDraft] = useState<Record<string, string>>({});
  const salvos = new Map((data?.blocos ?? []).map((b) => [b.chave, b]));
  if (loading && !data) return <Loading />;
  return (
    <div className="space-y-3">
      {BLOCOS_PADRAO.map((b) => {
        const atual = draft[b.chave] ?? salvos.get(b.chave)?.corpo ?? "";
        return (
          <Card key={b.chave} className="space-y-2">
            <p className="text-sm font-semibold">{b.titulo}</p>
            <textarea
              value={atual}
              onChange={(e) => setDraft((d) => ({ ...d, [b.chave]: e.target.value }))}
              rows={5}
              className="w-full p-3 rounded-xl bg-secondary text-sm"
              placeholder="Escreva aqui o texto exibido no aplicativo"
            />
            <button
              onClick={() => run(mutate, "conteudo_salvar", { chave: b.chave, titulo: b.titulo, corpo: atual }, reload)}
              className="h-9 px-4 rounded-lg bg-primary text-primary-foreground text-xs font-semibold"
            >
              Salvar
            </button>
          </Card>
        );
      })}
    </div>
  );
}

/* ---------------------------------------------------------- configurações */

interface ConfigShape {
  cadastroEntregadores?: boolean;
  pausarPedidos?: boolean;
  manutencao?: boolean;
  avisoHome?: string;
  limitePedidosUsuario?: number;
  bairrosAtivos?: string[];
}

export function AdminConfig() {
  const { data, loading, reload } = useView<{ config: ConfigShape }>("config", "todos", "");
  const { mutate } = useAdmin();
  const [cfg, setCfg] = useState<ConfigShape | null>(null);
  useEffect(() => {
    if (data?.config) setCfg(data.config);
  }, [data]);
  if (loading && !cfg) return <Loading />;
  const c = cfg ?? {};
  const set = (patch: ConfigShape) => setCfg({ ...c, ...patch });
  const Toggle = ({ label, on, onChange }: { label: string; on: boolean; onChange: (v: boolean) => void }) => (
    <button
      onClick={() => onChange(!on)}
      className={`w-full h-11 px-4 rounded-xl text-sm font-medium flex items-center justify-between border ${
        on ? "bg-primary/10 border-primary/30" : "bg-card border-border"
      }`}
    >
      <span>{label}</span>
      <span className="text-xs">{on ? "ligado" : "desligado"}</span>
    </button>
  );
  return (
    <div className="space-y-3">
      <Toggle
        label="Ativar cadastro de entregadores"
        on={c.cadastroEntregadores !== false}
        onChange={(v) => set({ cadastroEntregadores: v })}
      />
      <Toggle label="Pausar novos pedidos" on={c.pausarPedidos === true} onChange={(v) => set({ pausarPedidos: v })} />
      <Toggle label="Ativar modo manutenção" on={c.manutencao === true} onChange={(v) => set({ manutencao: v })} />
      <Card className="space-y-2">
        <p className="text-sm font-semibold">Aviso na tela inicial</p>
        <textarea
          value={c.avisoHome ?? ""}
          onChange={(e) => set({ avisoHome: e.target.value })}
          rows={2}
          className="w-full p-3 rounded-xl bg-secondary text-sm"
          placeholder="Deixe vazio para não exibir"
        />
      </Card>
      <Card className="space-y-2">
        <p className="text-sm font-semibold">Limite de pedidos por usuário</p>
        <input
          type="number"
          min={0}
          value={c.limitePedidosUsuario ?? 0}
          onChange={(e) => set({ limitePedidosUsuario: Number(e.target.value) })}
          className="w-full h-11 px-3 rounded-xl bg-secondary text-sm"
        />
        <p className="text-[11px] text-muted-foreground">0 = sem limite</p>
      </Card>
      <Card className="space-y-2">
        <p className="text-sm font-semibold">Bairros ativos</p>
        <textarea
          value={(c.bairrosAtivos ?? []).join(", ")}
          onChange={(e) =>
            set({ bairrosAtivos: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })
          }
          rows={2}
          className="w-full p-3 rounded-xl bg-secondary text-sm"
          placeholder="Centro, Jardim, Vila Nova"
        />
        <p className="text-[11px] text-muted-foreground">Vazio = atender todos os bairros</p>
      </Card>
      <button
        onClick={() => run(mutate, "config_salvar", { valor: c as Record<string, unknown> }, reload)}
        className="w-full h-12 rounded-xl bg-primary text-primary-foreground text-sm font-semibold"
      >
        Salvar configurações
      </button>
    </div>
  );
}

/* ------------------------------------------------------------ laboratório */

const LAB_ACOES: { acao: string; label: string }[] = [
  { acao: "lab_usuario", label: "Criar usuário fictício" },
  { acao: "lab_entregador", label: "Criar entregador fictício" },
  { acao: "lab_pedido", label: "Criar pedido fictício" },
  { acao: "lab_simular_entrega", label: "Simular entrega concluída" },
  { acao: "lab_avaliacao", label: "Criar avaliação fictícia" },
  { acao: "lab_conversa", label: "Simular conversa" },
  { acao: "lab_aprovar_entregador", label: "Simular aprovação de entregador" },
];

export function AdminLaboratorio() {
  const { mutate } = useAdmin();
  const noop = () => undefined;
  return (
    <div className="space-y-2">
      <Card className="bg-warning/10 border-warning/25">
        <p className="text-[12px]">
          Tudo criado aqui é marcado como <strong>TESTE</strong> e pode ser apagado de uma vez.
        </p>
      </Card>
      {LAB_ACOES.map((a) => (
        <button
          key={a.acao}
          onClick={() => run(mutate, a.acao, {}, noop)}
          className="w-full h-12 rounded-xl bg-card border border-border text-sm font-medium"
        >
          {a.label}
        </button>
      ))}
      <button
        onClick={() => {
          if (confirm("Apagar todos os dados marcados como teste?")) run(mutate, "lab_limpar", {}, noop);
        }}
        className="w-full h-12 rounded-xl bg-destructive/10 text-destructive border border-destructive/20 text-sm font-semibold"
      >
        Limpar todos os dados de teste
      </button>
    </div>
  );
}

/* ------------------------------------------------------------- relatórios */

interface DiaRow {
  dia: string;
  pedidos: number;
  entregas: number;
  usuarios: number;
  entregadores: number;
}

export function AdminRelatorios() {
  const { data, loading } = useView<{ dias: DiaRow[] }>("relatorios", "todos", "");
  if (loading && !data) return <Loading />;
  const dias = [...(data?.dias ?? [])].reverse();
  return (
    <div className="space-y-2">
      <Card className="grid grid-cols-5 gap-1 text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">
        <span>Dia</span>
        <span className="text-center">Ped.</span>
        <span className="text-center">Entr.</span>
        <span className="text-center">Usu.</span>
        <span className="text-center">Entg.</span>
      </Card>
      {dias.map((d) => (
        <Card key={d.dia} className="grid grid-cols-5 gap-1 text-xs">
          <span>{d.dia.slice(8)}/{d.dia.slice(5, 7)}</span>
          <span className="text-center">{d.pedidos}</span>
          <span className="text-center">{d.entregas}</span>
          <span className="text-center">{d.usuarios}</span>
          <span className="text-center">{d.entregadores}</span>
        </Card>
      ))}
    </div>
  );
}

/* -------------------------------------------------------------- auditoria */

interface LogRow {
  id: string;
  autor_nome: string | null;
  acao: string;
  alvo_tipo: string | null;
  alvo_id: string | null;
  criado_em: string;
}

export function AdminAuditoria() {
  const { data, loading } = useView<{ logs: LogRow[] }>("auditoria", "todos", "");
  if (loading && !data) return <Loading />;
  return (
    <div className="space-y-2">
      {(data?.logs ?? []).map((l) => (
        <Card key={l.id}>
          <p className="text-sm">
            {l.autor_nome ?? "Admin"} — {l.acao}
          </p>
          <p className="text-[11px] text-muted-foreground">
            {new Date(l.criado_em).toLocaleString("pt-BR")}
            {l.alvo_tipo ? ` · ${l.alvo_tipo}` : ""}
            {l.alvo_id ? ` #${l.alvo_id.slice(0, 8)}` : ""}
          </p>
        </Card>
      ))}
      {!loading && (data?.logs ?? []).length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-6">Nenhuma ação registrada</p>
      )}
    </div>
  );
}
