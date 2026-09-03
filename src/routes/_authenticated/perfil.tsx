import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { toast } from "sonner";
import {
  Bell,
  Bike,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  FileText,
  HelpCircle,
  LifeBuoy,
  LogOut,
  MessageCircle,
  Package,
  Settings,
  Shield,
  ShieldCheck,
  Star,
  User as UserIcon,
  Wand2,
} from "lucide-react";
import { useUser } from "@/lib/use-user";

export const Route = createFileRoute("/_authenticated/perfil")({
  head: () => ({
    meta: [
      { title: "Minha conta — Pede pro Kevin" },
      { name: "description", content: "Central da sua conta: pedidos, entregas, avaliações e configurações." },
      { property: "og:title", content: "Minha conta — Pede pro Kevin" },
      { property: "og:description", content: "Central da sua conta: pedidos, entregas, avaliações e configurações." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Perfil,
});

interface P {
  id: string;
  nome: string;
  telefone: string | null;
  bairro: string | null;
  tipo: string;
  nota_media: number | null;
  total_avaliacoes: number | null;
  total_entregas?: number | null;
  suspenso?: boolean;
  bloqueado?: boolean;
}

interface Candidatura {
  status: string;
  transporte: string | null;
  cidade: string | null;
  analisado_em: string | null;
  criado_em: string | null;
}

const MODOS = [
  { id: "cliente", label: "Quero pedir favores", hint: "Você cria pedidos" },
  { id: "entregador", label: "Quero fazer entregas", hint: "Você aceita pedidos" },
  { id: "ambos", label: "Quero utilizar ambos", hint: "Pede e entrega" },
] as const;

function Perfil() {
  const navigate = useNavigate();
  const { isDev, isAdmin, reload } = useUser();
  const [p, setP] = useState<P | null>(null);
  const [cand, setCand] = useState<Candidatura | null>(null);
  const [stats, setStats] = useState({ pedidos: 0, entregas: 0, avaliacoes: 0, conversas: 0 });
  const [nome, setNome] = useState("");
  const [tel, setTel] = useState("");
  const [bairro, setBairro] = useState("");
  const [tipo, setTipo] = useState<"cliente" | "entregador" | "ambos">("cliente");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      const uid = u.user.id;
      const [{ data }, { data: app }, pedidos, entregas, avaliacoes, msgs] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", uid).maybeSingle(),
        supabase
          .from("courier_applications")
          .select("status, transporte, cidade, analisado_em, criado_em")
          .eq("user_id", uid)
          .maybeSingle(),
        supabase.from("orders").select("id", { count: "exact", head: true }).eq("cliente_id", uid),
        supabase
          .from("orders")
          .select("id", { count: "exact", head: true })
          .eq("entregador_id", uid)
          .in("status", ["entregue", "confirmado"]),
        supabase.from("reviews").select("id", { count: "exact", head: true }).eq("reviewee_id", uid),
        supabase.from("messages").select("order_id").eq("sender_id", uid),
      ]);
      if (data) {
        setP(data as P);
        setNome(data.nome ?? "");
        setTel(data.telefone ?? "");
        setBairro(data.bairro ?? "");
        setTipo((data.tipo as "cliente" | "entregador" | "ambos") ?? "cliente");
      }
      setCand((app as Candidatura | null) ?? null);
      setStats({
        pedidos: pedidos.count ?? 0,
        entregas: entregas.count ?? 0,
        avaliacoes: avaliacoes.count ?? 0,
        conversas: new Set((msgs.data ?? []).map((m) => m.order_id)).size,
      });
      setLoading(false);
    })();
  }, []);

  if (loading) {
    return (
      <AppShell>
        <div className="min-h-screen flex items-center justify-center">
          <div className="size-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </AppShell>
    );
  }

  async function salvar() {
    if (!p) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ nome, telefone: tel || null, bairro: bairro || null, tipo })
      .eq("id", p.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    reload();
    toast.success("Perfil atualizado");
  }

  async function sair() {
    await supabase.auth.signOut();
    navigate({ to: "/auth" });
  }

  const statusConta = (() => {
    if (p?.suspenso || p?.bloqueado)
      return { label: "Conta suspensa", dot: "bg-destructive", cls: "bg-destructive/10 text-destructive border-destructive/20" };
    if (cand?.status === "aprovado")
      return { label: "Entregador aprovado", dot: "bg-primary", cls: "bg-primary/10 text-primary border-primary/20" };
    if (cand && cand.status !== "reprovado")
      return { label: "Entregador em análise", dot: "bg-warning", cls: "bg-warning/15 text-warning-foreground border-warning/30" };
    return { label: "Cliente ativo", dot: "bg-success", cls: "bg-success/10 text-success border-success/20" };
  })();

  return (
    <AppShell>
      <header className="px-6 pt-10 pb-4">
        <p className="label-kicker">Minha conta</p>
        <h1 className="text-[26px] font-semibold leading-tight mt-1">Perfil</h1>
      </header>

      <div className="px-6 space-y-5 pb-4">
        {/* 1. Cabeçalho premium */}
        <section className="surface p-5 fade-rise">
          <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-4">
            <div className="size-16 shrink-0 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-2xl font-bold text-primary">
              {nome.charAt(0).toUpperCase() || "?"}
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-lg truncate">{nome || "Sem nome"}</p>
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground mt-0.5">
                <Star size={14} className="fill-accent text-accent shrink-0" />
                <span className="font-medium text-foreground">{(p?.nota_media ?? 0).toFixed(1)}</span>
                <span className="truncate">· {p?.total_avaliacoes ?? 0} avaliações</span>
              </div>
              <span
                className={`mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${statusConta.cls}`}
              >
                <span className={`size-1.5 rounded-full ${statusConta.dot}`} />
                {statusConta.label}
              </span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-border">
            <MiniStat label="Pedidos realizados" value={stats.pedidos} />
            <MiniStat label="Entregas concluídas" value={p?.total_entregas ?? stats.entregas} />
          </div>
        </section>

        {/* 2. Resumo da conta */}
        <section>
          <h2 className="label-kicker mb-2">Resumo da conta</h2>
          <div className="grid grid-cols-2 gap-3">
            <StatCard icon={<Package size={16} />} label="Pedidos" value={stats.pedidos} />
            <StatCard icon={<Bike size={16} />} label="Entregas" value={p?.total_entregas ?? stats.entregas} />
            <StatCard icon={<Star size={16} />} label="Avaliações" value={stats.avaliacoes} />
            <StatCard icon={<MessageCircle size={16} />} label="Conversas" value={stats.conversas} />
          </div>
        </section>

        {/* 3. Área do entregador */}
        <section>
          <h2 className="label-kicker mb-2">Área do entregador</h2>
          <div className="surface p-5">
            {!cand && (
              <>
                <p className="font-semibold text-sm">Quer fazer entregas?</p>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  Ganhe dinheiro realizando favores e entregas na sua região.
                </p>
                <Link
                  to="/entregador/cadastro"
                  className="btn-base btn-primary-solid w-full h-12 rounded-2xl mt-4 flex items-center justify-center gap-2 text-sm font-semibold"
                >
                  <Bike size={16} /> Candidatar-se
                </Link>
              </>
            )}
            {cand && cand.status === "aprovado" && (
              <>
                <p className="font-semibold text-sm flex items-center gap-2">
                  <ShieldCheck size={16} className="text-primary" /> Entregador aprovado
                </p>
                <div className="mt-3 space-y-1.5 text-sm">
                  <Row label="Transporte" value={cand.transporte ?? "—"} />
                  <Row label="Cidade" value={cand.cidade ?? "—"} />
                  <Row label="Aprovado em" value={fmtData(cand.analisado_em)} />
                </div>
                <Link
                  to="/entregador"
                  className="btn-base btn-primary-solid w-full h-12 rounded-2xl mt-4 flex items-center justify-center gap-2 text-sm font-semibold"
                >
                  Abrir painel do entregador
                </Link>
              </>
            )}
            {cand && cand.status === "reprovado" && (
              <>
                <p className="font-semibold text-sm text-destructive">Candidatura não aprovada</p>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  Você pode revisar seus dados e enviar novamente.
                </p>
                <Link
                  to="/entregador/cadastro"
                  className="btn-base btn-soft w-full h-12 rounded-2xl mt-4 flex items-center justify-center text-sm font-semibold"
                >
                  Revisar candidatura
                </Link>
              </>
            )}
            {cand && cand.status !== "aprovado" && cand.status !== "reprovado" && (
              <>
                <p className="font-semibold text-sm">Candidatura enviada</p>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  Em análise — sua candidatura está sendo revisada.
                </p>
                <span className="mt-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border bg-warning/15 text-warning-foreground border-warning/30">
                  <span className="size-1.5 rounded-full bg-warning" /> Em análise
                </span>
                <p className="text-[11px] text-muted-foreground mt-3">Enviada em {fmtData(cand.criado_em)}</p>
              </>
            )}
          </div>
        </section>

        {/* 4-6. Navegação */}
        <section className="surface overflow-hidden divide-y divide-border">
          <NavItem to="/pedidos" icon={<ClipboardList size={18} />} title="Meus pedidos" desc="Pedidos ativos e histórico" />
          <NavItem
            to="/pedidos"
            icon={<MessageCircle size={18} />}
            title="Conversas"
            desc="Conversas abertas e anteriores"
            badge={stats.conversas || undefined}
          />
          <ActionItem
            icon={<Bell size={18} />}
            title="Notificações"
            desc="Avisos sobre seus pedidos"
            onClick={() => toast.info("Você não tem notificações pendentes")}
          />
        </section>

        {/* 7. Conta */}
        <Accordion
          id="conta"
          open={open}
          setOpen={setOpen}
          icon={<UserIcon size={18} />}
          title="Conta"
          desc="Nome, telefone, endereço e preferências"
        >
          <div className="space-y-4 pt-1">
            <Field label="Nome">
              <input value={nome} onChange={(e) => setNome(e.target.value)} className="field-input" />
            </Field>
            <Field label="Telefone (WhatsApp)">
              <input value={tel} onChange={(e) => setTel(e.target.value)} className="field-input" placeholder="(11) 90000-0000" />
              <p className="text-[11px] text-muted-foreground mt-1">
                Usado para abrir a conversa no WhatsApp durante o pedido.
              </p>
            </Field>
            <Field label="Bairro">
              <input value={bairro} onChange={(e) => setBairro(e.target.value)} className="field-input" placeholder="Vila Mariana" />
            </Field>
            <Field label="Cidade">
              <input value={cand?.cidade ?? ""} readOnly disabled className="field-input opacity-70" placeholder="Informada na candidatura" />
            </Field>
            <Field label="Modo de utilização">
              <div className="space-y-2">
                {MODOS.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => setTipo(m.id)}
                    className={`w-full flex items-center gap-3 px-4 h-14 rounded-2xl text-left border ${
                      tipo === m.id ? "bg-primary/10 border-primary" : "bg-card border-border"
                    }`}
                  >
                    <span
                      className={`size-5 rounded-full border-2 shrink-0 flex items-center justify-center ${
                        tipo === m.id ? "border-primary" : "border-border"
                      }`}
                    >
                      {tipo === m.id && <span className="size-2.5 rounded-full bg-primary" />}
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className="block text-sm font-medium">{m.label}</span>
                      <span className="block text-xs text-muted-foreground">{m.hint}</span>
                    </span>
                  </button>
                ))}
              </div>
            </Field>
            <button
              onClick={salvar}
              disabled={saving}
              className="btn-base btn-primary-solid w-full h-12 rounded-2xl text-sm font-semibold"
            >
              {saving ? "Salvando..." : "Salvar alterações"}
            </button>
          </div>
        </Accordion>

        {/* 8. Configurações */}
        <Accordion
          id="config"
          open={open}
          setOpen={setOpen}
          icon={<Settings size={18} />}
          title="Configurações"
          desc="Segurança, notificações, privacidade e aparência"
        >
          <div className="divide-y divide-border">
            {["Segurança", "Notificações", "Privacidade", "Aparência"].map((s) => (
              <button
                key={s}
                onClick={() => toast.info(`${s}: em breve`)}
                className="w-full flex items-center justify-between py-3 text-sm"
              >
                <span>{s}</span>
                <ChevronRight size={16} className="text-muted-foreground" />
              </button>
            ))}
          </div>
        </Accordion>

        {/* 9. Ajuda e termos */}
        <Accordion
          id="ajuda"
          open={open}
          setOpen={setOpen}
          icon={<HelpCircle size={18} />}
          title="Ajuda e Termos"
          desc="Central de ajuda, termos de uso e políticas"
        >
          <div className="divide-y divide-border">
            <button
              onClick={() => toast.info("Central de ajuda: em breve")}
              className="w-full flex items-center justify-between py-3 text-sm"
            >
              <span className="flex items-center gap-2">
                <LifeBuoy size={16} className="text-muted-foreground" /> Central de ajuda
              </span>
              <ChevronRight size={16} className="text-muted-foreground" />
            </button>
            <Link to="/termos" className="w-full flex items-center justify-between py-3 text-sm">
              <span className="flex items-center gap-2">
                <FileText size={16} className="text-muted-foreground" /> Termos de uso
              </span>
              <ChevronRight size={16} className="text-muted-foreground" />
            </Link>
            <Link to="/privacidade" className="w-full flex items-center justify-between py-3 text-sm">
              <span className="flex items-center gap-2">
                <Shield size={16} className="text-muted-foreground" /> Política de privacidade
              </span>
              <ChevronRight size={16} className="text-muted-foreground" />
            </Link>
          </div>
        </Accordion>

        {/* 10. Modo Deus */}
        {(isAdmin || isDev) && (
          <section className="rounded-3xl border border-primary/25 bg-primary/[0.06] p-5">
            <p className="text-sm font-bold flex items-center gap-2 text-primary">
              <Wand2 size={16} /> MODO DEUS
            </p>
            <p className="text-xs text-muted-foreground mt-1">Painel administrativo integrado.</p>
            <div className="grid grid-cols-2 gap-2 mt-4">
              <AdminTile to="/admin" label="Usuários" />
              <AdminTile to="/admin" label="Pedidos" />
              <AdminTile to="/dev" label="Entregadores" />
              <AdminTile to="/dev" label="Candidaturas" />
              <AdminTile to="/dev" label="Estatísticas" />
              <AdminTile to="/dev" label="Pedido fake" />
            </div>
            <button
              onClick={() => toast.info("Notificações administrativas: em breve")}
              className="btn-base btn-soft w-full h-11 rounded-2xl mt-2 text-sm font-semibold"
            >
              Notificações administrativas
            </button>
            <Link
              to="/dev"
              className="btn-base btn-primary-solid w-full h-12 rounded-2xl mt-2 flex items-center justify-center text-sm font-semibold"
            >
              Abrir painel completo
            </Link>
          </section>
        )}

        <button
          onClick={sair}
          className="w-full h-12 bg-card border border-border rounded-2xl text-destructive text-sm font-medium flex items-center justify-center gap-2"
        >
          <LogOut size={16} /> Sair
        </button>
      </div>
    </AppShell>
  );
}

