import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { formatBRL } from "@/lib/order-helpers";
import { toast } from "sonner";
import { Check, Clock, Loader2, Star, UserRound, MapPin } from "lucide-react";

interface HistoricoItem {
  evento: string;
  tipo_valor: string | null;
  valor: number | null;
  criado_em: string;
}

interface LocalizacaoColaborador { colaborador_id: string; nome: string; latitude: number; longitude: number; atualizado_em: string; }

interface Proposta {
  id: string;
  prestador_id: string;
  prestador_nome: string | null;
  nota_media: number | null;
  total_avaliacoes: number | null;
  total_entregas: number | null;
  qualificacao: string | null;
  tipo_valor: "fixo" | "a_combinar";
  valor_atual: number | null;
  tipo_valor_inicial: "fixo" | "a_combinar";
  valor_inicial: number | null;
  mensagem: string | null;
  status: "enviada" | "selecionada" | "nao_selecionada" | "retirada";
  criado_em: string;
  atualizado_em: string;
  historico: HistoricoItem[];
}

const STATUS: Record<Proposta["status"], string> = {
  enviada: "Aguardando sua escolha",
  selecionada: "Selecionada",
  nao_selecionada: "Não selecionada",
  retirada: "Retirada pelo colaborador",
};

function valorProposta(tipo: string, valor: number | null) {
  return tipo === "a_combinar" ? "A combinar" : formatBRL(valor);
}

