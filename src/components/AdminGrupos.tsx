import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, Pencil, Plus, RefreshCw, Search, Trash2 } from "lucide-react";
import { useAdmin } from "@/components/AdminCentral";

interface Grupo {
  slug: string;
  nome: string;
  descricao: string | null;
  icone: string;
  ativo: boolean;
  ordem: number;
}
interface Item { slug: string; justificativa: string }
interface Solicitacao {
  id: string;
  user_id: string;
  nome: string;
  itens: Item[];
  status: string;
  categorias_aprovadas: string[];
  observacao_admin: string | null;
  criado_em: string;
  analisado_em: string | null;
}
interface Membro {
  user_id: string;
  nome: string;
  categoria_slug: string;
  qualificacao: string | null;
  aprovado_em: string;
}
interface Data { grupos: Grupo[]; solicitacoes: Solicitacao[]; membros: Membro[] }

type Mutate = (args: { data: { acao: string; payload: Record<string, unknown> } }) => Promise<unknown>;

const STATUS: Record<string, string> = { pendente: "Pendente", aprovada: "Aprovada", recusada: "Recusada", parcial: "Aprovada parcialmente" };

export function AdminGrupos() {
  const { query, mutate } = useAdmin();
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"grupos" | "inscricoes" | "membros">("grupos");
  const [editor, setEditor] = useState<Grupo | "novo" | null>(null);
  const [busca, setBusca] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await query({ data: { view: "grupos", filtro: "todos", busca: "" } });
      setData(result as Data);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível carregar os grupos");
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => { void load(); }, [load]);

  async function executar(acao: string, payload: Record<string, unknown>) {
    try {
      const result = await mutate({ data: { acao, payload } }) as { mensagem?: string };
      toast.success(result?.mensagem ?? "Alteração salva");
      await load();
      return true;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível concluir");
      return false;
    }
  }

  const pendentes = (data?.solicitacoes ?? []).filter((s) => s.status === "pendente").length;
  const gruposPorSlug = new Map((data?.grupos ?? []).map((g) => [g.slug, g]));
  const membros = (data?.membros ?? []).filter((m) => !busca || m.nome.toLowerCase().includes(busca.toLowerCase()));

  return (
    <div className="space-y-4">
      <div className="flex gap-2 overflow-x-auto pb-1">
        {([
          ["grupos", `Grupos (${data?.grupos.length ?? 0})`],
          ["inscricoes", `Inscrições (${pendentes})`],
          ["membros", `Membros (${data?.membros.length ?? 0})`],
        ] as const).map(([id, label]) => (
          <button key={id} onClick={() => setView(id)} className={`shrink-0 h-9 px-3 rounded-full text-xs font-medium border ${view === id ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border text-muted-foreground"}`}>{label}</button>
        ))}
        <button onClick={() => void load()} className="ml-auto shrink-0 size-9 rounded-full bg-secondary flex items-center justify-center" aria-label="Atualizar"><RefreshCw size={14} /></button>
      </div>

      {loading && !data && <div className="py-10 flex justify-center"><Loader2 className="animate-spin text-primary" /></div>}

      {view === "grupos" && data && (
        <div className="space-y-3">
          <button onClick={() => setEditor("novo")} className="w-full h-11 rounded-xl bg-primary text-primary-foreground text-sm font-semibold flex items-center justify-center gap-2"><Plus size={16} /> Criar novo grupo</button>
          {data.grupos.map((grupo) => (
            <div key={grupo.slug} className={`bg-card border border-border rounded-2xl p-4 space-y-3 ${grupo.ativo ? "" : "opacity-65"}`}>
              <div className="flex items-center gap-3">
                <span className="size-11 rounded-xl bg-secondary flex items-center justify-center text-2xl">{grupo.icone}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold">{grupo.nome}</p>
                  <p className="text-[11px] text-muted-foreground truncate">{grupo.descricao || "Sem descrição"}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{grupo.slug} · ordem {grupo.ordem} · {grupo.ativo ? "ativo" : "pausado"}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setEditor(grupo)} className="h-9 px-3 rounded-lg bg-secondary text-xs flex items-center gap-1.5"><Pencil size={13} /> Editar</button>
                <button onClick={() => void executar("grupo_salvar", { ...grupo, originalSlug: grupo.slug, ativo: !grupo.ativo })} className="h-9 px-3 rounded-lg bg-secondary text-xs">{grupo.ativo ? "Pausar" : "Ativar"}</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {view === "inscricoes" && data && (
        <div className="space-y-3">
          {data.solicitacoes.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">Nenhuma inscrição recebida.</p>}
          {data.solicitacoes.map((s) => (
            <SolicitacaoCard key={s.id} solicitacao={s} grupos={gruposPorSlug} onDecide={async (aprovadas, observacao) => executar("grupo_inscricao_decidir", { id: s.id, aprovadas, observacao })} />
          ))}
        </div>
      )}

      {view === "membros" && data && (
        <div className="space-y-3">
          <label className="flex items-center gap-2 h-11 px-3 rounded-xl bg-card border border-border"><Search size={16} className="text-muted-foreground" /><input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar colaborador" className="flex-1 bg-transparent outline-none text-sm" /></label>
          {membros.map((m) => (
            <div key={`${m.user_id}-${m.categoria_slug}`} className="bg-card border border-border rounded-2xl p-4">
              <div className="flex items-start gap-3">
                <span className="text-2xl">{gruposPorSlug.get(m.categoria_slug)?.icone ?? "🧩"}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold">{m.nome}</p>
                  <p className="text-[11px] text-muted-foreground">{gruposPorSlug.get(m.categoria_slug)?.nome ?? m.categoria_slug} · desde {new Date(m.aprovado_em).toLocaleDateString("pt-BR")}</p>
                  {m.qualificacao && <p className="text-xs text-muted-foreground mt-2 whitespace-pre-line">{m.qualificacao}</p>}
                </div>
                <button
                  onClick={() => { if (confirm(`Remover ${m.nome} do grupo ${gruposPorSlug.get(m.categoria_slug)?.nome ?? m.categoria_slug}?`)) void executar("grupo_remover_membro", { userId: m.user_id, slug: m.categoria_slug }); }}
                  className="p-2 text-destructive" aria-label="Remover do grupo"
                ><Trash2 size={16} /></button>
              </div>
            </div>
          ))}
          {membros.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">Nenhum membro encontrado.</p>}
        </div>
      )}

      {editor && (
        <GrupoEditor
          grupo={editor === "novo" ? null : editor}
          onClose={() => setEditor(null)}
          onSave={async (values) => {
            const ok = await executar("grupo_salvar", values);
            if (ok) setEditor(null);
          }}
        />
      )}
    </div>
  );
}

function GrupoEditor({ grupo, onClose, onSave }: { grupo: Grupo | null; onClose: () => void; onSave: (values: Record<string, unknown>) => Promise<void> }) {
  const [nome, setNome] = useState(grupo?.nome ?? "");
  const [descricao, setDescricao] = useState(grupo?.descricao ?? "");
  const [icone, setIcone] = useState(grupo?.icone ?? "🧩");
  const [ordem, setOrdem] = useState(grupo?.ordem ?? 100);
  const [busy, setBusy] = useState(false);
  const slug = grupo?.slug ?? nome.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60);
  return (
    <div className="fixed inset-0 z-50 bg-foreground/40 flex items-end sm:items-center justify-center" onClick={onClose}>
      <div className="bg-card w-full max-w-screen-sm rounded-t-3xl sm:rounded-3xl p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-semibold">{grupo ? "Editar grupo" : "Novo grupo"}</h3>
        <label className="block text-xs font-medium">Nome<input value={nome} onChange={(e) => setNome(e.target.value.slice(0, 80))} className="field-input mt-1.5" placeholder="Ex.: Consertos" /></label>
        <label className="block text-xs font-medium">Identificador<input value={slug} readOnly className="field-input mt-1.5 opacity-70" /></label>
        <label className="block text-xs font-medium">Descrição<textarea value={descricao} onChange={(e) => setDescricao(e.target.value.slice(0, 240))} rows={3} className="field-textarea mt-1.5" /></label>
        <div className="grid grid-cols-2 gap-3">
          <label className="block text-xs font-medium">Ícone<input value={icone} onChange={(e) => setIcone(e.target.value.slice(0, 16))} className="field-input mt-1.5 text-center text-2xl" /></label>
          <label className="block text-xs font-medium">Ordem<input type="number" min={0} max={9999} value={ordem} onChange={(e) => setOrdem(Number(e.target.value))} className="field-input mt-1.5" /></label>
        </div>
        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 h-11 rounded-xl bg-secondary text-sm">Cancelar</button>
          <button disabled={busy || nome.trim().length < 2 || !slug} onClick={async () => { setBusy(true); await onSave({ originalSlug: grupo?.slug ?? null, slug, nome, descricao, icone, ordem, ativo: grupo?.ativo ?? true }); setBusy(false); }} className="flex-1 h-11 rounded-xl bg-primary text-primary-foreground text-sm disabled:opacity-50">{busy ? "Salvando..." : "Salvar grupo"}</button>
        </div>
      </div>
    </div>
  );
}

function SolicitacaoCard({ solicitacao: s, grupos, onDecide }: { solicitacao: Solicitacao; grupos: Map<string, Grupo>; onDecide: (aprovadas: string[], observacao: string) => Promise<boolean> }) {
  const [selecionados, setSelecionados] = useState<string[]>(s.itens.map((i) => i.slug));
  const [observacao, setObservacao] = useState("");
  const [busy, setBusy] = useState(false);
  async function decidir(aprovadas: string[]) {
    setBusy(true);
    await onDecide(aprovadas, observacao);
    setBusy(false);
  }
  return (
    <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
      <div className="flex justify-between gap-3">
        <div><p className="text-sm font-semibold">{s.nome}</p><p className="text-[11px] text-muted-foreground">{new Date(s.criado_em).toLocaleString("pt-BR")}</p></div>
        <span className="text-[10px] font-semibold h-fit px-2 py-1 rounded-full bg-secondary">{STATUS[s.status] ?? s.status}</span>
      </div>
      {s.itens.map((item) => {
        const marcado = selecionados.includes(item.slug);
        return (
          <div key={item.slug} className="rounded-xl bg-secondary p-3">
            {s.status === "pendente" ? (
              <label className="flex items-center gap-2 text-sm font-medium"><input type="checkbox" checked={marcado} onChange={() => setSelecionados((prev) => marcado ? prev.filter((x) => x !== item.slug) : [...prev, item.slug])} className="size-4 accent-primary" />{grupos.get(item.slug)?.icone} {grupos.get(item.slug)?.nome ?? item.slug}</label>
            ) : <p className="text-sm font-medium">{grupos.get(item.slug)?.icone} {grupos.get(item.slug)?.nome ?? item.slug} · {s.categorias_aprovadas.includes(item.slug) ? "aprovado" : "não aprovado"}</p>}
            <p className="text-xs text-muted-foreground mt-2 whitespace-pre-line">{item.justificativa}</p>
          </div>
        );
      })}
      {s.status === "pendente" ? (
        <>
          <textarea value={observacao} onChange={(e) => setObservacao(e.target.value.slice(0, 600))} rows={2} placeholder="Observação para o colaborador (opcional)" className="field-textarea" />
          <div className="flex gap-2">
            <button disabled={busy || selecionados.length === 0} onClick={() => void decidir(selecionados)} className="flex-1 h-10 rounded-xl bg-primary text-primary-foreground text-xs font-semibold disabled:opacity-50">Aprovar selecionados</button>
            <button disabled={busy} onClick={() => void decidir([])} className="flex-1 h-10 rounded-xl bg-destructive/10 text-destructive text-xs font-semibold">Recusar todos</button>
          </div>
        </>
      ) : s.observacao_admin && <p className="text-xs text-muted-foreground"><strong>Observação:</strong> {s.observacao_admin}</p>}
    </div>
  );
}