function fmtData(v: string | null | undefined) {
  if (!v) return "—";
  return new Date(v).toLocaleDateString("pt-BR");
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="min-w-0">
      <p className="text-xl font-bold leading-none">{value}</p>
      <p className="text-[11px] text-muted-foreground mt-1 truncate">{label}</p>
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: ReactNode; label: string; value: number }) {
  return (
    <div className="card-flat p-4">
      <span className="text-muted-foreground">{icon}</span>
      <p className="text-2xl font-bold leading-none mt-2">{value}</p>
      <p className="text-[11px] text-muted-foreground mt-1">{label}</p>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-muted-foreground text-xs">{label}</span>
      <span className="font-medium text-sm text-right break-words">{value}</span>
    </div>
  );
}

function NavItem({
  to,
  icon,
  title,
  desc,
  badge,
}: {
  to: string;
  icon: ReactNode;
  title: string;
  desc: string;
  badge?: number;
}) {
  return (
    <Link to={to} className="flex items-center gap-3 px-5 py-4">
      <span className="text-muted-foreground shrink-0">{icon}</span>
      <span className="flex-1 min-w-0">
        <span className="block text-sm font-semibold truncate">{title}</span>
        <span className="block text-xs text-muted-foreground truncate">{desc}</span>
      </span>
      {badge ? (
        <span className="shrink-0 min-w-5 h-5 px-1.5 rounded-full bg-primary text-primary-foreground text-[11px] font-bold flex items-center justify-center">
          {badge}
        </span>
      ) : null}
      <ChevronRight size={16} className="text-muted-foreground shrink-0" />
    </Link>
  );
}

