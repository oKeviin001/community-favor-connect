import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import { AppShell } from "@/components/AppShell";
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
import { confirmDelivery } from "@/lib/orders.functions";
import { toast } from "sonner";
import { ChevronLeft, MessageCircle, Phone, AlertTriangle } from "lucide-react";

export const Route = createFileRoute("/_authenticated/pedidos/$id")({
  head: () => ({
    meta: [
      { title: "Pedido — Pede pro Kevin" },
      { name: "description", content: "Central de trabalho do pedido: status, contato e comprovantes." },
      { property: "og:title", content: "Pedido — Pede pro Kevin" },
      { property: "og:description", content: "Central de trabalho do pedido: status, contato e comprovantes." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PedidoDetail,
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
  aceito_em?: string | null;
  atualizado_em?: string | null;
}
interface Pessoa { id: string; nome: string; telefone: string | null }
interface Evento { id: string; status: string; criado_em: string; nota: string | null }

const NEXT_STEPS: { from: string; to: OrderStatus; label: string }[] = [
  { from: "aceito", to: "indo_loja", label: "Estou indo para a loja" },
  { from: "indo_loja", to: "em_compra", label: "Comecei a comprar" },
  { from: "em_compra", to: "compra_finalizada", label: "Compra concluída" },
  { from: "compra_finalizada", to: "em_entrega", label: "Saí para entrega" },
  { from: "em_entrega", to: "entregue", label: "Marcar como entregue" },
];

function PedidoDetail() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const { userId, canDeliver, isAdmin } = useUser();
  const confirmar = useServerFn(confirmDelivery);
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [cliente, setCliente] = useState<Pessoa | null>(null);
  const [entregador, setEntregador] = useState<Pessoa | null>(null);
  const [eventos, setEventos] = useState<Evento[]>([]);

  const load = useCallback(async () => {
    const { data: o } = await supabase.from("orders").select("*").eq("id", id).maybeSingle();
    const ord = (o as unknown) as Order | null;
    setOrder(ord);
    setLoading(false);
    if (ord) {
      const ids = [ord.cliente_id, ord.entregador_id].filter(Boolean) as string[];
      const { data: p } = await supabase.from("profiles").select("id, nome, telefone").in("id", ids);
      (p as Pessoa[] | null)?.forEach((pf) => {
        if (pf.id === ord.cliente_id) setCliente(pf);
        if (pf.id === ord.entregador_id) setEntregador(pf);
      });
    }
    const { data: ev } = await supabase
      .from("order_events")
      .select("id, status, criado_em, nota")
      .eq("order_id", id)
      .order("criado_em");
    setEventos((ev as Evento[]) ?? []);
  }, [id]);

  useEffect(() => {
    if (!order || !userId) return;
    if (order.cliente_id !== userId && !isAdmin) {
      navigate({ to: "/entregador/pedido/$id", params: { id }, replace: true });
    }
  }, [order, userId, isAdmin, id, navigate]);

  useEffect(() => {
    load();
    const ch = supabase
      .channel(`order-${id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "orders", filter: `id=eq.${id}` }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "order_events", filter: `order_id=eq.${id}` }, load)
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [id, load]);

  if (loading) {
    return (
      <AppShell hideNav>
        <div className="min-h-screen flex items-center justify-center">
          <div className="size-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </AppShell>
    );
  }
  if (!order) {
    return (
      <AppShell hideNav>
        <div className="p-8 text-center">
          <p className="text-sm text-muted-foreground">Pedido não encontrado.</p>
          <Link to="/pedidos" className="text-primary text-sm font-semibold mt-3 inline-block">
            Voltar
          </Link>
        </div>
      </AppShell>
    );
  }

  const isCliente = userId === order.cliente_id;
  const isEntregador = userId === order.entregador_id;
  const participa = isCliente || isEntregador || isAdmin;
  const backTo = isCliente ? "/pedidos" : "/entregador";
  const step = statusIndex(order.status);
  const cat = CATEGORIAS.find((c) => c.id === order.categoria);
  const outro = isCliente ? entregador : cliente;
  const wa = whatsappLink(
    outro?.telefone,
    `Olá! Falo sobre o pedido "${order.loja || order.descricao}" no Pede pro Kevin.`,
  );

  async function registrar(next: OrderStatus) {
    const now = new Date().toISOString();
    const { error } = await supabase
      .from("orders")
      .update({ status: next, atualizado_em: now })
      .eq("id", id);
    if (error) return toast.error(error.message);
    if (userId) {
      await supabase.from("order_events").insert({ order_id: id, autor_id: userId, status: next });
    }
    load();
  }

  async function aceitar() {
    if (!userId) return;
    if (!canDeliver) {
      toast.error("Ative o modo entregador no seu perfil para aceitar pedidos.");
      return;
    }
    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from("orders")
      .update({ entregador_id: userId, status: "aceito", aceito_em: now, atualizado_em: now })
      .eq("id", id)
      .is("entregador_id", null)
      .select("*")
      .maybeSingle();
    if (error) return toast.error(error.message);
    if (!data) return toast.error("Esse pedido já foi aceito por outro entregador.");
    await supabase.from("order_events").insert({ order_id: id, autor_id: userId, status: "aceito" });
    toast.success("Pedido aceito! Fale com o cliente pelo WhatsApp.");
    load();
  }

  async function confirmarEntrega() {
    try {
      await confirmar({ data: { orderId: id } });
      toast.success("Entrega confirmada!");
      navigate({ to: "/pedidos/$id/avaliar", params: { id } });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível confirmar");
    }
  }

  const proximo = NEXT_STEPS.find((s) => s.from === order.status);

  return (
    <AppShell hideNav>
      <header className="px-6 pt-10 pb-3 flex items-center gap-3 bg-background sticky top-0 z-10">
        <Link to={backTo} className="size-10 rounded-full bg-secondary flex items-center justify-center">
          <ChevronLeft size={20} />
        </Link>
        <div className="flex-1 min-w-0">
          <p className="text-[11px] uppercase tracking-wider text-accent font-medium">{cat?.label}</p>
          <h1 className="text-lg font-semibold truncate">{order.loja || order.descricao}</h1>
        </div>
      </header>

      <section className="px-6 pt-4">
        <div className="bg-secondary rounded-[20px] p-5 ring-1 ring-black/5">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h2 className="text-base font-semibold">{STATUS_LABEL[order.status]}</h2>
              <p className="text-sm text-muted-foreground">
                {order.entregador_id ? `Com ${entregador?.nome ?? "entregador"}` : "Aguardando entregador"}
              </p>
            </div>
            <span className="bg-accent/10 text-accent px-3 py-1 rounded-full text-xs font-medium">
              {formatBRL(order.total)}
            </span>
          </div>
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

      {participa && order.entregador_id && outro && (
        <section className="px-6 pt-6">
          <h3 className="text-xs uppercase tracking-wider text-muted-foreground font-medium mb-2">
            {isCliente ? "Entregador" : "Cliente"}
          </h3>
          <div className="bg-card rounded-2xl ring-1 ring-black/5 p-4 space-y-3">
            <div className="flex items-center gap-3">
              <div className="size-11 rounded-full bg-secondary flex items-center justify-center font-semibold">
                {outro.nome?.charAt(0).toUpperCase() ?? "?"}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate">{outro.nome}</p>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Phone size={12} /> {outro.telefone ?? "Telefone não informado"}
                </p>
              </div>
            </div>
            {wa ? (
              <a
                href={wa}
                target="_blank"
                rel="noreferrer"
                className="w-full h-12 rounded-2xl bg-[#25D366] text-white font-medium text-sm flex items-center justify-center gap-2"
              >
                <MessageCircle size={16} /> Conversar no WhatsApp
              </a>
            ) : (
              <p className="text-xs text-muted-foreground text-center">
                Sem telefone cadastrado para abrir o WhatsApp.
              </p>
            )}
          </div>
        </section>
      )}

      <section className="px-6 pt-6">
        <h3 className="text-xs uppercase tracking-wider text-muted-foreground font-medium mb-2">Detalhes</h3>
        <div className="bg-card rounded-2xl p-4 ring-1 ring-black/5 space-y-3 text-sm">
          <Detail label="Descrição" value={order.descricao} />
          {order.loja && <Detail label="Loja" value={order.loja} />}
          {order.endereco_loja && <Detail label="Endereço da loja" value={order.endereco_loja} />}
          <Detail label="Entregar em" value={order.endereco_entrega} />
          {order.observacoes && <Detail label="Observações" value={order.observacoes} />}
          <Detail label="Criado em" value={new Date(order.criado_em).toLocaleString("pt-BR")} />
          <div className="pt-2 border-t border-border/60 grid grid-cols-3 text-center gap-2">
            <Money label="Produto" v={order.valor_produto} />
            <Money label="Frete" v={order.valor_frete} />
            <Money label="Taxa" v={order.taxa_servico} />
          </div>
        </div>
      </section>

      {eventos.length > 0 && (
        <section className="px-6 pt-6">
          <h3 className="text-xs uppercase tracking-wider text-muted-foreground font-medium mb-2">
            Linha do tempo
          </h3>
          <div className="bg-card rounded-2xl ring-1 ring-black/5 p-4 space-y-3">
            {eventos.map((e) => (
              <div key={e.id} className="flex gap-3 items-start">
                <span className="text-xs font-semibold tabular-nums text-muted-foreground w-12 shrink-0">
                  {new Date(e.criado_em).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                </span>
                <div className="flex-1">
                  <p className="text-sm">{STATUS_LABEL[e.status] ?? e.status}</p>
                  {e.nota && <p className="text-xs text-muted-foreground">{e.nota}</p>}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {participa && (
        <Comprovantes orderId={id} userId={userId} canUpload={isCliente || isEntregador} />
      )}

      <section className="px-6 pt-6 pb-10 space-y-3">
        {isEntregador && proximo && (
          <PrimaryBtn onClick={() => registrar(proximo.to)}>{proximo.label}</PrimaryBtn>
        )}
        {isCliente && order.status === "entregue" && (
          <PrimaryBtn onClick={confirmarEntrega}>Recebi meu pedido</PrimaryBtn>
        )}
        {!isCliente && !isEntregador && order.status === "aguardando_entregador" && canDeliver && (
          <PrimaryBtn onClick={aceitar}>Aceitar este pedido</PrimaryBtn>
        )}
        {!isCliente && !isEntregador && order.status === "aguardando_entregador" && !canDeliver && (
          <p className="text-xs text-muted-foreground text-center">
            Ative "Quero fazer entregas" no perfil para aceitar pedidos.
          </p>
        )}
        {isCliente && ["entregue", "em_entrega", "compra_finalizada", "em_compra"].includes(order.status) && (
          <Link
            to="/pedidos/$id/disputa"
            params={{ id }}
            className="w-full h-12 rounded-2xl bg-card ring-1 ring-black/5 text-destructive text-sm font-medium flex items-center justify-center gap-2"
          >
            <AlertTriangle size={16} /> Reportar problema
          </Link>
        )}
        {isCliente && order.status === "aguardando_entregador" && (
          <button
            onClick={() => registrar("cancelado")}
            className="w-full h-12 rounded-2xl bg-card ring-1 ring-black/5 text-destructive text-sm font-medium"
          >
            Cancelar pedido
          </button>
        )}
      </section>
    </AppShell>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] uppercase text-muted-foreground tracking-wider">{label}</p>
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
function PrimaryBtn({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full h-14 bg-primary text-primary-foreground rounded-2xl font-medium text-base shadow-lg shadow-primary/10"
    >
      {children}
    </button>
  );
}
