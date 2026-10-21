import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { CourierShell } from "@/components/CourierShell";
import {
  ArrowRight,
  BriefcaseBusiness,
  CheckCircle2,
  Clock3,
  Hammer,
  Package,
  ShoppingBasket,
  Wrench,
  PlusCircle,
  Search,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/entregador/grupos")({
  head: () => ({
    meta: [
      { title: "Meus grupos — Pede pro Kevin" },
      { name: "description", content: "Categorias de serviços e oportunidades do Pede pro Kevin." },
    ],
  }),
  component: GruposPrestador,
});

type Categoria = {
  id: string;
  nome: string;
  descricao: string;
  exemplos: string;
  icon: typeof Package;
  cor: string;
  novas: number;
  status: "aprovado" | "pendente" | "disponivel";
};

const CATEGORIAS: Categoria[] = [
  {
    id: "entregas",
    nome: "Entregas e deslocamentos",
    descricao: "Compras, encomendas e pequenos objetos.",
    exemplos: "Mercado, farmácia, retirada e entrega de itens.",
    icon: Package,
    cor: "bg-primary/10 text-primary",
    novas: 3,
    status: "aprovado",
  },
  {
    id: "compras",
    nome: "Compras e tarefas",
    descricao: "Ajude alguém a resolver pequenas necessidades.",
    exemplos: "Compras no mercado, farmácia e pequenas tarefas locais.",
    icon: ShoppingBasket,
    cor: "bg-emerald-500/10 text-emerald-600",
    novas: 0,
    status: "disponivel",
  },
  {
    id: "montagem",
    nome: "Montagem e serviços domésticos",
    descricao: "Montagem de móveis e serviços simples para casa.",
    exemplos: "Montagem, instalação e pequenos reparos adequados à sua qualificação.",
    icon: Hammer,
    cor: "bg-amber-500/10 text-amber-600",
    novas: 0,
    status: "disponivel",
  },
  {
    id: "reparos",
    nome: "Reparos e manutenção",
    descricao: "Serviços que podem exigir experiência ou habilitação específica.",
    exemplos: "Pequenos reparos e manutenção, conforme qualificação comprovada.",
    icon: Wrench,
    cor: "bg-violet-500/10 text-violet-600",
    novas: 0,
    status: "disponivel",
  },
  {
    id: "favores",
    nome: "Outros favores",
    descricao: "Demandas que não se encaixam nas categorias anteriores.",
    exemplos: "Pequenas ajudas locais permitidas pelas regras da plataforma.",
    icon: BriefcaseBusiness,
    cor: "bg-sky-500/10 text-sky-600",
    novas: 0,
    status: "disponivel",
  },
];

