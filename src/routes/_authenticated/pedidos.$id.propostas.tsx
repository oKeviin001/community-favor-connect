import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import {
  ArrowLeft,
  CheckCircle2,
  Clock3,
  MapPin,
  MessageCircle,
  UserRound,
  Wallet,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/pedidos/$id/propostas")({
  head: () => ({
    meta: [
      { title: "Propostas de prestadores — Pede pro Kevin" },
      { name: "description", content: "Compare propostas e escolha quem vai atender sua demanda." },
    ],
  }),
  component: PropostasPrestadores,
});

type PropostaExemplo = {
  id: string;
  nome: string;
  resumo: string;
  distancia: string;
  valor: number | null;
  estimativa: number;
  experiencia: string;
};

const EXEMPLOS: PropostaExemplo[] = [
  {
    id: "amostra-1",
    nome: "Carlos (exemplo)",
    resumo: "Entregas e pequenas compras",
    distancia: "Distância aproximada: será calculada",
    valor: 15,
    estimativa: 12,
    experiencia: "Perfil e experiência serão carregados do cadastro aprovado.",
  },
  {
    id: "amostra-2",
    nome: "Mariana (exemplo)",
    resumo: "Disponível para avaliar a demanda",
    distancia: "Distância aproximada: será calculada",
    valor: null,
    estimativa: 12,
    experiencia: "A prestadora prefere combinar o valor após avaliar os detalhes.",
  },
];

function dinheiro(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function PropostasPrestadores() {
  const { id } = Route.useParams();
  const [selecionada, setSelecionada] = useState<string | null>(null);
  const [confirmada, setConfirmada] = useState<string | null>(null);

  return (
    <AppShell hideNav>
      <header className="px-5 pt-8 pb-5">
        <Link to="/pedidos/$id" params={{ id }} className="inline-flex items-center gap-2 text-sm text-muted-foreground mb-5">
          <ArrowLeft size={17} /> Voltar ao pedido
        </Link>
        <p className="text-[11px] font-semibold tracking-[0.18em] uppercase text-accent">Acompanhe seu pedido</p>
        <h1 className="text-2xl font-semibold mt-1">Propostas de prestadores</h1>
        <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
          Você não precisa aceitar a primeira proposta. Novas opções podem chegar enquanto seu pedido estiver aberto.
        </p>
      </header>

      <div className="px-5 space-y-4">
        <div className="rounded-2xl border border-border bg-secondary/70 p-4 flex gap-3">
          <Clock3 className="text-primary shrink-0 mt-0.5" size={20} />
          <div>
            <p className="text-sm font-semibold">Aguardando sua escolha</p>
            <p className="text-xs text-muted-foreground mt-1">Compare valores, experiência e distância aproximada antes de decidir.</p>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs text-muted-foreground">Estimativa de deslocamento</p>
              <p className="text-2xl font-bold mt-1">{dinheiro(12)}</p>
            </div>
            <div className="size-11 rounded-2xl bg-primary/10 text-primary flex items-center justify-center"><Wallet size={21} /></div>
          </div>
          <p className="text-xs text-muted-foreground mt-2">Valor meramente ilustrativo. A estimativa real depende da distância e dos critérios de cálculo definidos pelo aplicativo.</p>
        </div>

        <div className="flex items-center justify-between pt-1">
          <h2 className="font-semibold">Propostas recebidas</h2>
          <span className="text-xs text-muted-foreground">{EXEMPLOS.length} exemplos de interface</span>
        </div>

        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-800 dark:text-amber-200 leading-relaxed">
          Prévia de interface: estes nomes e valores são fictícios e não são propostas reais. A integração com candidaturas e dados do Supabase ainda precisa ser concluída.
        </div>

        {EXEMPLOS.map((p) => {
          const diferenca = p.valor === null ? null : p.valor - p.estimativa;
          const ativa = confirmada === p.id;
          return (
            <article key={p.id} className="rounded-2xl border border-border bg-card p-4 space-y-4">
              <div className="flex items-start gap-3">
                <div className="size-12 rounded-full bg-secondary flex items-center justify-center shrink-0"><UserRound size={22} /></div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold">{p.nome}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">{p.resumo}</p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mt-2"><MapPin size={12} /> {p.distancia}</p>
                </div>
                {ativa && <span className="text-[10px] rounded-full bg-emerald-500/10 text-emerald-600 px-2 py-1 font-semibold">Selecionada</span>}
              </div>

              <div className="rounded-xl bg-secondary/70 p-3">
                <p className="text-xs text-muted-foreground">Proposta do prestador</p>
                <p className="text-xl font-bold mt-1">{p.valor === null ? "A combinar" : dinheiro(p.valor)}</p>
                {diferenca !== null && (
                  <p className={`text-xs mt-1 font-medium ${diferenca > 0 ? "text-amber-700 dark:text-amber-300" : diferenca < 0 ? "text-emerald-600" : "text-muted-foreground"}`}>
                    {diferenca > 0 ? `${dinheiro(diferenca)} acima da estimativa` : diferenca < 0 ? `${dinheiro(Math.abs(diferenca))} abaixo da estimativa` : "Valor igual à estimativa"}
                  </p>
                )}
                {p.valor === null && <p className="text-xs text-muted-foreground mt-1">O valor ainda será negociado antes de confirmar a contratação.</p>}
              </div>

              <div>
                <p className="text-xs text-muted-foreground leading-relaxed">{p.experiencia}</p>
                <button type="button" onClick={() => setSelecionada(selecionada === p.id ? null : p.id)} className="mt-3 w-full h-10 rounded-xl border border-border text-sm font-semibold">
                  {selecionada === p.id ? "Ocultar detalhes" : "Ver perfil e detalhes"}
                </button>
                {selecionada === p.id && (
                  <div className="mt-3 rounded-xl border border-border p-3 space-y-2">
                    <p className="text-sm font-semibold">Perfil profissional</p>
                    <p className="text-xs text-muted-foreground">Experiência, modalidades aprovadas, região e qualificações relevantes aparecerão aqui após integração.</p>
                    <p className="text-xs text-muted-foreground">O endereço completo e o telefone do cliente não ficam visíveis para todos os candidatos.</p>
                  </div>
                )}
              </div>

              <button
                type="button"
                disabled={Boolean(confirmada)}
                onClick={() => setConfirmada(p.id)}
                className="w-full h-11 rounded-xl bg-primary text-primary-foreground text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {ativa ? <><CheckCircle2 size={17} /> Seleção demonstrativa</> : <>Escolher proposta</>}
              </button>
            </article>
          );
        })}

        {confirmada && (
          <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4">
            <p className="text-sm font-semibold">Confirmação demonstrativa</p>
            <p className="text-xs text-muted-foreground mt-1">Na versão integrada, esta ação pedirá confirmação final, registrará o prestador escolhido e encerrará as outras candidaturas sem apagar o histórico.</p>
            <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1"><MessageCircle size={13} /> O contato pelo WhatsApp será liberado conforme as regras do pedido.</p>
          </div>
        )}
      </div>
    </AppShell>
  );
}
