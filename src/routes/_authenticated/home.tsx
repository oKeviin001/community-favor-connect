import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { CATEGORIAS, STATUS_LABEL, statusIndex, TIMELINE_STEPS } from "@/lib/order-helpers";
import { Plus, MessageCircle } from "lucide-react";

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
            <p className="text-accent font-medium text-sm tracking-wide uppercase">
              {profile?.bairro ?? "Sua vizinhança"}
            </p>
            <h1 className="text-2xl font-semibold leading-tight text-foreground text-balance max-w-[20ch]">
              Olá, {firstName || "vizinho"}
            </h1>
          </div>
          <Link
            to="/perfil"
            className="size-12 rounded-full bg-secondary ring-1 ring-black/5 flex items-center justify-center text-lg font-medium text-foreground"
          >
            {firstName.charAt(0).toUpperCase() || "?"}
          </Link>
        </div>
      </header>

      <div className="px-6 py-4">
        <Link
          to="/novo-pedido"
          className="w-full h-16 bg-primary text-primary-foreground rounded-2xl flex items-center justify-center gap-3 shadow-lg shadow-primary/10"
        >
          <div className="size-6 bg-white/20 rounded-full flex items-center justify-center shrink-0">
            <Plus size={16} />
          </div>
          <span className="text-lg font-medium">Fazer novo pedido</span>
        </Link>
      </div>

      {active && (
        <section className="px-6 py-6">
          <Link to="/pedidos/$id" params={{ id: active.id }}>
            <div className="bg-secondary rounded-[20px] p-5 ring-1 ring-black/5">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-base font-semibold">Pedido em andamento</h2>
                  <p className="text-sm text-muted-foreground truncate max-w-[220px]">
                    {active.loja || active.descricao}
                  </p>
                </div>
                <span className="bg-accent/10 text-accent px-3 py-1 rounded-full text-xs font-medium">
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
                        className={`size-4 rounded-full ring-4 ring-secondary ${
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
                <div className="size-10 rounded-full bg-secondary ring-1 ring-black/5 flex items-center justify-center">
                  <MessageCircle size={18} className="text-muted-foreground" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">Abrir pedido</p>
                  <p className="text-xs text-muted-foreground">Ver detalhes e conversar</p>
                </div>
              </div>
            </div>
          </Link>
        </section>
      )}

      <section className="px-6 py-4">
        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-4">
          Categorias
        </h3>
        <div className="grid grid-cols-3 gap-3">
          {CATEGORIAS.slice(0, 6).map((c) => (
            <Link
              key={c.id}
              to="/novo-pedido"
              search={{ categoria: c.id }}
              className="flex flex-col items-center gap-3 p-4 bg-card rounded-2xl ring-1 ring-black/5 aspect-square justify-center"
            >
              <div className={`size-10 ${c.tint} rounded-xl flex items-center justify-center text-2xl`}>
                {c.emoji}
              </div>
              <span className="text-xs font-medium">{c.label}</span>
            </Link>
          ))}
        </div>
      </section>

    </AppShell>
  );
}