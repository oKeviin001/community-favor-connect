import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { STATUS_LABEL } from "@/lib/order-helpers";
import { submitReview } from "@/lib/reviews.functions";
import { toast } from "sonner";
import { ChevronLeft, Star } from "lucide-react";

export const Route = createFileRoute("/_authenticated/pedidos/$id/avaliar")({
  head: () => ({
    meta: [
      { title: "Avaliar entrega — Pede pro Kevin" },
      { name: "description", content: "Avalie o entregador do seu pedido." },
      { property: "og:title", content: "Avaliar entrega — Pede pro Kevin" },
      { property: "og:description", content: "Avalie o entregador do seu pedido." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Avaliar,
});

interface Order {
  id: string;
  cliente_id: string;
  entregador_id: string | null;
  descricao: string;
  loja: string | null;
  status: string;
}

function Avaliar() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const submitReviewFn = useServerFn(submitReview);
  const [order, setOrder] = useState<Order | null>(null);
  const [entregadorNome, setEntregadorNome] = useState<string>("");
  const [nota, setNota] = useState<number>(5);
  const [criterios, setCriterios] = useState({
    comunicacao: 5,
    rapidez: 5,
    educacao: 5,
    confiabilidade: 5,
  });
  const [comentario, setComentario] = useState("");
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(true);

  useEffect(() => {
    (async () => {
      const [{ data: u }, { data: o }] = await Promise.all([
        supabase.auth.getUser(),
        supabase.from("orders").select("id, cliente_id, entregador_id, descricao, loja, status").eq("id", id).maybeSingle(),
      ]);
      if (!u.user || !o || o.cliente_id !== u.user.id) {
        toast.error("Você não pode avaliar este pedido");
        navigate({ to: "/pedidos" });
        return;
      }
      if (!["entregue", "confirmado"].includes(o.status)) {
        toast.error("Só é possível avaliar pedidos entregues");
        navigate({ to: "/pedidos/$id", params: { id } });
        return;
      }
      setOrder(o as Order);
      if (o.entregador_id) {
        const { data: p } = await supabase
          .from("profiles")
          .select("nome")
          .eq("id", o.entregador_id)
          .maybeSingle();
        setEntregadorNome(p?.nome ?? "Entregador");
      }
      setBusy(false);
    })();
  }, [id, navigate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await submitReviewFn({ data: { orderId: id, nota, comentario, criterios } });
      toast.success("Avaliação enviada!");
      navigate({ to: "/pedidos" });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erro ao enviar avaliação");
    } finally {
      setLoading(false);
    }
  }

  if (busy || !order) {
    return (
      <AppShell hideNav>
        <div className="min-h-screen flex items-center justify-center">
          <div className="size-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell hideNav>
      <header className="px-6 pt-10 pb-3 flex items-center gap-3">
        <Link to="/pedidos" className="size-10 rounded-full bg-secondary flex items-center justify-center">
          <ChevronLeft size={20} />
        </Link>
        <div className="flex-1 min-w-0">
          <p className="text-[11px] uppercase tracking-wider text-accent font-medium">Avaliação</p>
          <h1 className="text-lg font-semibold truncate">Como foi a entrega?</h1>
        </div>
      </header>

      <div className="px-6 py-4">
        <div className="bg-secondary rounded-2xl p-5 ring-1 ring-black/5 mb-6">
          <p className="text-sm text-muted-foreground">Pedido</p>
          <p className="font-semibold">{order.loja || order.descricao}</p>
          <p className="text-xs text-accent mt-1">{STATUS_LABEL[order.status]}</p>
          <p className="text-sm mt-3">Entregador: <span className="font-medium">{entregadorNome}</span></p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="text-xs uppercase tracking-wider text-muted-foreground font-medium block mb-3">
              Sua nota
            </label>
            <div className="flex justify-center gap-2">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setNota(n)}
                  className="p-2 transition-transform active:scale-90"
                >
                  <Star
                    size={36}
                    className={n <= nota ? "fill-accent text-accent" : "text-muted-foreground"}
                  />
                </button>
              ))}
            </div>
            <p className="text-center text-sm text-muted-foreground mt-2">
              {nota === 1 && "Ruim"}
              {nota === 2 && "Regular"}
              {nota === 3 && "Bom"}
              {nota === 4 && "Muito bom"}
              {nota === 5 && "Excelente"}
            </p>
          </div>

          <div>
            <label className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
              Comentário (opcional)
            </label>
          </div>

          <div className="space-y-3">
            <label className="text-xs uppercase tracking-wider text-muted-foreground font-medium block">
              Critérios
            </label>
            {([
              ["comunicacao", "Comunicação"],
              ["rapidez", "Rapidez"],
              ["educacao", "Educação"],
              ["confiabilidade", "Confiabilidade"],
            ] as const).map(([key, label]) => (
              <div key={key} className="flex items-center justify-between bg-card ring-1 ring-black/5 rounded-2xl px-4 py-3">
                <span className="text-sm">{label}</span>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      type="button"
                      aria-label={`${label} ${n}`}
                      onClick={() => setCriterios((c) => ({ ...c, [key]: n }))}
                    >
                      <Star
                        size={18}
                        className={n <= criterios[key] ? "fill-accent text-accent" : "text-muted-foreground"}
                      />
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div>
            <textarea
              rows={4}
              value={comentario}
              onChange={(e) => setComentario(e.target.value)}
              maxLength={300}
              placeholder="Conte como foi a experiência..."
              className="w-full mt-2 px-4 py-3 rounded-2xl bg-card ring-1 ring-black/5 text-base placeholder:text-muted-foreground/70 focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full h-14 bg-primary text-primary-foreground rounded-2xl font-medium text-base shadow-lg shadow-primary/10 disabled:opacity-60"
          >
            {loading ? "Enviando..." : "Enviar avaliação"}
          </button>
        </form>
      </div>
    </AppShell>
  );
}
