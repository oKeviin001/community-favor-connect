import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { CheckCircle2, ChevronLeft, ChevronRight, Clock, Loader2, XCircle } from "lucide-react";
import {
  decideCourierApplication,
  getCourierApplication,
  listCourierApplications,
} from "@/lib/courier-apps.functions";

interface AppRow {
  id: string;
  user_id: string;
  nome_completo: string;
  cidade: string | null;
  estado: string | null;
  bairro: string | null;
  transporte: string;
  status: string;
  criado_em: string;
}

const TONE: Record<string, { label: string; cls: string; icon: typeof Clock }> = {
  aprovado: { label: "🟢 Aprovado", cls: "bg-success/10 text-success border-success/25", icon: CheckCircle2 },
  reprovado: { label: "🔴 Reprovado", cls: "bg-destructive/10 text-destructive border-destructive/25", icon: XCircle },
  pendente: { label: "🟡 Em análise", cls: "bg-warning/10 text-warning border-warning/25", icon: Clock },
};

function tone(status: string) {
  return TONE[status] ?? TONE["pendente"]!;
}

function data(v: string) {
  return new Date(v).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

export function CandidaturasAdmin() {
  const listFn = useServerFn(listCourierApplications);
  const getFn = useServerFn(getCourierApplication);
  const decideFn = useServerFn(decideCourierApplication);

  const [rows, setRows] = useState<AppRow[]>([]);
  const [busca, setBusca] = useState("");
  const [carregando, setCarregando] = useState(true);
  const [aberta, setAberta] = useState<string | null>(null);
  const [detalhe, setDetalhe] = useState<Awaited<ReturnType<typeof getApplicationType>> | null>(null);
  const [nota, setNota] = useState("");
  const [salvando, setSalvando] = useState(false);

  async function carregar() {
    setCarregando(true);
    try {
      const res = await listFn();
      setRows(res.applications as AppRow[]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível carregar as candidaturas");
    }
    setCarregando(false);
  }

  useEffect(() => {
    void carregar();
  }, []);

  useEffect(() => {
    if (!aberta) return setDetalhe(null);
    setDetalhe(null);
    setNota("");
    (async () => {
      try {
        const res = await getFn({ data: { id: aberta } });
        setDetalhe(res as never);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Não foi possível abrir a candidatura");
      }
    })();
  }, [aberta]);

  async function decidir(decisao: "aprovado" | "reprovado") {
    if (!aberta) return;
    setSalvando(true);
    try {
      await decideFn({ data: { id: aberta, decisao, nota: nota.trim() || null } });
      toast.success(decisao === "aprovado" ? "Entregador aprovado" : "Candidatura reprovada");
      setAberta(null);
      await carregar();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível concluir");
    }
    setSalvando(false);
  }

  const totais = {
    total: rows.length,
    pendente: rows.filter((r) => r.status !== "aprovado" && r.status !== "reprovado").length,
    aprovado: rows.filter((r) => r.status === "aprovado").length,
    reprovado: rows.filter((r) => r.status === "reprovado").length,
  };

  const filtradas = rows.filter((r) =>
    (r.nome_completo + " " + (r.cidade ?? "")).toLowerCase().includes(busca.trim().toLowerCase()),
  );

  if (aberta) {
    const app = detalhe?.application;
    return (
      <div className="px-6 space-y-4 pb-8">
        <button onClick={() => setAberta(null)} className="flex items-center gap-1 text-sm text-muted-foreground">
          <ChevronLeft size={16} /> Voltar
        </button>
        {!app && <div className="py-10 flex justify-center"><Loader2 className="animate-spin text-primary" /></div>}
        {app && (
          <>
            <div className="surface p-4 space-y-1">
              <div className="flex items-start gap-3">
                <div className="flex-1">
                  <p className="text-lg font-semibold">{app.nome_completo}</p>
                  <p className="text-[12px] text-muted-foreground capitalize">{app.transporte}</p>
                  <p className="text-[12px] text-muted-foreground">
                    {[app.cidade, app.estado].filter(Boolean).join(" - ") || "Sem cidade"}
                    {app.bairro ? ` / ${app.bairro}` : ""}
                  </p>
                  <p className="text-[12px] text-muted-foreground">{data(app.criado_em)}</p>
                </div>
                <span className={`px-3 h-8 inline-flex items-center rounded-full border text-[11px] font-semibold ${tone(app.status).cls}`}>
                  {tone(app.status).label}
                </span>
              </div>
            </div>

            <Bloco titulo="Dados pessoais">
              <Info k="CPF" v={app.cpf} />
              <Info k="Telefone" v={app.telefone} />
              <Info k="E-mail" v={app.email} />
              <Info k="Data de nascimento" v={app.data_nascimento} />
              <Info k="Endereço" v={[app.endereco, app.numero, app.complemento].filter(Boolean).join(", ")} />
              <Info k="CEP" v={app.cep} />
              <Info k="Região de atuação" v={app.regiao_atuacao} />
              <Info k="Disponibilidade" v={[...(app.dias_semana ?? []), ...(app.horarios ?? [])].join(", ")} />
            </Bloco>

            <Bloco titulo="Questionário respondido">
              <Info k="Já trabalhou com entregas?" v={simNao(app.ja_trabalhou_entregas)} />
              <Info k="Possui smartphone próprio?" v={simNao(app.possui_smartphone)} />
              <Info k="Possui documento válido?" v={simNao(app.possui_documento)} />
              <Info k="Possui bag ou caixa térmica?" v={simNao(app.possui_bag)} />
              <Info k="Por que quer ser entregador?" v={app.motivo} />
              <Info k="Informações adicionais" v={app.info_adicional} />
              <Info k="Observações" v={app.observacoes} />
            </Bloco>

            <Bloco titulo="Documentos enviados">
              {Object.keys(detalhe?.documentos ?? {}).length === 0 && (
                <p className="text-[12px] text-muted-foreground">Nenhum documento enviado.</p>
              )}
              <div className="grid grid-cols-3 gap-2">
                {Object.entries(detalhe?.documentos ?? {}).map(([path, url]) => (
                  <a key={path} href={url} target="_blank" rel="noreferrer" className="block">
                    <img src={url} alt="Documento enviado pelo candidato" className="w-full h-24 object-cover rounded-xl border border-border" />
                  </a>
                ))}
              </div>
            </Bloco>

            <Bloco titulo="Histórico da candidatura">
              {(detalhe?.eventos ?? []).length === 0 && (
                <p className="text-[12px] text-muted-foreground">Sem eventos registrados.</p>
              )}
              {(detalhe?.eventos ?? []).map((e) => (
                <div key={e.id} className="flex items-start gap-2 text-[12px]">
                  <span className={`px-2 h-6 inline-flex items-center rounded-full border text-[10px] font-semibold shrink-0 ${tone(e.status).cls}`}>
                    {tone(e.status).label}
                  </span>
                  <div className="min-w-0">
                    <p className="text-muted-foreground">{data(e.criado_em)}</p>
                    {e.nota && <p>{e.nota}</p>}
                  </div>
                </div>
              ))}
            </Bloco>

            <Bloco titulo="Observações do administrador">
              <textarea
                rows={3}
                maxLength={250}
                value={nota}
                onChange={(e) => setNota(e.target.value)}
                placeholder="Adicione uma observação (opcional)..."
                className="field-textarea"
              />
            </Bloco>

            <div className="flex gap-2">
              <button
                disabled={salvando}
                onClick={() => decidir("reprovado")}
                className="flex-1 h-12 rounded-2xl border border-destructive/30 text-destructive text-sm font-semibold disabled:opacity-50"
              >
                Reprovar
              </button>
              <button
                disabled={salvando}
                onClick={() => decidir("aprovado")}
                className="flex-1 h-12 rounded-2xl bg-success text-success-foreground text-sm font-semibold disabled:opacity-50"
              >
                {salvando ? "Salvando..." : "Aprovar"}
              </button>
            </div>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="px-6 space-y-3 pb-8">
      <div className="grid grid-cols-4 gap-2">
        <Stat n={totais.total} label="Total" cls="bg-secondary" />
        <Stat n={totais.pendente} label="Em análise" cls="bg-warning/10 text-warning" />
        <Stat n={totais.aprovado} label="Aprovados" cls="bg-success/10 text-success" />
        <Stat n={totais.reprovado} label="Reprovados" cls="bg-destructive/10 text-destructive" />
      </div>

      <input
        value={busca}
        onChange={(e) => setBusca(e.target.value)}
        placeholder="Buscar entregador..."
        className="field-input"
      />

      {carregando && <div className="py-10 flex justify-center"><Loader2 className="animate-spin text-primary" /></div>}
      {!carregando && filtradas.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-8">Nenhuma candidatura recebida.</p>
      )}
      {filtradas.map((r) => (
        <button
          key={r.id}
          onClick={() => setAberta(r.id)}
          className="w-full surface p-4 flex items-center gap-3 text-left"
        >
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate">{r.nome_completo}</p>
            <p className="text-[12px] text-muted-foreground truncate">
              {[r.cidade, r.estado].filter(Boolean).join(" - ") || "Sem cidade"}
            </p>
            <p className="text-[11px] text-muted-foreground">{data(r.criado_em)}</p>
          </div>
          <span className={`px-2.5 h-7 inline-flex items-center rounded-full border text-[11px] font-semibold shrink-0 ${tone(r.status).cls}`}>
            {tone(r.status).label}
          </span>
          <ChevronRight size={16} className="text-muted-foreground shrink-0" />
        </button>
      ))}
    </div>
  );
}

function simNao(v: boolean | null | undefined) {
  return v === true ? "Sim" : v === false ? "Não" : null;
}

function Stat({ n, label, cls }: { n: number; label: string; cls: string }) {
  return (
    <div className={`rounded-2xl p-3 text-center ${cls}`}>
      <p className="text-xl font-semibold leading-none">{n}</p>
      <p className="text-[10px] mt-1 opacity-80">{label}</p>
    </div>
  );
}

function Bloco({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div className="surface p-4 space-y-2">
      <p className="label-kicker">{titulo}</p>
      {children}
    </div>
  );
}

function Info({ k, v }: { k: string; v: string | null | undefined }) {
  if (!v) return null;
  return (
    <div className="flex gap-3 text-[12px]">
      <span className="text-muted-foreground flex-1">{k}</span>
      <span className="font-medium text-right max-w-[60%]">{v}</span>
    </div>
  );
}

declare function getApplicationType(): Promise<{
  application: Record<string, never>;
  eventos: { id: string; status: string; nota: string | null; criado_em: string }[];
  documentos: Record<string, string>;
}>;
