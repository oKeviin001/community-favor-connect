import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { CourierShell } from "@/components/CourierShell";
import { CATEGORIAS, STATUS_LABEL, formatBRL } from "@/lib/order-helpers";

export const Route = createFileRoute("/_authenticated/entregador/historico")({
  head: () => ({
    meta: [
      { title: "Histórico de entregas — Pede pro Kevin" },
      { name: "description", content: "Todas as entregas que você já concluiu." },
      { property: "og:title", content: "Histórico de entregas — Pede pro Kevin" },
      { property: "og:description", content: "Todas as entregas que você já concluiu." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Historico,
});

interface Row {
  id: string; descricao: string; loja: string | null; categoria: string;
  status: string; total: number | null; criado_em: string;
}

const FINALIZADOS = ["entregue", "confirmado", "cancelado"] as const;

function Historico() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user || !mounted) return;
      const { data } = await supabase
        .from("orders")
        .select("id, descricao, loja, categoria, status, total, criado_em")
        .eq("entregador_id", u.user.id)
        .in("status", FINALIZADOS)
        .order("criado_em", { ascending: false });
      if (!mounted) return;
      setRows(((data as unknown) as Row[]) ?? []);
      setLoading(false);
    })();
    return () => { mounted = false; };
  }, []);

  return (
    <CourierShell>
      <header className="px-6 pt-10 pb-4">
        <p className="text-accent font-medium text-sm tracking-wide uppercase">Entregador</p>
        <h1 className="text-2xl font-semibold">Histórico de entregas</h1>
        <p className="text-sm text-muted-foreground mt-1">{rows.length} entrega(s) finalizada(s)</p>
      </header>

      <div className="px-6 space-y-3">
        {loading && [...Array(2)].map((_, i) => (
          <div key={i} className="h-20 bg-card rounded-2xl ring-1 ring-black/5 animate-pulse" />
        ))}
        {!loading && rows.length === 0 && (
          <div className="bg-card rounded-2xl ring-1 ring-black/5 p-8 text-center">
            <p className="text-muted-foreground text-sm">Nenhuma entrega concluída ainda.</p>
          </div>
        )}
        {rows.map((o) => (
          <Link key={o.id} to="/entregador/pedido/$id" params={{ id: o.id }}>
            <div className="bg-card rounded-2xl ring-1 ring-black/5 p-4 flex items-center gap-4">
              <div className="size-12 rounded-xl bg-secondary flex items-center justify-center text-xl shrink-0">
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
    </CourierShell>
  );
}