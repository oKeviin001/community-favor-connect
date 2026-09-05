import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { CourierShell } from "@/components/CourierShell";
import { Comprovantes } from "@/components/Comprovantes";
import {
  STATUS_LABEL,
  TIMELINE_STEPS,
  statusIndex,
  formatBRL,
  CATEGORIAS,
  whatsappLink,
  type OrderStatus,
} from "@/lib/order-helpers";
import { useUser } from "@/lib/use-user";
import { toast } from "sonner";
import { ChevronLeft, MessageCircle, Phone, MapPin, Store, StickyNote } from "lucide-react";

export const Route = createFileRoute("/_authenticated/entregador/pedido/$id")({
  head: () => ({
    meta: [
      { title: "Detalhes do pedido — Entregador | Pede pro Kevin" },
      { name: "description", content: "Tela operacional do entregador: aceitar, contatar o cliente e finalizar." },
      { property: "og:title", content: "Detalhes do pedido — Entregador | Pede pro Kevin" },
      { property: "og:description", content: "Tela operacional do entregador: aceitar, contatar o cliente e finalizar." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PedidoEntregador,
});

interface Order {
  id: string;
  cliente_id: string;
  entregador_id: string | null;
  categoria: string;
  descricao: string;
  loja: string | null;
  endereco_loja: string | null;
  endereco_entrega: string;
  observacoes: string | null;
  valor_produto: string | number;
  valor_frete: string | number;
  taxa_servico: string | number;
  total: string | number | null;
  status: string;
  criado_em: string;
}
interface Pessoa { id: string; nome: string; telefone: string | null }

const NEXT_STEPS: { from: string; to: OrderStatus; label: string }[] = [
  { from: "aceito", to: "indo_loja", label: "Estou indo para a loja" },
  { from: "indo_loja", to: "em_compra", label: "Comecei a comprar" },
  { from: "em_compra", to: "compra_finalizada", label: "Compra concluída" },
  { from: "compra_finalizada", to: "em_entrega", label: "Saí para entrega" },
  { from: "em_entrega", to: "entregue", label: "Finalizar pedido" },
];

function PedidoEntregador() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const { userId, canDeliver } = useUser();
  const [order, setOrder] = useState<Order | null>(null);
  const [cliente, setCliente] = useState<Pessoa | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const { data: o } = await supabase.from("orders").select("*").eq("id", id).maybeSingle();
    const ord = (o as unknown) as Order | null;
    setOrder(ord);
    setLoading(false);
    if (ord) {
      const { data: p } = await supabase
        .from("profiles")
        .select("id, nome, telefone")
        .eq("id", ord.cliente_id)
        .maybeSingle();
      setCliente((p as Pessoa | null) ?? null);
    }
  }, [id]);

  useEffect(() => {
    load();
    const ch = supabase
      .channel(`entregador-order-${id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "orders", filter: `id=eq.${id}` }, load)
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [id, load]);

  if (loading) {
    return (
      <CourierShell hideNav>
        <div className="min-h-screen flex items-center justify-center">
          <div className="size-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </CourierShell>
    );
  }

  if (!order) {
    return (
      <CourierShell hideNav>
        <div className="p-8 text-center">
          <p className="text-sm text-muted-foreground">Pedido não encontrado ou já indisponível.</p>
          <Link to="/entregador" className="text-primary text-sm font-semibold mt-3 inline-block">
            Voltar aos pedidos disponíveis
          </Link>
        </div>
      </CourierShell>
    );
  }

  const meu = !!userId && order.entregador_id === userId;
  const disponivel = !order.entregador_id && order.status === "aguardando_entregador";
  const cat = CATEGORIAS.find((c) => c.id === order.categoria);
  const step = statusIndex(order.status);
  const proximo = meu ? NEXT_STEPS.find((s) => s.from === order.status) : undefined;
  const wa = meu
    ? whatsappLink(
        cliente?.telefone,
        `Olá! Sou o entregador do seu pedido "${order.loja || order.descricao}" no Pede pro Kevin.`,
      )
    : null;

  async function aceitar() {
    if (!userId) return;
    if (!canDeliver) {
      toast.error('Ative "Quero fazer entregas" no seu perfil para aceitar pedidos.');
      return;
    }
    setBusy(true);
    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from("orders")
      .update({ entregador_id: userId, status: "aceito", aceito_em: now, atualizado_em: now })
      .eq("id", id)
      .is("entregador_id", null)
      .select("*")
      .maybeSingle();
    setBusy(false);
    if (error) return toast.error(error.message);
    if (!data) return toast.error("Esse pedido já foi aceito por outro entregador.");
    await supabase.from("order_events").insert({ order_id: id, autor_id: userId, status: "aceito" });
    toast.success("Pedido aceito! Fale com o cliente pelo WhatsApp.");
    load();
  }

  async function avancar(next: OrderStatus) {
    if (!userId) return;
    setBusy(true);
    const { error } = await supabase
      .from("orders")
      .update({ status: next, atualizado_em: new Date().toISOString() })
      .eq("id", id);
    setBusy(false);
    if (error) return toast.error(error.message);
    await supabase.from("order_events").insert({ order_id: id, autor_id: userId, status: next });
    if (next === "entregue") {
      toast.success("Entrega finalizada! O cliente vai confirmar e avaliar.");
      navigate({ to: "/entregador/aceitos" });
      return;
    }
    load();
  }

  return (
    <CourierShell hideNav>
      <header className="px-6 pt-10 pb-3 flex items-center gap-3 bg-background sticky top-0 z-10">
        <Link
          to={meu ? "/entregador/aceitos" : "/entregador"}
          className="size-10 rounded-full bg-secondary flex items-center justify-center"
        >
          <ChevronLeft size={20} />
        </Link>
        <div className="flex-1 min-w-0">
          <p className="text-[11px] uppercase tracking-wider text-accent font-medium">{cat?.label ?? "Pedido"}</p>
          <h1 className="text-lg font-semibold truncate">{order.loja || order.descricao}</h1>
        </div>
        <span className="bg-accent/10 text-accent px-3 py-1 rounded-full text-xs font-medium shrink-0">
          {formatProposta(order)}
        </span>
      </header>

      <section className="px-6 pt-4">
        <div className="bg-secondary rounded-2xl p-5 border border-border">
          <h2 className="text-base font-semibold">{STATUS_LABEL[order.status]}</h2>
          <p className="text-sm text-muted-foreground mb-5">
            {disponivel ? "Disponível para aceite" : meu ? "Você é o entregador deste pedido" : "Já atribuído a outro entregador"}
          </p>
          {step >= 0 && (
            <div className="relative flex justify-between">
              <div className="absolute top-2 left-0 w-full h-0.5 bg-border" />
              <div
                className="absolute top-2 left-0 h-0.5 bg-primary transition-all"
                style={{ width: `${(step / (TIMELINE_STEPS.length - 1)) * 100}%` }}
              />
              {TIMELINE_STEPS.map((s, i) => (
                <div key={s} className="relative z-10 flex flex-col items-center gap-2">
                  <div className={`size-4 rounded-full ring-4 ring-secondary ${i <= step ? "bg-primary" : "bg-border"}`} />
                  <span className={`text-[10px] font-medium uppercase ${i <= step ? "text-primary" : "text-muted-foreground"}`}>
                    {STATUS_LABEL[s].split(" ")[0]}
                  </span>
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
            <div className="size-11 rounded-full bg-secondary flex items-center justify-center font-semibold">
              {cliente?.nome?.charAt(0).toUpperCase() ?? "?"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate">{cliente?.nome ?? "Cliente"}</p>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Phone size={12} />
                {meu ? cliente?.telefone ?? "Telefone não informado" : "Visível após aceitar o pedido"}
              </p>
            </div>
          </div>
          {meu &&
            (wa ? (
              <a
                href={wa}
                target="_blank"
                rel="noreferrer"
                className="w-full h-12 rounded-2xl bg-[#25D366] text-white font-medium text-sm flex items-center justify-center gap-2"
              >
                <MessageCircle size={16} /> Abrir WhatsApp
              </a>
            ) : (
              <p className="text-xs text-muted-foreground text-center">
                O cliente não cadastrou telefone para o WhatsApp.
              </p>
            ))}
        </div>
      </section>

      <section className="px-6 pt-6">
        <h3 className="text-xs uppercase tracking-wider text-muted-foreground font-medium mb-2">
          O que fazer
        </h3>
        <div className="bg-card rounded-2xl border border-border p-4 space-y-4 text-sm">
          <Info icon={<StickyNote size={14} />} label="Descrição completa" value={order.descricao} />
          {order.loja && <Info icon={<Store size={14} />} label="Loja" value={order.loja} />}
          {order.endereco_loja && (
            <Info icon={<MapPin size={14} />} label="Endereço da loja" value={order.endereco_loja} />
          )}
          <Info icon={<MapPin size={14} />} label="Endereço de entrega" value={order.endereco_entrega} />
          {order.observacoes && (
            <Info icon={<StickyNote size={14} />} label="Observações" value={order.observacoes} />
          )}
          <div className="pt-3 border-t border-border/60 text-center">
            <Money label="Proposta do cliente" v={propostaCliente(order)} />
          </div>
        </div>
      </section>

      {meu && <Comprovantes orderId={id} userId={userId} canUpload />}

      <section className="px-6 pt-6 pb-10 space-y-3">
        {disponivel && (
          <button
            onClick={aceitar}
            disabled={busy}
            className="w-full h-14 bg-primary text-primary-foreground rounded-2xl font-medium text-base shadow-lg shadow-primary/10 disabled:opacity-60"
          >
            {busy ? "Aceitando..." : "Aceitar pedido"}
          </button>
        )}
        {meu && proximo && (
          <button
            onClick={() => avancar(proximo.to)}
            disabled={busy}
            className="w-full h-14 bg-primary text-primary-foreground rounded-2xl font-medium text-base shadow-lg shadow-primary/10 disabled:opacity-60"
          >
            {proximo.label}
          </button>
        )}
        {meu && !proximo && (
          <p className="text-xs text-muted-foreground text-center">
            Pedido finalizado. Aguardando confirmação do cliente.
          </p>
        )}
        {!meu && !disponivel && (
          <Link
            to="/entregador"
            className="w-full h-12 rounded-2xl bg-card border border-border text-sm font-medium flex items-center justify-center"
          >
            Ver outros pedidos disponíveis
          </Link>
        )}
      </section>
    </CourierShell>
  );
}

function Info({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] uppercase text-muted-foreground tracking-wider flex items-center gap-1">
        {icon} {label}
      </p>
      <p className="text-foreground whitespace-pre-line">{value}</p>
    </div>
  );
}

function Money({ label, v }: { label: string; v: string | number | null }) {
  return (
    <div>
      <p className="text-[10px] uppercase text-muted-foreground">{label}</p>
      <p className="text-sm font-semibold">{formatBRL(v)}</p>
    </div>
  );
}