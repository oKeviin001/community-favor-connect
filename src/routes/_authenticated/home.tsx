import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { CATEGORIAS, STATUS_LABEL, statusIndex, TIMELINE_STEPS } from "@/lib/order-helpers";
import { Plus, ChevronRight } from "lucide-react";
import { ComoFunciona } from "@/components/ComoFunciona";
import { useAppConfig } from "@/lib/app-config";
import heroImg from "@/assets/hero-community.png";

export const Route = createFileRoute("/_authenticated/home")({
  head: () => ({
    meta: [
      { title: "Início — Pede pro Kevin" },
      { name: "description", content: "Faça pedidos e acompanhe entregas na sua vizinhança." },
      { property: "og:title", content: "Início — Pede pro Kevin" },
      { property: "og:description", content: "Faça pedidos e acompanhe entregas na sua vizinhança." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Home,
});

interface Profile { nome: string; bairro: string | null; tipo: string }
interface OrderRow {
  id: string;
  descricao: string;
  loja: string | null;
  status: string;
  categoria: string;
  criado_em: string;
}

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
        supabase
          .from("orders")
          .select("id, descricao, loja, status, categoria, criado_em")
          .eq("cliente_id", userData.user.id)
          .not("status", "in", "(entregue,confirmado,cancelado)")
          .order("criado_em", { ascending: false })
          .limit(1),
      ]);
      if (!mounted) return;
      setProfile(prof as Profile | null);
      setActive((mine?.[0] as OrderRow) ?? null);
    }
    load();

    const ch = supabase
      .channel("home-feed")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, load)
      .subscribe();
    return () => {
      mounted = false;
      supabase.removeChannel(ch);
    };
  }, []);

  const firstName = profile?.nome?.split(" ")[0] ?? "";
  const activeStep = active ? statusIndex(active.status) : -1;

  return (
    <AppShell>
      <header className="px-6 pt-10 pb-4">
        <div className="flex justify-between items-center">
          <div>
            <p className="text-muted-foreground font-medium text-[11px] tracking-[0.18em] uppercase">
              {profile?.bairro ?? "Sua vizinhança"}
            </p>
            <h1 className="text-[26px] font-semibold leading-tight text-foreground text-balance max-w-[20ch] mt-1">
              Olá, {firstName || "vizinho"}
            </h1>
            <div className="mt-3">
              <ComoFunciona />
            </div>
          </div>
          <Link
            to="/perfil"
            className="size-12 rounded-full bg-secondary border border-border flex items-center justify-center text-base font-semibold text-foreground motion-interactive"
          >
            {firstName.charAt(0).toUpperCase() || "?"}
          </Link>
        </div>
      </header>

      {(config.avisoHome || avisos.length > 0) && (
        <section className="px-6 pb-2 space-y-2">
          {config.avisoHome && (
            <div className="rounded-2xl border border-warning/25 bg-warning/10 p-4 motion-fade-in">
              <p className="text-sm leading-relaxed">{config.avisoHome}</p>
            </div>
          )}
          {avisos.map((a) => (
            <div key={a.id} className="rounded-2xl border border-border bg-card p-4 motion-fade-in">
              <p className="text-sm font-semibold">{a.titulo}</p>
              <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{a.mensagem}</p>
            </div>
          ))}
        </section>
      )}

      <section className="px-6 pt-2">
        <div className="surface overflow-hidden motion-lift">
          <div className="bg-secondary/60 px-5 pt-4">
            <img
              src={heroImg}
              alt="Vizinhos ajudando vizinhos com compras e entregas"
              width={1024}
              height={768}
              loading="lazy"
              className="w-full h-32 object-contain"
            />
          </div>
          <div className="p-5">
            <h2 className="text-base font-semibold">Precisa de alguma coisa?</h2>
            <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
              Descreva o que precisa e diga quanto pretende pagar. Um entregador da região pode aceitar ou negociar com você.
            </p>
            {config.pausarPedidos ? (
              <p className="mt-4 rounded-xl border border-warning/25 bg-warning/10 p-3 text-sm">
                Novos pedidos estão temporariamente pausados. Tente novamente mais tarde.
              </p>
            ) : (
              <Link
                to="/novo-pedido"
                className="btn-base btn-base-active w-full bg-primary text-primary-foreground mt-4 motion-interactive"
              >
                <Plus size={18} /> Fazer novo pedido
              </Link>
            )}
          </div>
        </div>
      </section>

      {active && (
        <section className="px-6 py-6">
          <Link to="/pedidos/$id" params={{ id: active.id }}>
            <div className="surface p-5">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-base font-semibold">Pedido em andamento</h2>
                  <p className="text-sm text-muted-foreground truncate max-w-[220px]">
                    {active.loja || active.descricao}
                  </p>
                </div>
                <span className="bg-secondary text-foreground border border-border px-3 py-1 rounded-full text-[11px] font-semibold">
                  {STATUS_LABEL[active.status]}
                </span>
              </div>
              <div className="relative flex justify-between">
                <div className="absolute top-2 left-0 w-full h-0.5 bg-border" />
                <div
                  className="absolute top-2 left-0 h-0.5 bg-primary transition-all"
                  style={{ width: `${Math.max(0, activeStep) / (TIMELINE_STEPS.length - 1) * 100}%` }}
                />
                {TIMELINE_STEPS.map((step, i) => {
                  const done = i <= activeStep;
                  return (
                    <div key={step} className="relative z-10 flex flex-col items-center gap-2">
                      <div
                        className={`size-4 rounded-full ring-4 ring-card ${
                          done ? "bg-primary" : "bg-border"
                        }`}
                      />
                      <span
                        className={`text-[10px] font-medium uppercase ${
                          done ? "text-primary" : "text-muted-foreground"
                        }`}
                      >
                        {STATUS_LABEL[step].split(" ")[0]}
                      </span>
                    </div>
                  );
                })}
              </div>
              <div className="mt-6 pt-4 border-t border-border/60 flex items-center gap-3">
                <div className="flex-1">
                  <p className="text-sm font-semibold">Abrir pedido</p>
                  <p className="text-xs text-muted-foreground">Ver detalhes e acompanhar</p>
                </div>
                <ChevronRight size={18} className="text-muted-foreground" />
              </div>
            </div>
          </Link>
        </section>
      )}

      <section className="px-6 py-4">
        <h3 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.16em] mb-4">
          Categorias
        </h3>
        <div className="grid grid-cols-3 gap-3">
          {CATEGORIAS.slice(0, 6).map((c) => (
            <Link
              key={c.id}
              to="/novo-pedido"
              search={{ categoria: c.id }}
              className="flex flex-col items-center gap-2.5 p-4 surface aspect-square justify-center motion-lift"
            >
              <div className={`size-10 ${c.tint} border border-border rounded-xl flex items-center justify-center text-xl`}>
                {c.emoji}
              </div>
              <span className="text-xs font-semibold">{c.label}</span>
            </Link>
          ))}
        </div>
      </section>

    </AppShell>
  );
}