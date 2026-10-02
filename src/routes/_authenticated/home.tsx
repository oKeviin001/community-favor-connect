import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { CATEGORIAS, STATUS_LABEL, statusIndex, TIMELINE_STEPS } from "@/lib/order-helpers";
import { ArrowUpRight, ChevronRight, Plus, Sparkles } from "lucide-react";
import { ComoFunciona } from "@/components/ComoFunciona";
import { useAppConfig } from "@/lib/app-config";
import heroImg from "@/assets/hero-community.png";

export const Route = createFileRoute("/_authenticated/home")({
  head: () => ({ meta: [
    { title: "Início — Pede pro Kevin" },
    { name: "description", content: "Faça pedidos e acompanhe entregas na sua vizinhança." },
  ]}),
  component: Home,
});

interface Profile { nome: string; bairro: string | null; tipo: string }
interface OrderRow { id: string; descricao: string; loja: string | null; status: string; categoria: string; criado_em: string; }

function Home() {
  const { config, avisos } = useAppConfig("clientes");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [active, setActive] = useState<OrderRow | null>(null);

  useEffect(() => {
    let mounted = true;
    async function load() {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user || !mounted) return;
      const [{ data: prof }, { data: mine }] = await Promise.all([
        supabase.from("profiles").select("nome, bairro, tipo").eq("id", userData.user.id).maybeSingle(),
        supabase.from("orders").select("id, descricao, loja, status, categoria, criado_em").eq("cliente_id", userData.user.id)
          .not("status", "in", "(entregue,confirmado,cancelado)").order("criado_em", { ascending: false }).limit(1),
      ]);
      if (!mounted) return;
      setProfile(prof as Profile | null);
      setActive((mine?.[0] as OrderRow) ?? null);
    }
    load();
    const ch = supabase.channel("home-feed").on("postgres_changes", { event: "*", schema: "public", table: "orders" }, load).subscribe();
    return () => { mounted = false; supabase.removeChannel(ch); };
  }, []);

  const firstName = profile?.nome?.split(" ")[0] ?? "";
  const activeStep = active ? statusIndex(active.status) : -1;

  return (
    <AppShell>
      <main className="px-5 pt-5 pb-4">
        <header className="flex items-center justify-between gap-4 py-2 motion-fade-in">
          <div className="min-w-0">
            <p className="label-kicker mb-1.5">{profile?.bairro ?? "Sua vizinhança"}</p>
            <h1 className="text-[29px] font-semibold leading-[1.05] text-foreground">Olá, {firstName || "vizinho"}.</h1>
          </div>
          <Link to="/perfil" aria-label="Abrir perfil" className="shrink-0 size-11 rounded-2xl bg-foreground text-background flex items-center justify-center text-sm font-bold shadow-soft motion-interactive">
            {firstName.charAt(0).toUpperCase() || "?"}
          </Link>
        </header>

        <div className="mt-4 flex items-center justify-between gap-3">
          <ComoFunciona />
          <span className="text-[11px] text-muted-foreground font-medium">Comunidade local</span>
        </div>

        {(config.avisoHome || avisos.length > 0) && (
          <section className="mt-5 space-y-2">
            {config.avisoHome && <div className="rounded-2xl border border-warning/25 bg-warning/10 p-4 motion-fade-in"><p className="text-sm leading-relaxed">{config.avisoHome}</p></div>}
            {avisos.map((a) => <div key={a.id} className="rounded-2xl border border-border bg-card p-4 motion-fade-in"><p className="text-sm font-semibold">{a.titulo}</p><p className="text-sm text-muted-foreground mt-1 leading-relaxed">{a.mensagem}</p></div>)}
          </section>
        )}

        <section className="mt-5">
          <div className="relative overflow-hidden rounded-[1.75rem] bg-foreground text-background shadow-raised">
            <div className="absolute -right-16 -top-16 size-44 rounded-full bg-primary/20 blur-2xl" />
            <div className="absolute -left-20 bottom-[-5rem] size-44 rounded-full bg-accent/20 blur-2xl" />
            <div className="relative p-5 pb-4">
              <div className="flex items-start justify-between gap-4">
                <div className="max-w-[18rem]">
                  <div className="inline-flex items-center gap-1.5 rounded-full border border-background/15 bg-background/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em]"><Sparkles size={12} /> Pede pro Kevin</div>
                  <h2 className="mt-4 text-[25px] font-semibold leading-[1.08]">Precisou de algo? <span className="text-background/60">Pede.</span></h2>
                  <p className="mt-3 text-sm leading-relaxed text-background/70">Diga o que você precisa e alguém da sua região pode ajudar.</p>
                </div>
                <ArrowUpRight className="shrink-0 text-background/45" size={21} />
              </div>
            </div>
            <div className="relative mx-3 overflow-hidden rounded-[1.25rem] bg-background/10 border border-background/10">
              <img src={heroImg} alt="Vizinhos ajudando vizinhos com compras e entregas" width={1024} height={768} loading="lazy" className="w-full h-32 object-contain opacity-95" />
            </div>
            <div className="relative p-4">
              {config.pausarPedidos ? (
                <p className="rounded-xl border border-warning/25 bg-warning/10 p-3 text-sm text-background">Novos pedidos estão temporariamente pausados. Tente novamente mais tarde.</p>
              ) : (
                <Link to="/novo-pedido" className="btn-base w-full bg-background text-foreground shadow-none motion-interactive"><Plus size={18} /> Fazer novo pedido</Link>
              )}
            </div>
          </div>
        </section>

        {active && (
          <section className="mt-7 motion-fade-in">
            <div className="flex items-end justify-between mb-3 px-1">
              <div><p className="label-kicker">Acompanhe</p><h2 className="text-lg font-semibold mt-1">Pedido em andamento</h2></div>
              <Link to="/pedidos" className="text-xs font-semibold text-primary motion-interactive">Ver todos</Link>
            </div>
            <Link to="/pedidos/$id" params={{ id: active.id }} className="block">
              <div className="surface p-5 motion-lift">
                <div className="flex justify-between items-start gap-3">
                  <div className="min-w-0"><p className="text-sm font-semibold truncate">{active.loja || active.descricao}</p><p className="text-xs text-muted-foreground mt-1">{active.descricao}</p></div>
                  <span className="shrink-0 bg-secondary text-foreground border border-border px-2.5 py-1 rounded-full text-[10px] font-bold">{STATUS_LABEL[active.status]}</span>
                </div>
                <div className="relative flex justify-between mt-7 px-1">
                  <div className="absolute top-2 left-1 right-1 h-px bg-border" />
                  <div className="absolute top-2 left-1 h-px bg-primary transition-all" style={{ width: `${Math.max(0, activeStep) / (TIMELINE_STEPS.length - 1) * 100}%` }} />
                  {TIMELINE_STEPS.map((step, i) => <div key={step} className="relative z-10 flex flex-col items-center gap-2"><div className={`size-4 rounded-full ring-4 ring-card ${i <= activeStep ? "bg-primary" : "bg-border"}`} /><span className={`text-[9px] font-semibold uppercase ${i <= activeStep ? "text-primary" : "text-muted-foreground"}`}>{STATUS_LABEL[step].split(" ")[0]}</span></div>)}
                </div>
                <div className="mt-5 pt-4 border-t border-border/60 flex items-center gap-3"><div className="flex-1"><p className="text-sm font-semibold">Abrir pedido</p><p className="text-xs text-muted-foreground">Ver detalhes e acompanhar</p></div><ChevronRight size={18} className="text-muted-foreground" /></div>
              </div>
            </Link>
          </section>
        )}

        <section className="mt-8">
          <div className="flex items-end justify-between mb-3 px-1">
            <div><p className="label-kicker">Atalhos</p><h2 className="text-lg font-semibold mt-1">O que você precisa?</h2></div>
            <Link to="/novo-pedido" className="text-xs font-semibold text-primary motion-interactive">Novo pedido</Link>
          </div>
          <div className="grid grid-cols-3 gap-2.5">
            {CATEGORIAS.slice(0, 6).map((c) => (
              <Link key={c.id} to="/novo-pedido" search={{ categoria: c.id }} className="group flex flex-col items-center gap-2.5 p-3.5 surface aspect-square justify-center motion-lift">
                <div className={`size-11 ${c.tint} border border-border rounded-2xl flex items-center justify-center text-xl shadow-sm transition-transform duration-200 group-hover:scale-105`}>{c.emoji}</div>
                <span className="text-[11px] font-bold text-center leading-tight">{c.label}</span>
              </Link>
            ))}
          </div>
        </section>
      </main>
    </AppShell>
  );
}
