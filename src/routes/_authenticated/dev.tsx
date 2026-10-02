import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { toast } from "sonner";
import { deleteDevOrder, listDevData, updateDevOrderStatus } from "@/lib/dev-actions.functions";
import {
  isGodMode,
  setGodMode,
  loadOverrides,
  saveOverrides,
  DEFAULT_OVERRIDES,
  type Overrides,
} from "@/lib/dev-mode";
import { CandidaturasAdmin } from "@/components/CandidaturasAdmin";
import {
  AdminAuditoria,
  AdminAvisos,
  AdminConfig,
  AdminConteudo,
  AdminDashboard,
  AdminEntregadores,
  AdminLaboratorio,
  AdminPedidos,
  AdminRelatorios,
  AdminUsuarios,
} from "@/components/AdminCentral";
import { CATEGORIAS_BASE, STATUS_LABEL, formatBRL } from "@/lib/order-helpers";
import { ChevronLeft, ClipboardCheck, Trash2, Wand2 } from "lucide-react";
import { SystemAuditReports } from "@/components/SystemAuditReports";
import { SystemMaintenanceLog } from "@/components/SystemMaintenanceLog";
import { NotificationTestPanel } from "@/components/NotificationTestPanel";

export const Route = createFileRoute("/_authenticated/dev")({
  ssr: false,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    const user = data.user;
    if (!user) throw redirect({ to: "/auth" });
    const { data: isAdmin } = await supabase.rpc("is_admin", { _user_id: user.id });
    if (!isAdmin) throw redirect({ to: "/home" });
  },
  head: () => ({
    meta: [
      { title: "Modo Dev — Pede pro Kevin" },
      { name: "description", content: "Painel interno de testes e manutenção do Pede pro Kevin." },
      { property: "og:title", content: "Modo Dev — Pede pro Kevin" },
      { property: "og:description", content: "Painel interno de testes e manutenção do Pede pro Kevin." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Dev,
});

interface OrderRow {
  id: string;
  cliente_id: string;
  entregador_id: string | null;
  categoria: string;
  descricao: string;
  status: string;
  valor_produto: number | null;
  criado_em: string;
}
interface ProfileRow {
  id: string;
  nome: string;
  tipo: string;
  bairro: string | null;
}

const STATUSES = Object.keys(STATUS_LABEL);

type TabId =
  | "dashboard"
  | "usuarios"
  | "entregadores"
  | "apps"
  | "pedidos"
  | "avisos"
  | "conteudo"
  | "ajustes"
  | "notificacoes"
  | "lab"
  | "relatorios"
  | "auditoria"
  | "auditoriasSistema"
  | "registroAlteracoes"
  | "legado"
  | "legadoPedidos"
  | "legadoUsuarios";

const TABS: { id: TabId; label: string }[] = [
  { id: "dashboard", label: "Painel" },
  { id: "usuarios", label: "Usuários" },
  { id: "entregadores", label: "Entregadores" },
  { id: "apps", label: "Candidaturas" },
  { id: "pedidos", label: "Pedidos" },
  { id: "avisos", label: "Avisos" },
  { id: "conteudo", label: "Conteúdo" },
  { id: "ajustes", label: "Configurações" },
  { id: "notificacoes", label: "Notificações" },
  { id: "lab", label: "Laboratório" },
  { id: "relatorios", label: "Relatórios" },
  { id: "auditoria", label: "Auditoria" },
  { id: "auditoriasSistema", label: "Auditorias do Sistema" },
  { id: "registroAlteracoes", label: "Registro de Alterações do Sistema" },
  { id: "legado", label: "Testes (antigo)" },
  { id: "legadoPedidos", label: "Pedidos (antigo)" },
  { id: "legadoUsuarios", label: "Usuários (antigo)" },
];

function Dev() {
  const listDevDataFn = useServerFn(listDevData);
  const deleteDevOrderFn = useServerFn(deleteDevOrder);
  const updateDevOrderStatusFn = useServerFn(updateDevOrderStatus);
  const [god, setGod] = useState(isGodMode());
  const [ov, setOv] = useState<Overrides>(() => loadOverrides());
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [me, setMe] = useState<string>("");
  const [tab, setTab] = useState<TabId>("dashboard");

  async function reload() {
    const { data: u } = await supabase.auth.getUser();
    setMe(u.user?.id ?? "");
    try {
      const data = await listDevDataFn();
      setOrders(data.orders as OrderRow[]);
      setProfiles(data.profiles as ProfileRow[]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível carregar o Modo Deus");
    }
  }
  useEffect(() => {
    reload();
  }, []);

  function updateOv(patch: Partial<Overrides>) {
    const next = { ...ov, ...patch };
    setOv(next);
    saveOverrides(next);
  }

  async function changeStatus(id: string, status: string) {
    try {
      await updateDevOrderStatusFn({ data: { id, status } });
      toast.success("Status atualizado");
      reload();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível atualizar");
    }
  }

  async function deleteOrder(id: string) {
    if (!confirm("Apagar este pedido?")) return;
    try {
      await deleteDevOrderFn({ data: { id } });
      toast.success("Apagado");
      reload();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível apagar");
    }
  }

  async function wipeMine() {
    if (!me) return;
    if (!confirm("Apagar TODOS os pedidos do seu usuário?")) return;
    const mine = orders.filter((o) => o.cliente_id === me || o.entregador_id === me);
    try {
      for (const o of mine) {
        await deleteDevOrderFn({ data: { id: o.id } });
      }
      toast.success(`${mine.length} pedidos apagados`);
      reload();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível apagar tudo");
    }
  }

  async function fakeOrder() {
    if (!me) return;
    const { data, error } = await supabase
      .from("orders")
      .insert({
        cliente_id: me,
        categoria: "livre" as never,
        descricao: "Pedido de teste (dev) — " + new Date().toLocaleTimeString(),
        endereco_entrega: "Rua de teste, 100",
        valor_produto: 25,
        valor_frete: 8,
        taxa_servico: 3,
        status: "aguardando_entregador",
      })
      .select("id")
      .single();
    if (error) return toast.error(error.message);
    await supabase.from("payments").insert({
      order_id: data.id,
      valor: 36,
      status: "depositado",
    });
    toast.success("Pedido fake criado");
    reload();
  }

  return (
    <AppShell>
      <header className="px-6 pt-10 pb-4 flex items-center gap-3">
        <Link to="/home" className="size-10 rounded-full bg-secondary flex items-center justify-center">
          <ChevronLeft size={20} />
        </Link>
        <div className="flex-1">
          <p className="text-[10px] uppercase tracking-wider text-accent font-semibold">Kevin</p>
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <Wand2 size={20} /> Modo Deus
          </h1>
        </div>
      </header>

      <div className="px-6 mb-4">
        <button
          onClick={() => {
            const v = !god;
            setGod(v);
            setGodMode(v);
          }}
          className={`w-full h-12 rounded-2xl text-sm font-semibold ring-1 ${
            god ? "bg-primary text-primary-foreground ring-primary" : "bg-card ring-black/5"
          }`}
        >
          God Mode: {god ? "LIGADO (validações desativadas)" : "desligado"}
        </button>
      </div>

      <div className="px-6 mb-4">
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`shrink-0 h-9 px-3 rounded-full text-xs font-medium border ${
                tab === t.id
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card border-border text-muted-foreground"
              }`}
            >
              {t.id === "auditoriasSistema" && <ClipboardCheck size={16} strokeWidth={2.5} className="mr-1.5 text-emerald-500" />}
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="px-6 pb-8">
        {tab === "dashboard" && <AdminDashboard />}
        {tab === "usuarios" && <AdminUsuarios />}
        {tab === "entregadores" && <AdminEntregadores onVerCandidatura={() => setTab("apps")} />}
        {tab === "pedidos" && <AdminPedidos />}
        {tab === "avisos" && <AdminAvisos />}
        {tab === "conteudo" && <AdminConteudo />}
        {tab === "ajustes" && <AdminConfig />}
        {tab === "notificacoes" && <NotificationTestPanel />}
        {tab === "lab" && <AdminLaboratorio />}
        {tab === "relatorios" && <AdminRelatorios />}
        {tab === "auditoria" && <AdminAuditoria />}
        {tab === "auditoriasSistema" && <SystemAuditReports />}
        {tab === "registroAlteracoes" && <SystemMaintenanceLog />}
      </div>

      {tab === "legado" && (
        <div className="px-6 space-y-5 pb-8">
          <Section title="Taxas">
            <NumField
              label="Frete %"
              value={ov.fretePct * 100}
              onChange={(v) => updateOv({ fretePct: v / 100 })}
            />
            <NumField label="Frete mínimo (R$)" value={ov.freteMin} onChange={(v) => updateOv({ freteMin: v })} />
            <NumField
              label="Taxa plataforma %"
              value={ov.taxaPct * 100}
              onChange={(v) => updateOv({ taxaPct: v / 100 })}
            />
            <NumField label="Taxa mínima (R$)" value={ov.taxaMin} onChange={(v) => updateOv({ taxaMin: v })} />
            <button
              onClick={() => {
                saveOverrides(DEFAULT_OVERRIDES);
                setOv(DEFAULT_OVERRIDES);
              }}
              className="text-xs text-muted-foreground underline"
            >
              Restaurar padrão
            </button>
          </Section>

          <Section title="Categorias (rótulos)">
            {CATEGORIAS_BASE.map((c) => {
              const cur = ov.categoriaLabels[c.id] ?? {};
              return (
                <div key={c.id} className="flex gap-2 items-center">
                  <input
                    className="w-14 h-11 rounded-xl bg-card border border-border text-center text-lg"
                    value={cur.emoji ?? c.emoji}
                    onChange={(e) =>
                      updateOv({
                        categoriaLabels: {
                          ...ov.categoriaLabels,
                          [c.id]: { ...cur, emoji: e.target.value },
                        },
                      })
                    }
                  />
                  <input
                    className="flex-1 h-11 px-3 rounded-xl bg-card border border-border"
                    value={cur.label ?? c.label}
                    onChange={(e) =>
                      updateOv({
                        categoriaLabels: {
                          ...ov.categoriaLabels,
                          [c.id]: { ...cur, label: e.target.value },
                        },
                      })
                    }
                  />
                </div>
              );
            })}
          </Section>

          <Section title="Ações rápidas">
            <button onClick={fakeOrder} className="w-full h-11 rounded-xl bg-card border border-border text-sm font-medium">
              + Criar pedido fake
            </button>
            <button
              onClick={wipeMine}
              className="w-full h-11 rounded-xl bg-destructive/10 text-destructive ring-1 ring-destructive/20 text-sm font-medium"
            >
              Apagar todos os meus pedidos
            </button>
          </Section>
        </div>
      )}

      {tab === "apps" && (
        <div className="pb-4">
          <div className="px-6 pb-3">
            <h2 className="text-base font-semibold">Candidaturas de entregadores</h2>
            <p className="text-[12px] text-muted-foreground">Gerencie e aprove as candidaturas recebidas.</p>
          </div>
          <CandidaturasAdmin />
        </div>
      )}

      {tab === "legadoPedidos" && (
        <div className="px-6 space-y-2 pb-8">
          {orders.map((o) => (
            <div key={o.id} className="bg-card border border-border rounded-2xl p-4 space-y-2">
              <div className="flex items-start gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{o.descricao}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {o.categoria} · {formatBRL(o.valor_produto ?? 0)} · {new Date(o.criado_em).toLocaleString("pt-BR")}
                  </p>
                  <p className="text-[10px] text-muted-foreground font-mono truncate">{o.id}</p>
                </div>
                <button
                  onClick={() => deleteOrder(o.id)}
                  className="size-9 rounded-lg bg-destructive/10 text-destructive flex items-center justify-center"
                >
                  <Trash2 size={14} />
                </button>
              </div>
              <select
                value={o.status}
                onChange={(e) => changeStatus(o.id, e.target.value)}
                className="w-full h-9 px-2 rounded-lg bg-secondary text-xs"
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {STATUS_LABEL[s]}
                  </option>
                ))}
              </select>
              <Link
                to="/pedidos/$id"
                params={{ id: o.id }}
                className="block text-center text-xs text-primary font-medium"
              >
                Abrir →
              </Link>
            </div>
          ))}
          {orders.length === 0 && <p className="text-sm text-muted-foreground text-center py-6">Nenhum pedido</p>}
        </div>
      )}

      {tab === "legadoUsuarios" && (
        <div className="px-6 space-y-2 pb-8">
          {profiles.map((p) => (
            <div key={p.id} className="bg-card border border-border rounded-2xl p-4">
              <p className="text-sm font-medium">{p.nome} {p.id === me && <span className="text-primary text-[10px]">(você)</span>}</p>
              <p className="text-[11px] text-muted-foreground">
                {p.tipo} · {p.bairro ?? "sem bairro"}
              </p>
              <p className="text-[10px] text-muted-foreground font-mono truncate">{p.id}</p>
            </div>
          ))}
        </div>
      )}
    </AppShell>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <h2 className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">{title}</h2>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function NumField({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <label className="flex items-center gap-3">
      <span className="flex-1 text-sm">{label}</span>
      <input
        type="number"
        step="0.01"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-28 h-10 px-3 rounded-xl bg-card border border-border text-right"
      />
    </label>
  );
}