function ActionItem({
  icon,
  title,
  desc,
  onClick,
}: {
  icon: ReactNode;
  title: string;
  desc: string;
  onClick: () => void;
}) {
  return (
    <button onClick={onClick} className="w-full flex items-center gap-3 px-5 py-4 text-left">
      <span className="text-muted-foreground shrink-0">{icon}</span>
      <span className="flex-1 min-w-0">
        <span className="block text-sm font-semibold truncate">{title}</span>
        <span className="block text-xs text-muted-foreground truncate">{desc}</span>
      </span>
      <ChevronRight size={16} className="text-muted-foreground shrink-0" />
    </button>
  );
}

function Accordion({
  id,
  open,
  setOpen,
  icon,
  title,
  desc,
  children,
}: {
  id: string;
  open: string | null;
  setOpen: (v: string | null) => void;
  icon: ReactNode;
  title: string;
  desc: string;
  children: ReactNode;
}) {
  const isOpen = open === id;
  return (
    <section className="surface overflow-hidden">
      <button
        onClick={() => setOpen(isOpen ? null : id)}
        className="w-full flex items-center gap-3 px-5 py-4 text-left"
        aria-expanded={isOpen}
      >
        <span className="text-muted-foreground shrink-0">{icon}</span>
        <span className="flex-1 min-w-0">
          <span className="block text-sm font-semibold truncate">{title}</span>
          <span className="block text-xs text-muted-foreground truncate">{desc}</span>
        </span>
        <ChevronDown
          size={16}
          className={`text-muted-foreground shrink-0 transition-transform ${isOpen ? "rotate-180" : ""}`}
        />
      </button>
      {isOpen && <div className="px-5 pb-5 border-t border-border pt-4">{children}</div>}
    </section>
  );
}

function AdminTile({ to, label }: { to: string; label: string }) {
  return (
    <Link
      to={to}
      className="h-11 rounded-2xl bg-card border border-border text-xs font-semibold flex items-center justify-center text-center px-2"
    >
      {label}
    </Link>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <label className="label-kicker">{label}</label>
      <div className="mt-2">{children}</div>
    </div>
  );
}
