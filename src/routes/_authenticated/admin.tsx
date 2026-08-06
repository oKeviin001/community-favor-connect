import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { useUser } from "@/lib/use-user";
import { STATUS_LABEL, formatBRL } from "@/lib/order-helpers";
import { toast } from "sonner";
import { Shield, Users, Package, AlertTriangle } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Painel administrativo — Pede pro Kevin" },
      { name: "description", content: "Modere pedidos, disputas e usuários da comunidade." },
      { property: "og:title", content: "Painel administrativo — Pede pro Kevin" },
      { property: "og:description", content: "Modere pedidos, disputas e usuários da comunidade." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Admin,
});

interface OrderRow { id: string; descricao: string; loja: string | null; status: string; total: string | number | null; criado_em: string }
interface DisputeRow { id: string; order_id: string; motivo: string; descricao: string | null; status: string; resposta_admin: string | null; criado_em: string }
interface ProfileRow { id: string; nome: string; telefone: string | null; bairro: string | null; tipo: string; bloqueado: boolean; suspenso: boolean; total_entregas: number | null; nota_media: number | null }

type Tab = "pedidos" | "disputas" | "usuarios";

function Admin() {
  const { isAdmin, loading: userLoading } = useUser();
  const [tab, setTab] = useState<Tab>("pedidos");
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [disputes, setDisputes] = useState<DisputeRow[]>([]);
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);

  const load = useCallback(async () => {
    const [o, d, p] = await Promise.all([
      supabase.from("orders").select("id, descricao, loja, status, total, criado_em").order("criado_em", { ascending: false }).limit(50),
      supabase.from("disputes").select("id, order_id, motivo, descricao, status, resposta_admin, criado_em").order("criado_em", { ascending: false }).limit(50),
      supabase.from("profiles").select("id, nome, telefone, bairro, tipo, bloqueado, suspenso, total_entregas, nota_media").order("criado_em", { ascending: false }).limit(100),
    ]);
    setOrders((o.data as OrderRow[]) ?? []);
    setDisputes((d.data as DisputeRow[]) ?? []);
    setProfiles((p.data as ProfileRow[]) ?? []);
  }, []);

  useEffect(() => {
    if (isAdmin) load();
  }, [isAdmin, load]);

  if (userLoading) {
    return (
      <AppShell>
        <div className="min-h-screen flex items-center justify-center">
          <div className="size-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </AppShell>
    );
  }

  if (!isAdmin) {
    return (
      <AppShell>
        <div className="p-8 text-center space-y-3">
          <Shield size={28} className="mx-auto text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Área restrita à moderação.</p>
          <Link to="/home" className="text-primary text-sm font-semibold">Voltar ao início</Link>
        </div>
      </AppShell>
    );
  }

  async function resolverDisputa(d: DisputeRow, status: string) {
    const resposta = window.prompt("Resposta para as partes (opcional):", d.resposta_admin ?? "");
    const { error } = await supabase
      .from("disputes")
      .update({ status, resposta_admin: resposta?.slice(0, 1000) || null, atualizado_em: new Date().toISOString() })
      .eq("id", d.id);
    if (error) return toast.error(error.message);
    toast.success("Disputa atualizada");
    load();
  }

  async function toggleFlag(p: ProfileRow, field: "bloqueado" | "suspenso") {
    const patch =
      field === "bloqueado" ? { bloqueado: !p.bloqueado } : { suspenso: !p.suspenso };
    const { error } = await supabase.from("profiles").update(patch).eq("id", p.id);
    if (error) return toast.error(error.message);
    load();
  }

  const abertas = disputes.filter((d) => d.status === "aberta").length;

  return (
    <AppShell>
      <header className="px-6 pt-10 pb-4">
        <p className="text-[11px] uppercase tracking-wider text-accent font-medium">Moderação</p>
        <h1 className="text-2xl font-semibold">Painel administrativo</h1>
      </header>

      <div className="px-6 mb-4 flex flex-wrap gap-2">
        <Link to="/transferencia" className="h-9 px-3 rounded-2xl bg-primary text-primary-foreground text-xs font-semibold inline-flex items-center">
          Transferência
        </Link>
        <Link to="/termos" className="h-9 px-3 rounded-2xl bg-card ring-1 ring-black/5 text-xs font-semibold inline-flex items-center">
          Termos de Uso
        </Link>
        <Link to="/privacidade" className="h-9 px-3 rounded-2xl bg-card ring-1 ring-black/5 text-xs font-semibold inline-flex items-center">
          Privacidade
        </Link>
      </div>

      <div className="px-6 grid grid-cols-3 gap-2 mb-5">
        <Stat icon={<Package size={14} />} label="Pedidos" value={orders.length} />
        <Stat icon={<AlertTriangle size={14} />} label="Disputas" value={abertas} />
        <Stat icon={<Users size={14} />} label="Usuários" value={profiles.length} />
      </div>

      <div className="px-6 flex gap-2 mb-4">
        {(["pedidos", "disputas", "usuarios"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 h-10 rounded-2xl text-xs font-semibold capitalize ring-1 ${
              tab === t ? "bg-primary text-primary-foreground ring-primary" : "bg-card ring-black/5"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="px-6 pb-28 space-y-3">
        {tab === "pedidos" &&
          orders.map((o) => (
            <Link
              key={o.id}
              to="/pedidos/$id"
              params={{ id: o.id }}
              className="block bg-card border border-border rounded-2xl p-4"
            >
              <div className="flex justify-between gap-3">
                <p className="text-sm font-semibold truncate">{o.loja || o.descricao}</p>
                <span className="text-xs font-medium text-accent shrink-0">{formatBRL(o.total)}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {STATUS_LABEL[o.status] ?? o.status} · {new Date(o.criado_em).toLocaleString("pt-BR")}
              </p>
            </Link>
          ))}

        {tab === "disputas" && disputes.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8">Nenhuma disputa registrada.</p>
        )}
        {tab === "disputas" &&
          disputes.map((d) => (
            <div key={d.id} className="bg-card border border-border rounded-2xl p-4 space-y-2">
              <div className="flex justify-between gap-2">
                <p className="text-sm font-semibold">{d.motivo}</p>
                <span className="text-[11px] uppercase text-accent">{d.status}</span>
              </div>
              {d.descricao && <p className="text-xs text-muted-foreground">{d.descricao}</p>}
              <Link to="/pedidos/$id" params={{ id: d.order_id }} className="text-xs text-primary font-semibold">
                Ver pedido
              </Link>
              <div className="flex gap-2 pt-1">
                <button onClick={() => resolverDisputa(d, "em_analise")} className="flex-1 h-9 rounded-xl bg-secondary text-xs font-medium">
                  Em análise
                </button>
                <button onClick={() => resolverDisputa(d, "resolvida")} className="flex-1 h-9 rounded-xl bg-primary text-primary-foreground text-xs font-medium">
                  Resolver
                </button>
              </div>
            </div>
          ))}

        {tab === "usuarios" &&
          profiles.map((p) => (
            <div key={p.id} className="bg-card border border-border rounded-2xl p-4 space-y-2">
              <div className="flex justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-semibold truncate">{p.nome}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {p.tipo} · {p.bairro ?? "sem bairro"} · {p.telefone ?? "sem telefone"}
                  </p>
                </div>
                <span className="text-xs text-muted-foreground shrink-0">
                  ★ {(p.nota_media ?? 0).toFixed(1)} · {p.total_entregas ?? 0}
                </span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => toggleFlag(p, "suspenso")}
                  className={`flex-1 h-9 rounded-xl text-xs font-medium ring-1 ${p.suspenso ? "bg-accent/10 text-accent ring-accent/20" : "bg-secondary ring-black/5"}`}
                >
                  {p.suspenso ? "Reativar" : "Suspender"}
                </button>
                <button
                  onClick={() => toggleFlag(p, "bloqueado")}
                  className={`flex-1 h-9 rounded-xl text-xs font-medium ring-1 ${p.bloqueado ? "bg-destructive/10 text-destructive ring-destructive/20" : "bg-secondary ring-black/5"}`}
                >
                  {p.bloqueado ? "Desbloquear" : "Bloquear"}
                </button>
              </div>
            </div>
          ))}
      </div>
    </AppShell>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="bg-card border border-border rounded-2xl p-3">
      <div className="flex items-center gap-1 text-muted-foreground text-[10px] uppercase tracking-wider">
        {icon} {label}
      </div>
      <p className="text-xl font-semibold mt-1">{value}</p>
    </div>
  );
}
