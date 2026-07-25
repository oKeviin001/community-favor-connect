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

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      const { data } = await supabase
        .from("orders")
        .select("id, descricao, loja, status, categoria, total, criado_em, cliente_id, entregador_id")
        .or(`cliente_id.eq.${u.user.id},entregador_id.eq.${u.user.id}`)
        .order("criado_em", { ascending: false });
      setRows(((data as unknown) as Row[]) ?? []);
    })();
  }, []);

  return (
    <AppShell>
      <header className="px-6 pt-10 pb-4">
        <h1 className="text-2xl font-semibold">Meus pedidos</h1>
        <p className="text-sm text-muted-foreground">Ativos e histórico</p>
      </header>

      <div className="px-6 space-y-3">
        {rows.length === 0 && (
          <div className="bg-card rounded-2xl ring-1 ring-black/5 p-8 text-center">
            <p className="text-muted-foreground text-sm">Nenhum pedido ainda.</p>
            <Link to="/novo-pedido" className="mt-4 inline-block text-primary font-semibold text-sm">
              Criar meu primeiro pedido
            </Link>
          </div>
        )}
        {rows.map((o) => (
          <Link key={o.id} to="/pedidos/$id" params={{ id: o.id }}>
            <div className="flex items-center gap-4 p-4 bg-card rounded-2xl ring-1 ring-black/5">
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