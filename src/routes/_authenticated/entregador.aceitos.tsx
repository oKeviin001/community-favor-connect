import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { CourierShell } from "@/components/CourierShell";
import { CATEGORIAS, STATUS_LABEL, formatBRL } from "@/lib/order-helpers";

export const Route = createFileRoute("/_authenticated/entregador/aceitos")({
  head: () => ({
    meta: [
      { title: "Pedidos aceitos — Pede pro Kevin" },
      { name: "description", content: "Pedidos que você assumiu e ainda estão em andamento." },
      { property: "og:title", content: "Pedidos aceitos — Pede pro Kevin" },
      { property: "og:description", content: "Pedidos que você assumiu e ainda estão em andamento." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Aceitos,
});

interface Row {
  id: string; descricao: string; loja: string | null; categoria: string;
  status: string; total: number | null; endereco_entrega: string; criado_em: string;
}

const ATIVOS = ["aceito", "indo_loja", "em_compra", "compra_finalizada", "em_entrega", "em_disputa"] as const;

function Aceitos() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function load() {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user || !mounted) return;
      const { data } = await supabase
        .from("orders")
        .select("id, descricao, loja, categoria, status, total, endereco_entrega, criado_em")
        .eq("entregador_id", u.user.id)
        .in("status", ATIVOS)
        .order("criado_em", { ascending: false });
      if (!mounted) return;
      setRows(((data as unknown) as Row[]) ?? []);
      setLoading(false);
    }
    load();
    const ch = supabase
      .channel("entregador-aceitos")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, load)
      .subscribe();
    return () => {
      mounted = false;
      supabase.removeChannel(ch);
    };
  }, []);

  return (
    <CourierShell>
      <header className="px-6 pt-10 pb-4">
        <p className="text-accent font-medium text-sm tracking-wide uppercase">Em andamento</p>
        <h1 className="text-2xl font-semibold">Pedidos aceitos</h1>
        <p className="text-sm text-muted-foreground mt-1">Entregas sob sua responsabilidade</p>
      </header>

      <div className="px-6 space-y-3">
        {loading && [...Array(2)].map((_, i) => (
          <div key={i} className="h-20 bg-card rounded-2xl ring-1 ring-black/5 animate-pulse" />
        ))}
        {!loading && rows.length === 0 && (
          <div className="bg-card rounded-2xl ring-1 ring-black/5 p-8 text-center">
            <p className="text-muted-foreground text-sm">Você ainda não aceitou nenhum pedido.</p>
            <Link to="/entregador" className="mt-3 inline-block text-primary text-sm font-semibold">
              Ver pedidos disponíveis
            </Link>
          </div>
        )}
        {rows.map((o) => {
          const cat = CATEGORIAS.find((c) => c.id === o.categoria);
          return (
            <Link key={o.id} to="/entregador/pedido/$id" params={{ id: o.id }}>
              <div className="bg-card rounded-2xl ring-1 ring-black/5 p-4 flex items-start gap-4">
                <div className={`size-12 ${cat?.tint ?? "bg-secondary"} rounded-xl flex items-center justify-center text-2xl shrink-0`}>
                  {cat?.emoji ?? "📦"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">{o.loja || o.descricao}</p>
                  <p className="text-xs text-muted-foreground truncate">{STATUS_LABEL[o.status]}</p>
                  <p className="text-[11px] text-muted-foreground mt-1 truncate">→ {o.endereco_entrega}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold">{formatBRL(o.total)}</p>
                  <span className="text-[10px] uppercase text-primary font-semibold">Abrir</span>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </CourierShell>
  );
}