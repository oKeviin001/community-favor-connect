import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { toast } from "sonner";
import { ChevronLeft, AlertTriangle } from "lucide-react";

export const Route = createFileRoute("/_authenticated/pedidos/$id/disputa")({
  head: () => ({
    meta: [
      { title: "Reportar problema — Pede pro Kevin" },
      { name: "description", content: "Abra uma disputa sobre o seu pedido e fale com a moderação." },
      { property: "og:title", content: "Reportar problema — Pede pro Kevin" },
      { property: "og:description", content: "Abra uma disputa sobre o seu pedido e fale com a moderação." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Disputa,
});

const MOTIVOS = [
  "Pedido não chegou",
  "Item errado ou faltando",
  "Produto danificado",
  "Valor cobrado incorreto",
  "Problema de conduta",
  "Outro",
];

interface Existing { id: string; motivo: string; descricao: string | null; status: string; resposta_admin: string | null; criado_em: string }

function Disputa() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);
  const [motivo, setMotivo] = useState(MOTIVOS[0]);
  const [descricao, setDescricao] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [existing, setExisting] = useState<Existing | null>(null);

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      setUserId(u.user?.id ?? null);
      const { data } = await supabase
        .from("disputes")
        .select("id, motivo, descricao, status, resposta_admin, criado_em")
        .eq("order_id", id)
        .order("criado_em", { ascending: false })
        .limit(1)
        .maybeSingle();
      setExisting((data as Existing | null) ?? null);
      setLoading(false);
    })();
  }, [id]);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    if (!userId) return;
    if (descricao.trim().length < 10) return toast.error("Descreva o problema com pelo menos 10 caracteres.");
    setBusy(true);
    const { error } = await supabase.from("disputes").insert({
      order_id: id,
      aberto_por: userId,
      motivo,
      descricao: descricao.trim().slice(0, 1000),
    });
    if (!error) {
      await supabase.from("orders").update({ status: "em_disputa", atualizado_em: new Date().toISOString() }).eq("id", id);
      await supabase.from("order_events").insert({ order_id: id, autor_id: userId, status: "em_disputa", nota: motivo });
    }
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Problema reportado. A moderação vai analisar.");
    navigate({ to: "/pedidos/$id", params: { id } });
  }

  if (loading) {
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
        <Link to="/pedidos/$id" params={{ id }} className="size-10 rounded-full bg-secondary flex items-center justify-center">
          <ChevronLeft size={20} />
        </Link>
        <div className="flex-1 min-w-0">
          <p className="text-[11px] uppercase tracking-wider text-accent font-medium">Suporte</p>
          <h1 className="text-lg font-semibold truncate">Reportar problema</h1>
        </div>
      </header>

      <div className="px-6 py-4">
        {existing ? (
          <div className="bg-card ring-1 ring-black/5 rounded-2xl p-5 space-y-2">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Disputa aberta</p>
            <p className="font-semibold">{existing.motivo}</p>
            {existing.descricao && <p className="text-sm text-muted-foreground">{existing.descricao}</p>}
            <p className="text-xs text-accent">Status: {existing.status}</p>
            {existing.resposta_admin && (
              <div className="mt-3 bg-secondary rounded-xl p-3">
                <p className="text-[10px] uppercase text-muted-foreground">Resposta da moderação</p>
                <p className="text-sm">{existing.resposta_admin}</p>
              </div>
            )}
          </div>
        ) : (
          <form onSubmit={enviar} className="space-y-5">
            <div className="bg-secondary rounded-2xl p-4 flex gap-3 items-start">
              <AlertTriangle size={18} className="text-accent shrink-0 mt-0.5" />
              <p className="text-sm text-muted-foreground">
                Conte o que aconteceu. A moderação analisa e entra em contato pelo WhatsApp.
              </p>
            </div>

            <div>
              <label className="text-xs uppercase tracking-wider text-muted-foreground font-medium">Motivo</label>
              <div className="mt-2 grid gap-2">
                {MOTIVOS.map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMotivo(m)}
                    className={`h-12 rounded-2xl text-sm font-medium ring-1 text-left px-4 ${
                      motivo === m ? "bg-primary text-primary-foreground ring-primary" : "bg-card ring-black/5"
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs uppercase tracking-wider text-muted-foreground font-medium">O que aconteceu</label>
              <textarea
                rows={5}
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                maxLength={1000}
                placeholder="Descreva o problema com detalhes..."
                className="w-full mt-2 px-4 py-3 rounded-2xl bg-card ring-1 ring-black/5 text-base focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <button
              type="submit"
              disabled={busy}
              className="w-full h-14 bg-destructive text-white rounded-2xl font-medium disabled:opacity-60"
            >
              {busy ? "Enviando..." : "Enviar relato"}
            </button>
          </form>
        )}
      </div>
    </AppShell>
  );
}
