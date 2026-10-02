import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { CourierShell } from "@/components/CourierShell";
import { CATEGORIAS, STATUS_LABEL, formatProposta } from "@/lib/order-helpers";

export const Route = createFileRoute("/_authenticated/entregador/")({
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
  id: string;
  loja: string | null;
  categoria: string;
  valor_frete: number | null;
  valor_estimado_min: number | null;
  valor_estimado_max: number | null;
  bairro: string | null;
  status: string;
  criado_em: string;
}

function Entregador() {
  const [rows, setRows] = useState<Row[]>([]);

  useEffect(() => {
    let mounted = true;
    async function load() {
      const { data, error } = await supabase.rpc("list_available_orders");
      if (error) console.error("Falha ao carregar pedidos disponíveis:", error);
      if (!mounted) return;
      setRows(((data as unknown) as Row[]) ?? []);
    }
    load();
    const timer = window.setInterval(load, 10000);
    return () => {
      mounted = false;
      window.clearInterval(timer);
    };
  }, []);

  return (
    <CourierShell>
      <header className="px-6 pt-10 pb-4">
        <p className="text-accent font-medium text-sm tracking-wide uppercase">Vizinhança</p>
        <h1 className="text-2xl font-semibold">Pedidos disponíveis</h1>
        <p className="text-sm text-muted-foreground mt-1">Os valores são propostas do cliente e podem ser negociados.</p>
      </header>

      <div className="px-6 space-y-3">
        {rows.length === 0 && (
          <div className="bg-card rounded-2xl border border-border p-8 text-center motion-fade-in">
            <p className="text-muted-foreground text-sm">Nenhum pedido aberto agora.</p>
          </div>
        )}
        {rows.map((o) => {
          const cat = CATEGORIAS.find((c) => c.id === o.categoria);
          return (
            <Link key={o.id} to="/entregador/pedido/$id" params={{ id: o.id }}>
              <div className="bg-card rounded-2xl border border-border p-4">
                <div className="flex items-start gap-4">
                  <div className={`size-12 ${cat?.tint ?? "bg-secondary"} rounded-xl flex items-center justify-center text-2xl shrink-0`}>
                    {cat?.emoji ?? "📦"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{o.loja || "Pedido disponível"}</p>
                    <p className="text-xs text-muted-foreground">Detalhes completos liberados após o aceite.</p>
                    <p className="text-[11px] text-muted-foreground mt-1 truncate">📍 {o.bairro || "Região da corrida"}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-[10px] uppercase text-muted-foreground">Cliente oferece</p>
                    <p className="text-sm font-bold">{formatProposta(o)}</p>
                    <span className="text-[10px] uppercase text-primary font-semibold">Ver detalhes</span>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-border/60 flex items-center justify-between gap-2 text-[11px]">
                  <span className="text-muted-foreground truncate">📍 {o.bairro || "Região da corrida"}</span>
                  <span className="rounded-full bg-secondary border border-border px-2 py-0.5 font-semibold text-muted-foreground shrink-0">
                    🟡 {STATUS_LABEL[o.status] ?? o.status}
                  </span>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </CourierShell>
  );
}