function GruposPrestador() {
  const [aba, setAba] = useState<"meus" | "outros">("meus");
  const [busca, setBusca] = useState("");
  const [categoriaSelecionada, setCategoriaSelecionada] = useState<Categoria | null>(null);
  const [motivo, setMotivo] = useState("");
  const [experiencia, setExperiencia] = useState("");
  const [regiao, setRegiao] = useState("");
  const [enviada, setEnviada] = useState<string[]>([]);

  const meusGrupos = useMemo(() => CATEGORIAS.filter((c) => c.status === "aprovado"), []);
  const outrosGrupos = useMemo(
    () =>
      CATEGORIAS.filter((c) => c.status !== "aprovado").filter((c) =>
        `${c.nome} ${c.descricao} ${c.exemplos}`.toLocaleLowerCase("pt-BR").includes(busca.toLocaleLowerCase("pt-BR")),
      ),
    [busca],
  );

  function solicitarEntrada(e: React.FormEvent) {
    e.preventDefault();
    if (!categoriaSelecionada || !motivo.trim() || !experiencia.trim() || !regiao.trim()) return;
    setEnviada((prev) => [...new Set([...prev, categoriaSelecionada.id])]);
    setCategoriaSelecionada(null);
    setMotivo("");
    setExperiencia("");
    setRegiao("");
    setAba("outros");
  }

  return (
    <CourierShell>
      <header className="px-5 pt-8 pb-5">
        <p className="text-[11px] font-semibold tracking-[0.18em] uppercase text-accent">Faça parte da equipe</p>
        <h1 className="text-2xl font-semibold mt-1">Meus grupos</h1>
        <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
          Cada grupo reúne oportunidades de uma categoria. Não há conversa no grupo: você consulta as demandas e decide se quer se candidatar.
        </p>
      </header>

      <div className="px-5 space-y-5">
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-800 dark:text-amber-200 leading-relaxed">Prévia de interface: as categorias e contagens desta tela são exemplos. As inscrições ainda não são gravadas no Supabase; a integração será feita junto com o modelo de dados e a análise administrativa.</div>
        <div className="grid grid-cols-2 gap-2 p-1 rounded-2xl bg-secondary border border-border">
          <button
            type="button"
            onClick={() => setAba("meus")}
            className={`h-11 rounded-xl text-sm font-semibold transition-colors ${aba === "meus" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"}`}
          >
            Meus grupos
          </button>
          <button
            type="button"
            onClick={() => setAba("outros")}
            className={`h-11 rounded-xl text-sm font-semibold transition-colors ${aba === "outros" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"}`}
          >
            Outros grupos
          </button>
        </div>

        {aba === "meus" ? (
          <section className="space-y-3">
            {meusGrupos.length === 0 ? (
              <div className="rounded-2xl border border-border bg-card p-7 text-center">
                <BriefcaseBusiness className="mx-auto text-muted-foreground" size={28} />
                <h2 className="font-semibold mt-3">Você ainda não participa de grupos</h2>
                <p className="text-sm text-muted-foreground mt-1">Conheça as categorias e solicite entrada em “Outros grupos”.</p>
                <button type="button" onClick={() => setAba("outros")} className="mt-4 h-11 px-4 rounded-xl bg-primary text-primary-foreground text-sm font-semibold">
                  Explorar grupos
                </button>
              </div>
            ) : (
              meusGrupos.map((grupo) => <GrupoCard key={grupo.id} grupo={grupo} onOpen={() => undefined} />)
            )}
            <div className="rounded-2xl border border-dashed border-border p-4 flex items-center gap-3">
              <div className="size-10 rounded-xl bg-secondary flex items-center justify-center"><PlusCircle size={19} /></div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold">Quer receber outros tipos de demanda?</p>
                <p className="text-xs text-muted-foreground mt-0.5">Solicite aprovação para uma nova categoria.</p>
              </div>
              <button type="button" onClick={() => setAba("outros")} aria-label="Ver outros grupos" className="size-9 rounded-xl flex items-center justify-center hover:bg-secondary"><ArrowRight size={18} /></button>
            </div>
          </section>
        ) : (
          <section className="space-y-3">
            <div className="relative">
              <Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar categoria" className="field-input pl-10" />
            </div>
            <p className="text-xs text-muted-foreground">Você pode conhecer todas as categorias. As demandas só ficam disponíveis após a aprovação.</p>
            {outrosGrupos.map((grupo) => (
              <GrupoCard
                key={grupo.id}
                grupo={grupo}
                onOpen={() => setCategoriaSelecionada(grupo)}
                estado={enviada.includes(grupo.id) ? "Solicitação enviada" : undefined}
              />
            ))}
            {outrosGrupos.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">Nenhuma categoria encontrada.</p>}
          </section>
        )}

        <div className="rounded-2xl bg-secondary/70 border border-border p-4 text-xs text-muted-foreground leading-relaxed">
          <strong className="text-foreground">Como funciona:</strong> as solicitações para novas categorias são analisadas separadamente. Ser aprovado em uma modalidade não libera automaticamente as demais.
        </div>
      </div>

      {categoriaSelecionada && (
        <div className="fixed inset-0 z-50 bg-black/50 p-4 flex items-end sm:items-center justify-center" role="dialog" aria-modal="true" aria-labelledby="solicitar-titulo">
          <form onSubmit={solicitarEntrada} className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl bg-background border border-border p-5 space-y-4">
            <div className="flex items-start gap-3">
              <div className={`size-12 rounded-2xl flex items-center justify-center ${categoriaSelecionada.cor}`}>
                <categoriaSelecionada.icon size={23} />
              </div>
              <div className="flex-1">
                <h2 id="solicitar-titulo" className="text-lg font-semibold">Solicitar entrada</h2>
                <p className="text-sm text-muted-foreground">{categoriaSelecionada.nome}</p>
              </div>
              <button type="button" onClick={() => setCategoriaSelecionada(null)} className="text-sm text-muted-foreground px-2 py-1">Fechar</button>
            </div>
            <div className="rounded-xl bg-secondary p-3 text-sm">
              <p className="font-semibold">O que você poderá fazer?</p>
              <p className="text-muted-foreground mt-1">{categoriaSelecionada.exemplos}</p>
            </div>
            <label className="block space-y-1.5">
              <span className="text-sm font-medium">Por que deseja participar desta categoria?</span>
              <textarea required value={motivo} onChange={(e) => setMotivo(e.target.value)} rows={3} maxLength={1200} placeholder="Conte o que te interessa nesta modalidade." className="field-input min-h-24 resize-y" />
            </label>
            <label className="block space-y-1.5">
              <span className="text-sm font-medium">Qual é sua experiência ou qualificação?</span>
              <textarea required value={experiencia} onChange={(e) => setExperiencia(e.target.value)} rows={3} maxLength={1200} placeholder="Descreva sua experiência, habilidades ou cursos." className="field-input min-h-24 resize-y" />
            </label>
            <label className="block space-y-1.5">
              <span className="text-sm font-medium">Região onde pretende atender</span>
              <input required value={regiao} onChange={(e) => setRegiao(e.target.value)} maxLength={180} placeholder="Bairro ou região aproximada" className="field-input" />
            </label>
            <p className="text-xs text-muted-foreground">Esta é a primeira versão visual do formulário. A gravação da solicitação e a análise administrativa serão conectadas ao banco após a revisão do modelo de dados.</p>
            <button type="submit" className="w-full h-12 rounded-2xl bg-primary text-primary-foreground font-semibold">Enviar solicitação para análise</button>
          </form>
        </div>
      )}
    </CourierShell>
  );
}

function GrupoCard({ grupo, onOpen, estado }: { grupo: Categoria; onOpen: () => void; estado?: string }) {
  const Icon = grupo.icon;
  const aprovado = grupo.status === "aprovado";
  return (
    <article className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-start gap-3">
        <div className={`size-12 rounded-2xl flex items-center justify-center shrink-0 ${grupo.cor}`}>
          <Icon size={22} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h2 className="font-semibold text-sm leading-snug">{grupo.nome}</h2>
            {aprovado ? (
              <span className="shrink-0 inline-flex items-center gap-1 text-[10px] rounded-full bg-emerald-500/10 text-emerald-600 px-2 py-1 font-semibold"><CheckCircle2 size={12} /> Aprovado</span>
            ) : estado ? (
              <span className="shrink-0 inline-flex items-center gap-1 text-[10px] rounded-full bg-amber-500/10 text-amber-700 px-2 py-1 font-semibold"><Clock3 size={12} /> {estado}</span>
            ) : (
              <span className="shrink-0 text-[10px] rounded-full bg-secondary text-muted-foreground px-2 py-1 font-semibold">Bloqueado</span>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{grupo.descricao}</p>
        </div>
      </div>
      {aprovado ? (
        <Link to="/entregador" className="mt-4 h-10 rounded-xl bg-secondary text-sm font-semibold flex items-center justify-center gap-2">
          Ver demandas {grupo.novas > 0 && <span className="rounded-full bg-primary text-primary-foreground text-[10px] px-2 py-0.5">{grupo.novas} novas</span>}
        </Link>
      ) : (
        <button type="button" disabled={Boolean(estado)} onClick={onOpen} className="mt-4 w-full h-10 rounded-xl border border-border text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-60">
          {estado ? "Aguardando análise" : "Solicitar entrada"} <ArrowRight size={15} />
        </button>
      )}
    </article>
  );
}
