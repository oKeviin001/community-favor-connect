import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { CourierShell } from "@/components/CourierShell";
import { useGrupos, grupoDoPedido, type Grupo } from "@/lib/groups";
import { useUser } from "@/lib/use-user";
import { toast } from "sonner";
import { ChevronRight, Clock, Loader2, X } from "lucide-react";

export const Route = createFileRoute("/_authenticated/entregador/")({
  head: () => ({
    meta: [
      { title: "Meus grupos — Colaborador | Pede pro Kevin" },
      { name: "description", content: "Grupos de serviço onde colaboradores recebem pedidos e enviam propostas." },
      { property: "og:title", content: "Meus grupos — Colaborador | Pede pro Kevin" },
      { property: "og:description", content: "Grupos de serviço onde colaboradores recebem pedidos e enviam propostas." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Grupos,
});

function Grupos() {
  const { userId } = useUser();
  const { grupos, loading } = useGrupos();
  const [meus, setMeus] = useState<Set<string>>(new Set());
  const [pendentes, setPendentes] = useState<Set<string>>(new Set());
  const [contagem, setContagem] = useState<Record<string, number>>({});
  const [inscrever, setInscrever] = useState<Grupo | null>(null);

  const load = useCallback(async () => {
    if (!userId) return;
    const [{ data: pc }, { data: req }, { data: ped }] = await Promise.all([
      supabase.from("provider_categories").select("categoria_slug").eq("user_id", userId),
      supabase.from("provider_category_requests").select("itens").eq("user_id", userId).eq("status", "pendente"),
      supabase.rpc("list_available_orders"),
    ]);
    setMeus(new Set((pc ?? []).map((r) => r.categoria_slug)));
    const p = new Set<string>();
    (req ?? []).forEach((r) => ((r.itens as { slug: string }[]) ?? []).forEach((i) => p.add(i.slug)));
    setPendentes(p);
    const c: Record<string, number> = {};
    ((ped as { categoria: string; categoria_servico: string | null; minha_proposta_status: string | null }[]) ?? []).forEach((o) => {
      const g = grupoDoPedido(o);
      c[g] = (c[g] ?? 0) + 1;
    });
    setContagem(c);
  }, [userId]);

  useEffect(() => {
    load();
    const t = window.setInterval(load, 15000);
    return () => window.clearInterval(t);
  }, [load]);

  const ordenados = [...grupos].sort((a, b) => Number(meus.has(b.slug)) - Number(meus.has(a.slug)));

  return (
    <CourierShell>
      <header className="px-6 pt-10 pb-4">
        <p className="label-kicker">Colaborador</p>
        <h1 className="text-2xl font-semibold">Meus grupos</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Os pedidos de cada serviço caem no grupo certo. Entre, veja os pedidos e envie sua proposta.
        </p>
      </header>

      <div className="px-6 space-y-2.5 pb-6">
        {loading && <Loader2 className="animate-spin text-primary mx-auto mt-10" />}
        {ordenados.map((g) => {
          const membro = meus.has(g.slug);
          const pend = pendentes.has(g.slug);
          const n = contagem[g.slug] ?? 0;
          const corpo = (
            <div
              className={`surface flex items-center gap-4 p-4 motion-interactive ${membro ? "" : "opacity-70"}`}
            >
              <div
                className={`size-12 rounded-2xl bg-secondary flex items-center justify-center text-2xl shrink-0 ${membro ? "" : "grayscale"}`}
              >
                {g.icone}
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-semibold truncate ${membro ? "" : "text-muted-foreground"}`}>{g.nome}</p>
                <p className="text-[12px] text-muted-foreground truncate">{g.descricao}</p>
              </div>
              {membro ? (
                <div className="flex items-center gap-2 shrink-0">
                  {n > 0 && (
                    <span className="min-w-6 h-6 px-2 rounded-full bg-primary text-primary-foreground text-[11px] font-bold flex items-center justify-center">
                      {n}
                    </span>
                  )}
                  <ChevronRight size={18} className="text-muted-foreground" />
                </div>
              ) : pend ? (
                <span className="shrink-0 inline-flex items-center gap-1 text-[11px] font-semibold text-warning">
                  <Clock size={12} /> Em análise
                </span>
              ) : (
                <span className="shrink-0 text-[12px] font-semibold text-primary">Se inscrever</span>
              )}
            </div>
          );
          return membro ? (
            <Link key={g.slug} to="/entregador/grupo/$slug" params={{ slug: g.slug }} className="block">
              {corpo}
            </Link>
          ) : (
            <button
              key={g.slug}
              type="button"
              className="block w-full text-left"
              disabled={pend}
              onClick={() => setInscrever(g)}
            >
              {corpo}
            </button>
          );
        })}
      </div>

      {inscrever && (
        <InscricaoModal
          grupo={inscrever}
          onClose={() => setInscrever(null)}
          onDone={() => {
            setInscrever(null);
            load();
          }}
        />
      )}
    </CourierShell>
  );
}

function InscricaoModal({ grupo, onClose, onDone }: { grupo: Grupo; onClose: () => void; onDone: () => void }) {
  const [texto, setTexto] = useState("");
  const [busy, setBusy] = useState(false);
  async function enviar() {
    setBusy(true);
    const { error } = await supabase.rpc("submit_category_request", {
      _itens: [{ slug: grupo.slug, justificativa: texto.trim() }],
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Inscrição enviada! Você será avisado quando for analisada.");
    onDone();
  }
  return (
    <div className="fixed inset-0 z-50 bg-foreground/40 flex items-end sm:items-center justify-center" onClick={onClose}>
      <div
        className="bg-card w-full max-w-screen-sm rounded-t-3xl sm:rounded-3xl p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] space-y-4 fade-rise"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3">
          <div className="size-12 rounded-2xl bg-secondary flex items-center justify-center text-2xl">{grupo.icone}</div>
          <div className="flex-1">
            <p className="label-kicker">Inscrição no grupo</p>
            <h2 className="text-lg font-semibold">{grupo.nome}</h2>
          </div>
          <button onClick={onClose} aria-label="Fechar" className="p-2 text-muted-foreground">
            <X size={18} />
          </button>
        </div>
        <label className="block">
          <span className="text-[13px] font-medium">Conte sua experiência neste serviço</span>
          <textarea
            className="field-textarea mt-1.5 min-h-28"
            maxLength={600}
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder="Ex.: Faço consertos de geladeira há 5 anos, tenho ferramentas próprias…"
          />
        </label>
        <p className="text-[11px] text-muted-foreground">A administração analisa e aprova ou recusa conforme sua especialidade.</p>
        <button
          onClick={enviar}
          disabled={busy || texto.trim().length < 10}
          className="btn-primary-solid w-full h-12 disabled:opacity-50"
        >
          {busy ? "Enviando..." : "Enviar inscrição"}
        </button>
      </div>
    </div>
  );
}
