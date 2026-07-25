import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { STATUS_LABEL, TIMELINE_STEPS, statusIndex, formatBRL, CATEGORIAS } from "@/lib/order-helpers";
import { toast } from "sonner";
import { ChevronLeft, Send } from "lucide-react";

export const Route = createFileRoute("/_authenticated/pedidos/$id")({
  head: () => ({
    meta: [
      { title: "Pedido — Pede pro Kevin" },
      { name: "description", content: "Acompanhe o pedido e converse com o entregador." },
      { property: "og:title", content: "Pedido — Pede pro Kevin" },
      { property: "og:description", content: "Acompanhe o pedido e converse com o entregador." },
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
  atualizado_em?: string;
}
interface Msg { id: string; sender_id: string; texto: string; criado_em: string }

function PedidoDetail() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState<Order | null>(null);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const [entregadorNome, setEntregadorNome] = useState<string | null>(null);
  const [clienteNome, setClienteNome] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      setUserId(u.user?.id ?? null);
    })();
  }, []);

  useEffect(() => {
    async function load() {
      const { data: o } = await supabase.from("orders").select("*").eq("id", id).maybeSingle();
      setOrder((o as unknown) as Order | null);
      if (o) {
        const { data: p } = await supabase
          .from("profiles")
          .select("id, nome")
          .in("id", [o.cliente_id, o.entregador_id].filter(Boolean) as string[]);
        p?.forEach((pf) => {
          if (pf.id === o.cliente_id) setClienteNome(pf.nome);
          if (pf.id === o.entregador_id) setEntregadorNome(pf.nome);
        });
      }
      const { data: m } = await supabase
        .from("messages")
        .select("id, sender_id, texto, criado_em")
        .eq("order_id", id)
        .order("criado_em");
      setMsgs((m as Msg[]) ?? []);
    }
    load();

    const ch = supabase
      .channel(`order-${id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `order_id=eq.${id}` },
        (payload) => setMsgs((prev) => [...prev, payload.new as Msg]),
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "orders", filter: `id=eq.${id}` },
        (payload) => setOrder((prev) => (prev ? { ...prev, ...((payload.new as unknown) as Order) } : prev)),
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [id]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs.length]);

  if (!order) return <AppShell hideNav><div className="p-6">Carregando...</div></AppShell>;

  const isCliente = userId === order.cliente_id;
  const isEntregador = userId === order.entregador_id;
  const backTo = isCliente ? "/pedidos" : "/entregador";
  const step = statusIndex(order.status);
  const cat = CATEGORIAS.find((c) => c.id === order.categoria);

  type OrderStatus = "aceito" | "aguardando_entregador" | "cancelado" | "compra_finalizada" | "confirmado" | "em_compra" | "em_disputa" | "em_entrega" | "entregue";
  async function updateStatus(next: OrderStatus) {
    const { error } = await supabase
      .from("orders")
      .update({ status: next, atualizado_em: new Date().toISOString() })
      .eq("id", id);
    if (error) return toast.error(error.message);
    setOrder((prev) => (prev ? { ...prev, status: next, atualizado_em: new Date().toISOString() } : prev));
  }

  async function aceitar() {
    if (!userId) return;
    const { data, error } = await supabase
      .from("orders")
      .update({ entregador_id: userId, status: "aceito" })
      .eq("id", id)
      .is("entregador_id", null)
      .select("*")
      .maybeSingle();
    if (error) return toast.error(error.message);
    if (!data) return toast.error("Esse pedido já foi aceito por outro entregador.");
    setOrder((data as unknown) as Order);
    toast.success("Pedido aceito!");
    navigate({ to: "/pedidos/$id", params: { id }, replace: true });
  }

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim() || !userId) return;
    const value = text;
    setText("");
    const { error } = await supabase.from("messages").insert({
      order_id: id, sender_id: userId, texto: value,
    });
    if (error) { toast.error(error.message); setText(value); }
  }

  async function confirmar() {
    await updateStatus("confirmado");
    const { error } = await supabase.from("payments").update({ status: "liberado" }).eq("order_id", id);
    if (error) return toast.error(error.message);
    toast.success("Entrega confirmada! Pagamento liberado.");
    navigate({ to: "/pedidos" });
  }

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
                {order.entregador_id ? `Com ${entregadorNome ?? "entregador"}` : "Aguardando entregador"}
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
                style={{ width: `${step / (TIMELINE_STEPS.length - 1) * 100}%` }}
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
        <h3 className="text-xs uppercase tracking-wider text-muted-foreground font-medium mb-2">Detalhes</h3>
        <div className="bg-card rounded-2xl p-4 ring-1 ring-black/5 space-y-3 text-sm">
          <Detail label="Descrição" value={order.descricao} />
          {order.loja && <Detail label="Loja" value={order.loja} />}
          {order.endereco_loja && <Detail label="Endereço da loja" value={order.endereco_loja} />}
          <Detail label="Entregar em" value={order.endereco_entrega} />
          {order.observacoes && <Detail label="Observações" value={order.observacoes} />}
          <div className="pt-2 border-t border-border/60 grid grid-cols-3 text-center gap-2">
            <Money label="Produto" v={order.valor_produto} />
            <Money label="Frete" v={order.valor_frete} />
            <Money label="Taxa" v={order.taxa_servico} />
          </div>
        </div>
      </section>

      {(isCliente || isEntregador) && order.entregador_id && (
        <section className="px-6 pt-6">
          <h3 className="text-xs uppercase tracking-wider text-muted-foreground font-medium mb-2">Conversa</h3>
          <div className="bg-card rounded-2xl p-3 ring-1 ring-black/5 max-h-80 overflow-y-auto space-y-2">
            {msgs.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-6">
                Sem mensagens ainda. Diga oi 👋
              </p>
            )}
            {msgs.map((m) => {
              const mine = m.sender_id === userId;
              return (
                <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[75%] px-3 py-2 rounded-2xl text-sm ${
                      mine ? "bg-primary text-primary-foreground rounded-br-sm" : "bg-secondary text-foreground rounded-bl-sm"
                    }`}
                  >
                    {m.texto}
                  </div>
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>
          <form onSubmit={enviar} className="mt-3 flex gap-2">
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              maxLength={500}
              placeholder="Escreva uma mensagem..."
              className="flex-1 h-12 px-4 rounded-full bg-card ring-1 ring-black/5 focus:outline-none focus:ring-2 focus:ring-primary text-sm"
            />
            <button
              type="submit"
              className="size-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center"
            >
              <Send size={18} />
            </button>
          </form>
        </section>
      )}

      <section className="px-6 pt-6 pb-10 space-y-3">
        {isEntregador && order.status === "aceito" && (
          <PrimaryBtn onClick={() => updateStatus("em_compra")}>Iniciei a compra</PrimaryBtn>
        )}
        {isEntregador && order.status === "em_compra" && (
          <PrimaryBtn onClick={() => updateStatus("em_entrega")}>Saí para entrega</PrimaryBtn>
        )}
        {isEntregador && order.status === "em_entrega" && (
          <PrimaryBtn onClick={() => updateStatus("entregue")}>Marcar como entregue</PrimaryBtn>
        )}
        {isCliente && order.status === "entregue" && (
          <PrimaryBtn onClick={confirmar}>Confirmar entrega e liberar pagamento</PrimaryBtn>
        )}
        {!isCliente && !isEntregador && order.status === "aguardando_entregador" && (
          <PrimaryBtn onClick={aceitar}>Aceitar este pedido</PrimaryBtn>
        )}
        {isCliente && ["aguardando_entregador"].includes(order.status) && (
          <button
            onClick={() => updateStatus("cancelado")}
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
      <p className="text-foreground">{value}</p>
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