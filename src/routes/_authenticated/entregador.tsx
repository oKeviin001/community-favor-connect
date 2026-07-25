import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { CATEGORIAS, formatBRL } from "@/lib/order-helpers";

export const Route = createFileRoute("/_authenticated/entregador")({
  head: () => ({
    meta: [
      { title: "Entregar — Pede pro Kevin" },
      { name: "description", content: "Pedidos disponíveis para entrega na sua vizinhança." },
          { property: "og:title", content: "Entregar — Pede pro Kevin" },
          { property: "og:description", content: "Pedidos disponíveis para entrega na sua vizinhança." },
          { property: "og:type", content: "website" },
          { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Entregador,
});

interface Row {
  id: string; descricao: string; loja: string | null;
  categoria: string; total: number | null; endereco_entrega: string; criado_em: string;
}

function Entregador() {
  const [rows, setRows] = useState<Row[]>([]);

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from("orders")
        .select("id, descricao, loja, categoria, total, endereco_entrega, criado_em")
        .eq("status", "aguardando_entregador")
        .is("entregador_id", null)
        .order("criado_em", { ascending: false });
      setRows(((data as unknown) as Row[]) ?? []);
    }
    load();
    const ch = supabase
      .channel("feed-entregador")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  return (
    <AppShell>
      <header className="px-6 pt-10 pb-4">
        <p className="text-accent font-medium text-sm tracking-wide uppercase">Vizinhança</p>
        <h1 className="text-2xl font-semibold">Pedidos disponíveis</h1>
        <p className="text-sm text-muted-foreground mt-1">Aceite um pedido para começar</p>
      </header>

      <div className="px-6 space-y-3">
        {rows.length === 0 && (
          <div className="bg-card rounded-2xl ring-1 ring-black/5 p-8 text-center">
            <p className="text-muted-foreground text-sm">Nenhum pedido aberto agora.</p>
          </div>
        )}
        {rows.map((o) => {
          const cat = CATEGORIAS.find((c) => c.id === o.categoria);
          return (
            <Link key={o.id} to="/pedidos/$id" params={{ id: o.id }}>
              <div className="bg-card rounded-2xl ring-1 ring-black/5 p-4">
                <div className="flex items-start gap-4">
                  <div className={`size-12 ${cat?.tint ?? "bg-secondary"} rounded-xl flex items-center justify-center text-2xl shrink-0`}>
                    {cat?.emoji ?? "📦"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{o.loja || o.descricao}</p>
                    <p className="text-xs text-muted-foreground line-clamp-2">{o.descricao}</p>
                    <p className="text-[11px] text-muted-foreground mt-1 truncate">→ {o.endereco_entrega}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold">{formatBRL(o.total)}</p>
                    <span className="text-[10px] uppercase text-primary font-semibold">Ver pedido</span>
                  </div>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </AppShell>
  );
}