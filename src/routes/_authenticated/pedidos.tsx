import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { CATEGORIAS, STATUS_LABEL, formatBRL } from "@/lib/order-helpers";

export const Route = createFileRoute("/_authenticated/pedidos")({
  head: () => ({
    meta: [
      { title: "Meus pedidos — Pede pro Kevin" },
      { name: "description", content: "Acompanhe seus pedidos ativos e o histórico." },
      { property: "og:title", content: "Meus pedidos — Pede pro Kevin" },
      { property: "og:description", content: "Acompanhe seus pedidos ativos e o histórico." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Pedidos,
});

interface Row {
  id: string;
  descricao: string;
  loja: string | null;
  status: string;
  categoria: string;
  total: number | null;
  criado_em: string;
  cliente_id: string;
  entregador_id: string | null;
}

function Pedidos() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function load() {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user || !mounted) return;
      const { data } = await supabase
        .from("orders")
        .select("id, descricao, loja, status, categoria, total, criado_em, cliente_id, entregador_id")
        .eq("cliente_id", u.user.id)
        .order("criado_em", { ascending: false });
      if (!mounted) return;
      setRows(((data as unknown) as Row[]) ?? []);
      setLoading(false);
    }
    load();
    const ch = supabase
      .channel("meus-pedidos")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, load)
      .subscribe();
    return () => {
      mounted = false;
      supabase.removeChannel(ch);
    };
  }, []);

  if (loading) {
    return (
      <AppShell>
        <header className="px-6 pt-10 pb-4">
          <h1 className="text-2xl font-semibold">Meus pedidos</h1>
          <p className="text-sm text-muted-foreground">Carregando...</p>
        </header>
        <div className="px-6 space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-20 bg-card rounded-2xl border border-border animate-pulse" />
          ))}
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <header className="px-6 pt-10 pb-4">
        <h1 className="text-2xl font-semibold">Meus pedidos</h1>
        <p className="text-sm text-muted-foreground">Ativos e histórico</p>
      </header>

      <div className="px-6 space-y-3">
        {rows.length === 0 && (
          <div className="bg-card rounded-2xl border border-border p-8 text-center">
            <p className="text-muted-foreground text-sm">Nenhum pedido ainda.</p>
            <Link to="/novo-pedido" className="mt-4 inline-block text-primary font-semibold text-sm">
              Criar meu primeiro pedido
            </Link>
          </div>
        )}
        {rows.map((o) => (
          <Link key={o.id} to="/pedidos/$id" params={{ id: o.id }}>
            <div className="flex items-center gap-4 p-4 bg-card rounded-2xl border border-border">
              <div className="size-12 rounded-xl bg-secondary shrink-0 flex items-center justify-center text-xl">
                {CATEGORIAS.find((c) => c.id === o.categoria)?.emoji ?? "📦"}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate">{o.loja || o.descricao}</p>
                <p className="text-xs text-muted-foreground truncate">{STATUS_LABEL[o.status]}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold">{formatBRL(o.total)}</p>
                <p className="text-[10px] text-muted-foreground uppercase">
                  {new Date(o.criado_em).toLocaleDateString("pt-BR")}
                </p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </AppShell>
  );
}