export function PropostasCliente({
  orderId,
  ofertaCliente,
  canSelect,
  onSelected,
}: {
  orderId: string;
  ofertaCliente: number;
  canSelect: boolean;
  onSelected: () => void;
}) {
  const [propostas, setPropostas] = useState<Proposta[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [localizacoes, setLocalizacoes] = useState<LocalizacaoColaborador[]>([]);

  const load = useCallback(async () => {
    const [{ data, error }, { data: locais }] = await Promise.all([
      supabase.rpc("list_order_proposals", { _order_id: orderId }),
      supabase.rpc("list_order_proposal_locations" as never, { _order_id: orderId } as never),
    ]);
    setLocalizacoes((locais as unknown as LocalizacaoColaborador[]) ?? []);
    if (error) {
      setErro(error.message);
    } else {
      setErro(null);
      setPropostas((data as unknown as Proposta[]) ?? []);
    }
    setLoading(false);
  }, [orderId]);

  useEffect(() => {
    void load();
    const channel = supabase
      .channel(`propostas-cliente-${orderId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "order_proposals", filter: `order_id=eq.${orderId}` }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "collaborator_presence" }, load)
      .subscribe();
    // Polling keeps the map fresh even if Realtime is not enabled for the presence table.
    const refresh = window.setInterval(() => void load(), 15000);
    return () => {
      window.clearInterval(refresh);
      supabase.removeChannel(channel);
    };
  }, [orderId, load]);

  async function selecionar(proposta: Proposta) {
    const nome = proposta.prestador_nome ?? "este colaborador";
    if (!window.confirm(`Escolher ${nome}? O serviço começa depois da sua confirmação e os outros interessados serão informados.`)) return;
    setBusyId(proposta.id);
    const { error } = await supabase.rpc("select_proposal", { _proposal_id: proposta.id });
    setBusyId(null);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Colaborador escolhido! Agora vocês podem combinar tudo pelo WhatsApp.");
    await load();
    onSelected();
  }

  return (
    <section className="px-6 pt-6">
      <div className="flex items-end justify-between gap-3 mb-2">
        <div>
          <h3 className="text-xs uppercase tracking-wider text-muted-foreground font-medium">Propostas recebidas</h3>
          <p className="text-[11px] text-muted-foreground mt-1">Você decide quem fará o serviço, sem pressa.</p>
        </div>
        {!loading && <span className="text-xs font-semibold text-primary">{propostas.length}</span>}
      </div>

      <div className="rounded-2xl border border-border bg-secondary/60 p-3 mb-3 text-[11px] text-muted-foreground leading-relaxed">
        <p><strong className="text-foreground">Estimativa do app:</strong> Estimativa indisponível</p>
        <p><strong className="text-foreground">Distância estimada:</strong> ainda não calculada</p>
        <p className="mt-1">A estimativa, quando disponível, será apenas uma referência média — nunca um teto ou preço obrigatório.</p>
      </div>

      {loading && <div className="surface p-8 flex justify-center"><Loader2 className="animate-spin text-primary" size={20} /></div>}
      {erro && <div className="surface p-4 text-sm text-destructive">{erro}</div>}
      {!loading && !erro && propostas.length === 0 && (
        <div className="surface p-6 text-center">
          <Clock size={22} className="mx-auto text-muted-foreground mb-2" />
          <p className="text-sm font-semibold">Aguardando propostas</p>
          <p className="text-xs text-muted-foreground mt-1">Os colaboradores do grupo compatível já podem se candidatar.</p>
        </div>
      )}

      <div className="space-y-3">
        {propostas.map((p) => {
          const diferenca = p.tipo_valor === "fixo" && p.valor_atual != null && ofertaCliente > 0
            ? p.valor_atual - ofertaCliente
            : null;
          const alterou = p.tipo_valor !== p.tipo_valor_inicial || p.valor_atual !== p.valor_inicial;
          return (
            <article key={p.id} className={`surface p-4 space-y-4 ${p.status === "selecionada" ? "border-success/40" : ""}`}>
              <div className="flex items-start gap-3">
                <div className="size-11 rounded-2xl bg-secondary border border-border flex items-center justify-center shrink-0">
                  <UserRound size={19} className="text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">{p.prestador_nome ?? "Colaborador"}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-1 flex-wrap">
                    <Star size={12} className="text-accent" />
                    {(p.total_avaliacoes ?? 0) > 0
                      ? `${Number(p.nota_media ?? 0).toFixed(1)} · ${p.total_avaliacoes} avaliação(ões)`
                      : "Sem avaliações ainda"}
                    <span>· {p.total_entregas ?? 0} serviço(s) concluído(s)</span>
                  </p>
                </div>
                <span className={`text-[10px] font-semibold px-2 py-1 rounded-full ${p.status === "selecionada" ? "bg-success/10 text-success" : "bg-secondary text-muted-foreground"}`}>
                  {STATUS[p.status]}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="rounded-xl bg-secondary p-2.5">
                  <p className="text-[9px] uppercase text-muted-foreground">Estimativa do app</p>
                  <p className="text-[11px] font-semibold mt-1">Indisponível</p>
                </div>
                <div className="rounded-xl bg-secondary p-2.5">
                  <p className="text-[9px] uppercase text-muted-foreground">Proposta</p>
                  <p className="text-sm font-semibold mt-1">{valorProposta(p.tipo_valor, p.valor_atual)}</p>
                </div>
                <div className="rounded-xl bg-secondary p-2.5">
                  <p className="text-[9px] uppercase text-muted-foreground">Diferença</p>
                  <p className="text-[11px] font-semibold mt-1">
                    {diferenca == null
                      ? "A combinar"
                      : diferenca === 0
                        ? "Igual à sua oferta"
                        : `${diferenca > 0 ? "+" : "−"}${formatBRL(Math.abs(diferenca))} ${diferenca > 0 ? "acima" : "abaixo"}`}
                  </p>
                </div>
              </div>
              <p className="text-[10px] text-muted-foreground">Referência da diferença: sua oferta de {ofertaCliente > 0 ? formatBRL(ofertaCliente) : "A combinar"}.</p>

              {(() => {
                const local = localizacoes.find((item) => item.colaborador_id === p.prestador_id);
                if (!local) return (
                  <div className="rounded-xl bg-secondary/70 p-3 flex items-start gap-2">
                    <MapPin size={16} className="text-muted-foreground mt-0.5 shrink-0" />
                    <p className="text-[11px] text-muted-foreground">Localização indisponível no momento. O colaborador só aparece no mapa quando ativa a disponibilidade e permite o acesso à localização.</p>
                  </div>
                );
                const margem = 0.008;
                const bbox = [
                  local.longitude - margem,
                  local.latitude - margem,
                  local.longitude + margem,
                  local.latitude + margem,
                ].join("%2C");
                const mapa = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${local.latitude}%2C${local.longitude}`;
                return (
                  <div className="rounded-xl border border-success/30 overflow-hidden">
                    <div className="p-3 flex items-center gap-2">
                      <MapPin size={17} className="text-success shrink-0" />
                      <span className="min-w-0 flex-1">
                        <span className="block text-xs font-semibold">Colaborador disponível</span>
                        <span className="block text-[10px] text-muted-foreground">Atualizada às {new Date(local.atualizado_em).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</span>
                      </span>
                    </div>
                    <iframe title={`Localização de ${p.prestador_nome ?? "colaborador"}`} src={mapa} className="w-full h-48 border-0" loading="lazy" referrerPolicy="no-referrer" />
                    <p className="px-3 py-2 text-[10px] text-muted-foreground">Mapa © OpenStreetMap contributors</p>
                  </div>
                );
              })()}
              {p.qualificacao && (
                <div>
                  <p className="label-kicker">Qualificação aprovada</p>
                  <p className="text-xs text-muted-foreground mt-1 whitespace-pre-line">{p.qualificacao}</p>
                </div>
              )}
              {p.mensagem && (
                <div>
                  <p className="label-kicker">Mensagem do colaborador</p>
                  <p className="text-xs text-muted-foreground mt-1 whitespace-pre-line">{p.mensagem}</p>
                </div>
              )}
              {alterou && (
                <p className="text-[11px] rounded-xl bg-warning/10 border border-warning/20 p-2.5">
                  Proposta alterada. Valor inicial: <strong>{valorProposta(p.tipo_valor_inicial, p.valor_inicial)}</strong>.
                </p>
              )}
              {p.historico.length > 1 && (
                <details className="text-[11px] text-muted-foreground">
                  <summary className="cursor-pointer font-medium text-foreground">Ver histórico da proposta</summary>
                  <div className="mt-2 space-y-1.5">
                    {p.historico.map((h, index) => (
                      <p key={`${h.criado_em}-${index}`}>
                        {new Date(h.criado_em).toLocaleString("pt-BR")} · {h.evento.replaceAll("_", " ")}
                        {h.tipo_valor ? ` · ${valorProposta(h.tipo_valor, h.valor)}` : ""}
                      </p>
                    ))}
                  </div>
                </details>
              )}
              {canSelect && p.status === "enviada" && (
                <button
                  type="button"
                  onClick={() => void selecionar(p)}
                  disabled={busyId !== null}
                  className="btn-primary-solid w-full h-12 flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  {busyId === p.id ? <Loader2 size={17} className="animate-spin" /> : <Check size={17} />}
                  {busyId === p.id ? "Confirmando..." : "Escolher este colaborador"}
                </button>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}
