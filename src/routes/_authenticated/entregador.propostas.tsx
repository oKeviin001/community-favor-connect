import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { CourierShell } from "@/components/CourierShell";
import { EmptyState, SkeletonCard } from "@/components/kit";
import { formatBRL, STATUS_LABEL } from "@/lib/order-helpers";
import { grupoDoPedido, useGrupos } from "@/lib/groups";
import { toast } from "sonner";
import { FileText } from "lucide-react";

export const Route = createFileRoute("/_authenticated/entregador/propostas")({
  head: () => ({
    meta: [
      { title: "Minhas propostas — Colaborador | Pede pro Kevin" },
      { name: "description", content: "Acompanhe propostas enviadas, seleções e candidaturas não selecionadas." },
      { property: "og:title", content: "Minhas propostas — Colaborador | Pede pro Kevin" },
      { property: "og:description", content: "Gerencie suas candidaturas aos pedidos dos grupos." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: MinhasPropostas,
});

interface Row {
  id: string;
  order_id: string;
  status: "enviada" | "selecionada" | "nao_selecionada" | "retirada";
  tipo_valor: "fixo" | "a_combinar";
  valor_atual: number | null;
  valor_inicial: number | null;
  tipo_valor_inicial: "fixo" | "a_combinar";
  criado_em: string;
  atualizado_em: string;
  categoria: string;
  categoria_servico: string | null;
  loja: string | null;
  bairro: string | null;
  pedido_status: string;
  sou_escolhido: boolean;
}

const LABEL: Record<Row["status"], string> = {
  enviada: "Aguardando o cliente",
  selecionada: "Você foi escolhido",
  nao_selecionada: "Não selecionada",
  retirada: "Retirada por você",
};

function MinhasPropostas() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const { grupos } = useGrupos(true);

  const load = useCallback(async () => {
    const { data, error } = await supabase.rpc("list_my_proposals");
    if (error) toast.error(error.message);
    else setRows((data as unknown as Row[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
    const channel = supabase
      .channel("minhas-propostas")
      .on("postgres_changes", { event: "*", schema: "public", table: "order_proposals" }, load)
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [load]);

  async function retirar(id: string) {
    if (!window.confirm("Retirar esta proposta? Você poderá enviá-la novamente enquanto o pedido estiver aberto.")) return;
    setBusyId(id);
    const { error } = await supabase.rpc("withdraw_proposal", { _proposal_id: id });
    setBusyId(null);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Proposta retirada.");
    await load();
  }

  return (
    <CourierShell>
      <header className="px-6 pt-10 pb-4">
        <p className="label-kicker">Colaborador</p>
        <h1 className="text-2xl font-semibold">Minhas propostas</h1>
        <p className="text-sm text-muted-foreground mt-1">Acompanhe cada candidatura e o resultado da escolha do cliente.</p>
      </header>
      <div className="px-6 space-y-3 pb-6">
        {loading && <><SkeletonCard /><SkeletonCard /></>}
        {!loading && rows.length === 0 && (
          <EmptyState
            icon={<FileText size={20} />}
            title="Nenhuma proposta enviada"
            description="Abra um dos seus grupos e candidate-se a um pedido disponível."
            action={<Link to="/entregador" className="btn-primary-solid h-11 px-5 inline-flex items-center">Ver meus grupos</Link>}
          />
        )}
        {rows.map((row) => {
          const slug = grupoDoPedido(row);
          const grupo = grupos.find((g) => g.slug === slug);
          const alterou = row.tipo_valor !== row.tipo_valor_inicial || row.valor_atual !== row.valor_inicial;
          return (
            <article key={row.id} className="surface p-4 space-y-3">
              <div className="flex items-start gap-3">
                <div className="size-11 rounded-2xl bg-secondary border border-border flex items-center justify-center text-xl shrink-0">
                  {grupo?.icone ?? "🧩"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">{row.loja || grupo?.nome || "Pedido"}</p>
                  <p className="text-[11px] text-muted-foreground">{grupo?.nome ?? slug} · {row.bairro || "Região não informada"}</p>
                </div>
                <span className={`text-[10px] font-semibold px-2 py-1 rounded-full ${row.status === "selecionada" ? "bg-success/10 text-success" : "bg-secondary text-muted-foreground"}`}>
                  {LABEL[row.status]}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3 text-sm">
                <div>
                  <p className="text-[10px] uppercase text-muted-foreground">Sua proposta</p>
                  <p className="font-semibold">{row.tipo_valor === "a_combinar" ? "A combinar" : formatBRL(row.valor_atual)}</p>
                  {alterou && <p className="text-[10px] text-muted-foreground">Inicial: {row.tipo_valor_inicial === "a_combinar" ? "A combinar" : formatBRL(row.valor_inicial)}</p>}
                </div>
                <p className="text-[11px] text-muted-foreground text-right">Pedido: {STATUS_LABEL[row.pedido_status] ?? row.pedido_status}</p>
              </div>
              <div className="flex gap-2">
                <Link to="/entregador/pedido/$id" params={{ id: row.order_id }} className="btn-base btn-soft flex-1 h-10 text-xs">
                  Abrir pedido
                </Link>
                {row.status === "enviada" && row.pedido_status === "aguardando_entregador" && (
                  <button type="button" onClick={() => void retirar(row.id)} disabled={busyId === row.id} className="btn-base btn-soft flex-1 h-10 text-xs text-destructive disabled:opacity-60">
                    {busyId === row.id ? "Retirando..." : "Retirar proposta"}
                  </button>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </CourierShell>
  );
}
