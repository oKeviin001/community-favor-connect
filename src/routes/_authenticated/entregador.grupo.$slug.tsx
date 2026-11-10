import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { CourierShell } from "@/components/CourierShell";
import { grupoDoPedido, useGrupos } from "@/lib/groups";
import { formatProposta } from "@/lib/order-helpers";
import { ChevronLeft } from "lucide-react";

export const Route = createFileRoute("/_authenticated/entregador/grupo/$slug")({
  head: () => ({
    meta: [
      { title: "Pedidos do grupo — Pede pro Kevin" },
      { name: "description", content: "Pedidos abertos deste grupo de serviço para colaboradores enviarem propostas." },
      { property: "og:title", content: "Pedidos do grupo — Pede pro Kevin" },
      { property: "og:description", content: "Pedidos abertos deste grupo de serviço." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: GrupoFeed,
});

interface Row {
  id: string; loja: string | null; descricao: string; categoria: string; categoria_servico: string | null;
  bairro: string | null; valor_frete: number | null; valor_estimado_min: number | null; valor_estimado_max: number | null;
  minha_proposta_status: string | null;
}

function GrupoFeed() {
  const { slug } = Route.useParams();
  const { grupos } = useGrupos();
  const g = grupos.find((x) => x.slug === slug);
  const [rows, setRows] = useState<Row[]>([]);
  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.rpc("list_available_orders");
      setRows(((data as unknown as Row[]) ?? []).filter((o) => grupoDoPedido(o) === slug));
    };
    load();
    const t = window.setInterval(load, 10000);
    return () => window.clearInterval(t);
  }, [slug]);
  return (
    <CourierShell>
      <header className="px-6 pt-10 pb-4 flex items-center gap-3">
        <Link to="/entregador" className="size-10 rounded-full bg-secondary flex items-center justify-center"><ChevronLeft size={20} /></Link>
        <div><p className="label-kicker">Grupo</p><h1 className="text-xl font-semibold">{g?.icone} {g?.nome ?? slug}</h1></div>
      </header>
      <div className="px-6 space-y-3 pb-6">
        {rows.length === 0 && <div className="surface p-8 text-center text-sm text-muted-foreground">Nenhum pedido aberto neste grupo agora.</div>}
        {rows.map((o) => (
          <Link key={o.id} to="/entregador/pedido/$id" params={{ id: o.id }} className="surface block p-4 motion-interactive">
            <p className="text-sm font-semibold truncate">{o.loja || o.descricao}</p>
            <p className="text-[12px] text-muted-foreground line-clamp-2">{o.descricao}</p>
            <div className="flex justify-between mt-2 text-[12px]">
              <span className="text-muted-foreground">📍 {o.bairro || "Região não informada"}</span>
              <span className="font-semibold">{o.minha_proposta_status ? "Proposta enviada" : formatProposta(o)}</span>
            </div>
          </Link>
        ))}
      </div>
    </CourierShell>
  );
}
