import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { CourierShell } from "@/components/CourierShell";
import { Comprovantes } from "@/components/Comprovantes";
import { PrintWhatsapp } from "@/components/PrintWhatsapp";
import {
  STATUS_LABEL,
  TIMELINE_STEPS,
  statusIndex,
  formatBRL,
  formatProposta,
  propostaCliente,
  NEGOCIACAO_AVISO,
  whatsappLink,
  type OrderStatus,
} from "@/lib/order-helpers";
import { grupoDoPedido, useGrupos } from "@/lib/groups";
import { useUser } from "@/lib/use-user";
import { toast } from "sonner";
import { ChevronLeft, Loader2, MessageCircle, Phone, MapPin, Store, StickyNote } from "lucide-react";

export const Route = createFileRoute("/_authenticated/entregador/pedido/$id")({
  head: () => ({
    meta: [
      { title: "Detalhes do pedido — Colaborador | Pede pro Kevin" },
      { name: "description", content: "Envie uma proposta, contate o cliente e registre a conclusão do serviço." },
      { property: "og:title", content: "Detalhes do pedido — Colaborador | Pede pro Kevin" },
      { property: "og:description", content: "Proposta, contato e comprovantes do serviço." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PedidoColaborador,
});

interface PropostaAtual {
  id: string;
  tipo_valor: "fixo" | "a_combinar";
  valor_atual: number | null;
  mensagem: string | null;
  status: string;
}

interface Order {
  id: string;
  cliente_id: string | null;
  entregador_id: string | null;
  categoria: string;
  categoria_servico?: string | null;
  descricao: string;
  loja: string | null;
  bairro?: string | null;
  endereco_loja?: string | null;
  endereco_entrega?: string;
  observacoes?: string | null;
  valor_produto?: string | number;
  valor_frete: string | number;
  taxa_servico?: string | number;
  total?: string | number | null;
  status: string;
  criado_em: string;
  restrito?: boolean;
  minha_proposta?: PropostaAtual | null;
}
interface Pessoa { id: string; nome: string; telefone: string | null }

const NEXT_STEPS: { from: string; to: OrderStatus; label: string }[] = [
  { from: "aceito", to: "indo_loja", label: "Estou a caminho do local" },
  { from: "indo_loja", to: "em_compra", label: "Cheguei e comecei o serviço" },
  { from: "em_compra", to: "compra_finalizada", label: "Concluí esta etapa" },
  { from: "compra_finalizada", to: "em_entrega", label: "Estou a caminho da entrega" },
  { from: "em_entrega", to: "entregue", label: "Concluir serviço" },
];

function partesMensagem(mensagem: string | null | undefined) {
  if (!mensagem) return { origem: "", texto: "" };
  const match = mensagem.match(/^Saio de: ([^\n]+)(?:\n|$)/);
  return match
    ? { origem: match[1] ?? "", texto: mensagem.slice(match[0].length) }
    : { origem: "", texto: mensagem };
}

function PedidoColaborador() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const { userId, canDeliver } = useUser();
  const { grupos } = useGrupos(true);
  const [order, setOrder] = useState<Order | null>(null);
  const [cliente, setCliente] = useState<Pessoa | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [hasPrint, setHasPrint] = useState(false);
  const [aCombinar, setACombinar] = useState(false);
  const [valor, setValor] = useState("");
  const [origem, setOrigem] = useState("");
  const [mensagem, setMensagem] = useState("");

  const load = useCallback(async () => {
    const { data: o, error } = await supabase.rpc("get_courier_order", { _order_id: id });
    if (error) {
      setOrder(null);
      setLoading(false);
      return;
    }
    const ord = o as unknown as Order | null;
    setOrder(ord);
    setLoading(false);
    if (ord?.entregador_id === userId && ord.cliente_id) {
      const { data: p } = await supabase.rpc("get_order_counterparty_profile", { _order_id: id });
      setCliente((p as Pessoa[] | null)?.[0] ?? null);
    } else {
      setCliente(null);
    }
  }, [id, userId]);

  useEffect(() => {
    void load();
    const ch = supabase
      .channel(`colaborador-order-${id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "orders", filter: `id=eq.${id}` }, load)
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [id, load]);

  const propostaId = order?.minha_proposta?.id;
  useEffect(() => {
    const p = order?.minha_proposta;
    if (!p) return;
    setACombinar(p.tipo_valor === "a_combinar");
    setValor(p.valor_atual == null ? "" : String(p.valor_atual).replace(".", ","));
    const partes = partesMensagem(p.mensagem);
    setOrigem(partes.origem);
    setMensagem(partes.texto);
  }, [propostaId]);

  if (loading) {
    return (
      <CourierShell hideNav>
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="animate-spin text-primary" />
        </div>
      </CourierShell>
    );
  }

  if (!order) {
    return (
      <CourierShell hideNav>
        <div className="p-8 text-center">
          <p className="text-sm text-muted-foreground">Pedido não encontrado ou já indisponível.</p>
          <Link to="/entregador" className="text-primary text-sm font-semibold mt-3 inline-block">Voltar aos meus grupos</Link>
        </div>
      </CourierShell>
    );
  }

  const meu = !!userId && order.entregador_id === userId;
  const disponivel = !order.entregador_id && order.status === "aguardando_entregador";
  const grupo = grupos.find((g) => g.slug === grupoDoPedido(order));
  const step = statusIndex(order.status);
  const proximo = meu ? NEXT_STEPS.find((s) => s.from === order.status) : undefined;
  const wa = meu
    ? whatsappLink(cliente?.telefone, `Olá! Sou o colaborador escolhido para seu pedido "${order.loja || order.descricao}" no Pede pro Kevin.`)
    : null;

  async function enviarProposta(event: React.FormEvent) {
    event.preventDefault();
    if (!userId || !order) return;
    if (!canDeliver) {
      toast.error("Sua conta ainda não está aprovada como colaboradora.");
      return;
    }
    const numero = Number(valor.replace(",", "."));
    if (!aCombinar && (!Number.isFinite(numero) || numero <= 0 || numero > 100000)) {
      toast.error('Informe um valor válido ou escolha "A combinar".');
      return;
    }
    const partes = [origem.trim() ? `Saio de: ${origem.trim()}` : "", mensagem.trim()].filter(Boolean);
    const texto = partes.join("\n");
    if (texto.length > 500) {
      toast.error("A mensagem e o local de partida devem ter no máximo 500 caracteres.");
      return;
    }
    setBusy(true);
    const { error } = await supabase.rpc("submit_proposal", {
      _order_id: id,
      _tipo_valor: aCombinar ? "a_combinar" : "fixo",
      _valor: aCombinar ? null : numero,
      _mensagem: texto,
    });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(order.minha_proposta ? "Proposta atualizada." : "Proposta enviada! Agora o cliente poderá comparar e escolher.");
    await load();
  }

  async function avancar(next: OrderStatus) {
    if (!userId) return;
    if (next === "entregue" && !hasPrint) {
      toast.error("Envie o print da conversa no WhatsApp antes de concluir.");
      return;
    }
    setBusy(true);
    const { error } = await supabase.from("orders").update({ status: next, atualizado_em: new Date().toISOString() }).eq("id", id);
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    await supabase.from("order_events").insert({ order_id: id, autor_id: userId, status: next });
    if (next === "entregue") {
      toast.success("Serviço concluído! O cliente vai confirmar e avaliar.");
      navigate({ to: "/entregador/aceitos" });
      return;
    }
    await load();
  }

  return (
    <CourierShell hideNav>
      <header className="px-6 pt-10 pb-3 flex items-center gap-3 bg-background sticky top-0 z-10">
        <Link to={meu ? "/entregador/aceitos" : "/entregador"} className="size-10 rounded-full bg-secondary flex items-center justify-center" aria-label="Voltar">
          <ChevronLeft size={20} />
        </Link>
        <div className="flex-1 min-w-0">
          <p className="text-[11px] uppercase tracking-wider text-accent font-medium">{grupo?.nome ?? "Pedido"}</p>
          <h1 className="text-lg font-semibold truncate">{order.loja || order.descricao}</h1>
        </div>
        <span className="bg-accent/10 text-accent px-3 py-1 rounded-full text-xs font-medium shrink-0">{formatProposta(order)}</span>
      </header>

      <section className="px-6 pt-4">
        <div className="bg-secondary rounded-2xl p-5 border border-border">
          <h2 className="text-base font-semibold">{STATUS_LABEL[order.status]}</h2>
          <p className="text-sm text-muted-foreground mb-5">
            {disponivel ? "Aguardando propostas — o cliente escolhe quem fará" : meu ? "Você foi escolhido para este serviço" : "Já atribuído a outro colaborador"}
          </p>
          {step >= 0 && (
            <div className="relative flex justify-between">
              <div className="absolute top-2 left-0 w-full h-0.5 bg-border" />
              <div className="absolute top-2 left-0 h-0.5 bg-primary transition-all" style={{ width: `${(step / (TIMELINE_STEPS.length - 1)) * 100}%` }} />
              {TIMELINE_STEPS.map((s, i) => (
                <div key={s} className="relative z-10 flex flex-col items-center gap-2">
                  <div className={`size-4 rounded-full ring-4 ring-secondary ${i <= step ? "bg-primary" : "bg-border"}`} />
                  <span className={`text-[10px] font-medium uppercase ${i <= step ? "text-primary" : "text-muted-foreground"}`}>{STATUS_LABEL[s].split(" ")[0]}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="px-6 pt-6">
        <h3 className="text-xs uppercase tracking-wider text-muted-foreground font-medium mb-2">Cliente</h3>
        <div className="bg-card rounded-2xl border border-border p-4 space-y-3">
          <div className="flex items-center gap-3">
            <div className="size-11 rounded-full bg-secondary flex items-center justify-center font-semibold">{meu ? cliente?.nome?.charAt(0).toUpperCase() ?? "?" : "🔒"}</div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate">{meu ? cliente?.nome ?? "Cliente" : "Dados protegidos até a escolha"}</p>
              <p className="text-xs text-muted-foreground flex items-center gap-1"><Phone size={12} />{meu ? cliente?.telefone ?? "Telefone não informado" : "Nome e telefone visíveis somente ao colaborador escolhido"}</p>
            </div>
          </div>
          {meu && <p className="text-[11px] text-muted-foreground leading-relaxed">{NEGOCIACAO_AVISO} Combinem valor final, forma de pagamento, detalhes e horário diretamente pelo WhatsApp.</p>}
          {meu && (wa ? (
            <a href={wa} target="_blank" rel="noreferrer" className="w-full h-12 rounded-2xl bg-success text-success-foreground font-medium text-sm flex items-center justify-center gap-2">
              <MessageCircle size={16} /> Abrir WhatsApp
            </a>
          ) : <p className="text-xs text-muted-foreground text-center">O cliente não cadastrou telefone para o WhatsApp.</p>)}
        </div>
      </section>

      <section className="px-6 pt-6">
        <h3 className="text-xs uppercase tracking-wider text-muted-foreground font-medium mb-2">O que fazer</h3>
        <div className="bg-card rounded-2xl border border-border p-4 space-y-4 text-sm">
          <Info icon={<StickyNote size={14} />} label="Descrição completa" value={order.descricao} />
          {order.loja && <Info icon={<Store size={14} />} label="Local / loja" value={order.loja} />}
          {meu && order.endereco_loja && <Info icon={<MapPin size={14} />} label="Endereço de origem" value={order.endereco_loja} />}
          {meu && order.endereco_entrega ? (
            <Info icon={<MapPin size={14} />} label="Endereço de entrega" value={order.endereco_entrega} />
          ) : (
            <Info icon={<MapPin size={14} />} label="Região" value={`${order.bairro || "Não informada"}. Endereço exato liberado apenas se o cliente escolher você.`} />
          )}
          {meu && order.observacoes && <Info icon={<StickyNote size={14} />} label="Observações" value={order.observacoes} />}
          <div className="pt-3 border-t border-border/60 text-center"><Money label="Oferta inicial do cliente" v={propostaCliente(order)} /></div>
        </div>
      </section>

      {disponivel && (
        <section className="px-6 pt-6">
          <h3 className="text-xs uppercase tracking-wider text-muted-foreground font-medium mb-2">Sua candidatura</h3>
          <form onSubmit={enviarProposta} className="bg-card rounded-2xl border border-border p-4 space-y-4">
            <div>
              <label className="label-kicker" htmlFor="valor-proposta">Valor proposto</label>
              <div className="relative mt-1.5">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">R$</span>
                <input id="valor-proposta" inputMode="decimal" value={aCombinar ? "" : valor} disabled={aCombinar} onChange={(e) => setValor(e.target.value)} placeholder="0,00" className="field-input pl-11" />
              </div>
              <label className="flex items-center gap-2 mt-3 text-sm">
                <input type="checkbox" checked={aCombinar} onChange={(e) => setACombinar(e.target.checked)} className="size-4 accent-primary" />
                A combinar pelo WhatsApp depois da escolha
              </label>
              <p className="text-[11px] text-muted-foreground mt-1.5">“A combinar” não é gratuito nem um preço definido.</p>
            </div>
            <div>
              <label className="label-kicker" htmlFor="origem-proposta">De onde você sai? (opcional)</label>
              <input id="origem-proposta" value={origem} onChange={(e) => setOrigem(e.target.value.slice(0, 120))} placeholder="Seu bairro ou ponto de partida" className="field-input mt-1.5" />
              <p className="text-[11px] text-muted-foreground mt-1.5">É apenas uma referência para o cliente; o app ainda não calcula distância.</p>
            </div>
            <div>
              <label className="label-kicker" htmlFor="mensagem-proposta">Mensagem para o cliente (opcional)</label>
              <textarea id="mensagem-proposta" rows={3} value={mensagem} onChange={(e) => setMensagem(e.target.value.slice(0, 300))} placeholder="Conte como pode ajudar e sua disponibilidade." className="field-textarea mt-1.5" />
            </div>
            {order.minha_proposta && <p className="text-[11px] text-muted-foreground">Situação atual: {order.minha_proposta.status === "enviada" ? "aguardando o cliente" : order.minha_proposta.status.replaceAll("_", " ")}. Alterações ficam no histórico.</p>}
            <button type="submit" disabled={busy} className="w-full h-14 bg-primary text-primary-foreground rounded-2xl font-medium text-base disabled:opacity-60 flex items-center justify-center gap-2">
              {busy && <Loader2 size={17} className="animate-spin" />}
              {busy ? "Enviando..." : order.minha_proposta ? "Atualizar proposta" : "Enviar proposta"}
            </button>
          </form>
        </section>
      )}

      {meu && userId && <PrintWhatsapp orderId={id} userId={userId} onChange={setHasPrint} />}
      {meu && <Comprovantes orderId={id} userId={userId} canUpload />}

      <section className="px-6 pt-6 pb-10 space-y-3">
        {meu && proximo && (
          <>
            {proximo.to === "entregue" && !hasPrint && <p className="text-xs text-warning text-center">O print do WhatsApp é obrigatório para liberar a conclusão.</p>}
            <button onClick={() => void avancar(proximo.to)} disabled={busy || (proximo.to === "entregue" && !hasPrint)} className="w-full h-14 bg-primary text-primary-foreground rounded-2xl font-medium text-base disabled:opacity-50">
              {busy ? "Atualizando..." : proximo.label}
            </button>
          </>
        )}
        {meu && !proximo && <p className="text-xs text-muted-foreground text-center">Serviço finalizado. Aguardando confirmação do cliente.</p>}
        {!meu && !disponivel && <Link to="/entregador" className="w-full h-12 rounded-2xl bg-card border border-border text-sm font-medium flex items-center justify-center">Voltar aos meus grupos</Link>}
      </section>
    </CourierShell>
  );
}

function Info({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return <div><p className="text-[10px] uppercase text-muted-foreground tracking-wider flex items-center gap-1">{icon} {label}</p><p className="text-foreground whitespace-pre-line">{value}</p></div>;
}

function Money({ label, v }: { label: string; v: string | number | null }) {
  return <div><p className="text-[10px] uppercase text-muted-foreground">{label}</p><p className="text-sm font-semibold">{v && Number(v) > 0 ? formatBRL(v) : "A combinar"}</p></div>;
}
