import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  Brain,
  Check,
  Copy,
  Database,
  History,
  Link2,
  Loader2,
  Plug,
  RefreshCw,
  Shield,
  Trash2,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { useUser } from "@/lib/use-user";
import { TIPOS_DADOS, labelTipo } from "@/lib/kevin/shared";
import {
  aprenderKevin,
  atualizarPermissoesKevin,
  autotesteKevin,
  carregarPainelKevin,
  conectarCodigoKevin,
  criarBackupKevin,
  enviarDadosKevin,
  gerarCodigoKevin,
  receberDadosKevin,
  removerConexaoKevin,
  restaurarBackupKevin,
  sincronizarKevin,
} from "@/lib/kevin.functions";

export const Route = createFileRoute("/_authenticated/transferencia")({
  head: () => ({
    meta: [
      { title: "Transferência — Ecossistema Kevin" },
      { name: "description", content: "Conecte aplicativos do ecossistema Kevin, compartilhe dados autorizados e mantenha backups sincronizados." },
      { property: "og:title", content: "Transferência — Ecossistema Kevin" },
      { property: "og:description", content: "Protocolo Kevin: conexão, aprendizado estrutural, backups e sincronização entre aplicativos." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Transferencia,
});

interface Conexao {
  id: string;
  remote_nome: string;
  remote_uuid: string;
  remote_versao: string | null;
  remote_base_url: string | null;
  direcao: string;
  permissoes: string[];
  status: string;
  ultimo_erro: string | null;
  conectado_em: string;
  ultima_sync: string | null;
  estrutura: Record<string, unknown> | null;
}
interface Codigo {
  id: string;
  codigo: string;
  status: string;
  criado_em: string;
  expira_em: string;
  usado_por_nome: string | null;
  usado_em: string | null;
  permissoes: string[];
}
interface LogRow {
  id: string;
  origem: string;
  destino: string;
  operacao: string;
  direcao: string;
  tipos: string[];
  registros: number;
  status: string;
  erro: string | null;
  criado_em: string;
}
interface BackupRow {
  id: string;
  origem: string;
  itens: string[];
  registros: number;
  tamanho_bytes: number;
  status: string;
  criado_em: string;
}
interface Painel {
  manifesto: Record<string, unknown>;
  codigos: Codigo[];
  conexoes: Conexao[];
  historico: LogRow[];
  backups: BackupRow[];
  recebidos: { id: string; origem: string; tipo: string; remote_id: string; recebido_em: string }[];
  pendentes: number;
}

type Aba = "conexoes" | "dados" | "aprender" | "historico" | "backups" | "status";

const ABAS: { id: Aba; label: string }[] = [
  { id: "conexoes", label: "Conexões" },
  { id: "dados", label: "Dados" },
  { id: "aprender", label: "Aprender" },
  { id: "historico", label: "Histórico" },
  { id: "backups", label: "Backups" },
  { id: "status", label: "Status" },
];

function dt(v?: string | null) {
  return v ? new Date(v).toLocaleString("pt-BR") : "—";
}

function Vazio({ texto }: { texto: string }) {
  return <p className="text-sm text-muted-foreground text-center py-8">{texto}</p>;
}

function Card({ children }: { children: React.ReactNode }) {
  return <div className="bg-card border border-border rounded-2xl p-4 space-y-3">{children}</div>;
}

function Seletor({
  selecionados,
  onToggle,
}: {
  selecionados: string[];
  onToggle: (id: string) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {TIPOS_DADOS.map((t) => {
        const on = selecionados.includes(t.id);
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => onToggle(t.id)}
            className={`flex items-center gap-2 h-10 px-3 rounded-xl text-xs font-medium ring-1 text-left ${
              on ? "bg-primary/10 text-primary ring-primary/30" : "bg-secondary ring-black/5 text-muted-foreground"
            }`}
          >
            <span className={`size-4 rounded-md grid place-items-center ring-1 ${on ? "bg-primary ring-primary" : "ring-black/15"}`}>
              {on && <Check size={11} className="text-primary-foreground" />}
            </span>
            {t.label}
          </button>
        );
      })}
    </div>
  );
}

function Transferencia() {
  const { isAdmin, loading } = useUser();
  const [aba, setAba] = useState<Aba>("conexoes");
  const [painel, setPainel] = useState<Painel | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const carregar = useServerFn(carregarPainelKevin);
  const gerar = useServerFn(gerarCodigoKevin);
  const conectar = useServerFn(conectarCodigoKevin);
  const enviar = useServerFn(enviarDadosKevin);
  const receber = useServerFn(receberDadosKevin);
  const aprender = useServerFn(aprenderKevin);
  const permissoesFn = useServerFn(atualizarPermissoesKevin);
  const remover = useServerFn(removerConexaoKevin);
  const backupFn = useServerFn(criarBackupKevin);
  const restaurar = useServerFn(restaurarBackupKevin);
  const sincronizar = useServerFn(sincronizarKevin);
  const autoteste = useServerFn(autotesteKevin);

  const [permCodigo, setPermCodigo] = useState<string[]>(["usuarios", "pedidos", "avaliacoes"]);
  const [codigoInput, setCodigoInput] = useState("");
  const [urlInput, setUrlInput] = useState("");
  const [conexaoSel, setConexaoSel] = useState<string>("");
  const [tiposEnvio, setTiposEnvio] = useState<string[]>(["pedidos"]);
  const [tiposRecebe, setTiposRecebe] = useState<string[]>(["pedidos"]);
  const [teste, setTeste] = useState<{ etapa: string; ok: boolean; detalhe: string }[] | null>(null);

  const refresh = useCallback(async () => {
    try {
      const data = (await carregar()) as Painel;
      setPainel(data);
      setConexaoSel((atual) => atual || data.conexoes[0]?.id || "");
    } catch (e) {
      toast.error((e as Error).message);
    }
  }, [carregar]);

  useEffect(() => {
    if (isAdmin) refresh();
  }, [isAdmin, refresh]);

  // Verificação automática de sincronização a cada 1 minuto
  useEffect(() => {
    if (!isAdmin) return;
    const id = setInterval(() => {
      sincronizar()
        .then(() => refresh())
        .catch(() => undefined);
    }, 60_000);
    return () => clearInterval(id);
  }, [isAdmin, sincronizar, refresh]);

  const conexaoAtual = useMemo(
    () => painel?.conexoes.find((c) => c.id === conexaoSel) ?? null,
    [painel, conexaoSel],
  );

  async function run(key: string, fn: () => Promise<unknown>, sucesso?: string) {
    setBusy(key);
    try {
      const r = await fn();
      if (sucesso) toast.success(sucesso);
      await refresh();
      return r;
    } catch (e) {
      toast.error((e as Error).message);
      return null;
    } finally {
      setBusy(null);
    }
  }

  if (loading) {
    return (
      <AppShell>
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="animate-spin text-primary" />
        </div>
      </AppShell>
    );
  }

  if (!isAdmin) {
    return (
      <AppShell>
        <div className="p-8 text-center space-y-3">
          <Shield size={28} className="mx-auto text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Transferência é restrita a administradores.</p>
          <Link to="/home" className="text-primary text-sm font-semibold">Voltar ao início</Link>
        </div>
      </AppShell>
    );
  }

  const manifesto = painel?.manifesto ?? {};

  return (
    <AppShell>
      <header className="px-6 pt-10 pb-4">
        <p className="text-[11px] uppercase tracking-wider text-accent font-medium">Ecossistema Kevin</p>
        <h1 className="text-2xl font-semibold">Transferência</h1>
        <p className="text-xs text-muted-foreground mt-1">
          {String(manifesto.nome ?? "—")} · v{String(manifesto.versao ?? "—")} · {String(manifesto.protocolo ?? "")}
        </p>
      </header>

      <div className="px-6 flex gap-2 overflow-x-auto pb-3">
        {ABAS.map((a) => (
          <button
            key={a.id}
            onClick={() => setAba(a.id)}
            className={`h-9 px-3 rounded-2xl text-xs font-semibold whitespace-nowrap ring-1 ${
              aba === a.id ? "bg-primary text-primary-foreground ring-primary" : "bg-card ring-black/5"
            }`}
          >
            {a.label}
          </button>
        ))}
      </div>

      <div className="px-6 pb-28 space-y-4">
        {aba === "conexoes" && (
          <>
            <Card>
              <h2 className="text-sm font-semibold flex items-center gap-2"><Plug size={15} /> Gerar código</h2>
              <p className="text-xs text-muted-foreground">
                Autorização temporária de uso único. O outro aplicativo digita o código e o endereço deste app.
              </p>
              <Seletor
                selecionados={permCodigo}
                onToggle={(id) =>
                  setPermCodigo((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]))
                }
              />
              <button
                disabled={busy === "gerar"}
                onClick={() => run("gerar", () => gerar({ data: { permissoes: permCodigo, minutos: 30 } }), "Código gerado")}
                className="w-full h-11 rounded-2xl bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-60"
              >
                {busy === "gerar" ? "Gerando..." : "Gerar código"}
              </button>
              <div className="space-y-2">
                {(painel?.codigos.length ?? 0) === 0 && <Vazio texto="Nenhum código gerado." />}
                {painel?.codigos.map((c) => (
                  <div key={c.id} className="rounded-xl bg-secondary p-3">
                    <div className="flex items-center justify-between gap-2">
                      <code className="text-sm font-semibold tracking-wide">{c.codigo}</code>
                      <button
                        onClick={() => {
                          navigator.clipboard?.writeText(c.codigo);
                          toast.success("Código copiado");
                        }}
                        className="text-muted-foreground"
                        aria-label="Copiar código"
                      >
                        <Copy size={14} />
                      </button>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-1">
                      Gerado {dt(c.criado_em)} · Expira {dt(c.expira_em)} ·{" "}
                      <span className="uppercase">{c.status}</span>
                    </p>
                    {c.usado_por_nome && (
                      <p className="text-[11px] text-muted-foreground">
                        Utilizado por {c.usado_por_nome} em {dt(c.usado_em)}
                      </p>
                    )}
                    <p className="text-[11px] text-muted-foreground">
                      Permissões: {c.permissoes.length ? c.permissoes.map(labelTipo).join(", ") : "nenhuma"}
                    </p>
                  </div>
                ))}
              </div>
            </Card>

            <Card>
              <h2 className="text-sm font-semibold flex items-center gap-2"><Link2 size={15} /> Adicionar código</h2>
              <input
                value={codigoInput}
                onChange={(e) => setCodigoInput(e.target.value.toUpperCase())}
                placeholder="KVN-0000-0000-0000"
                className="w-full h-11 rounded-xl bg-secondary px-3 text-sm tracking-wide"
              />
              <input
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="https://central-kevin.lovable.app"
                className="w-full h-11 rounded-xl bg-secondary px-3 text-sm"
              />
              <button
                disabled={busy === "conectar" || !codigoInput || !urlInput}
                onClick={() =>
                  run(
                    "conectar",
                    () =>
                      conectar({
                        data: { codigo: codigoInput, remoteBaseUrl: urlInput, baseUrl: window.location.origin },
                      }),
                    "Aplicativo compatível conectado",
                  ).then((r) => {
                    if (r) {
                      setCodigoInput("");
                      setUrlInput("");
                    }
                  })
                }
                className="w-full h-11 rounded-2xl bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-60"
              >
                {busy === "conectar" ? "Validando..." : "Conectar"}
              </button>
            </Card>

            <Card>
              <h2 className="text-sm font-semibold">Aplicativos conectados</h2>
              {(painel?.conexoes.length ?? 0) === 0 && <Vazio texto="Nenhum dado disponível." />}
              {painel?.conexoes.map((c) => (
                <div key={c.id} className="rounded-xl bg-secondary p-3 space-y-2">
                  <div className="flex justify-between gap-2">
                    <p className="text-sm font-semibold">
                      {c.status === "conectado" ? "✓ " : "⚠ "}
                      {c.remote_nome}
                    </p>
                    <button onClick={() => run("rm" + c.id, () => remover({ data: { conexaoId: c.id } }), "Conexão removida")}>
                      <Trash2 size={14} className="text-destructive" />
                    </button>
                  </div>
                  <p className="text-[11px] text-muted-foreground break-all">
                    ID {c.remote_uuid} · v{c.remote_versao ?? "—"} · {c.remote_base_url ?? "sem endereço"}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    Conectado {dt(c.conectado_em)} · Última sincronização {dt(c.ultima_sync)} · {c.status}
                  </p>
                  {c.ultimo_erro && <p className="text-[11px] text-destructive">{c.ultimo_erro}</p>}
                  <p className="text-[11px] font-medium">O que é compartilhado:</p>
                  <Seletor
                    selecionados={c.permissoes}
                    onToggle={(id) => {
                      const novas = c.permissoes.includes(id)
                        ? c.permissoes.filter((x) => x !== id)
                        : [...c.permissoes, id];
                      run("perm" + c.id, () => permissoesFn({ data: { conexaoId: c.id, permissoes: novas } }));
                    }}
                  />
                </div>
              ))}
            </Card>
          </>
        )}

        {aba === "dados" && (
          <>
            {(painel?.conexoes.length ?? 0) === 0 ? (
              <Card><Vazio texto="Conecte um aplicativo para enviar ou receber dados." /></Card>
            ) : (
              <>
                <Card>
                  <label className="text-xs text-muted-foreground">Aplicativo</label>
                  <select
                    value={conexaoSel}
                    onChange={(e) => setConexaoSel(e.target.value)}
                    className="w-full h-11 rounded-xl bg-secondary px-3 text-sm"
                  >
                    {painel?.conexoes.map((c) => (
                      <option key={c.id} value={c.id}>{c.remote_nome}</option>
                    ))}
                  </select>
                  {conexaoAtual && (
                    <p className="text-[11px] text-muted-foreground">
                      Autorizado: {conexaoAtual.permissoes.length ? conexaoAtual.permissoes.map(labelTipo).join(", ") : "nada"}
                    </p>
                  )}
                </Card>

                <Card>
                  <h2 className="text-sm font-semibold flex items-center gap-2"><ArrowUpFromLine size={15} /> Enviar dados</h2>
                  <Seletor
                    selecionados={tiposEnvio}
                    onToggle={(id) => setTiposEnvio((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]))}
                  />
                  <button
                    disabled={busy === "enviar" || !conexaoSel}
                    onClick={() =>
                      run("enviar", async () => {
                        const r = (await enviar({ data: { conexaoId: conexaoSel, tipos: tiposEnvio } })) as { registros: number };
                        toast.success(`${r.registros} registro(s) enviado(s)`);
                        return r;
                      })
                    }
                    className="w-full h-11 rounded-2xl bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-60"
                  >
                    {busy === "enviar" ? "Enviando..." : "Enviar agora"}
                  </button>
                </Card>

                <Card>
                  <h2 className="text-sm font-semibold flex items-center gap-2"><ArrowDownToLine size={15} /> Receber dados</h2>
                  <Seletor
                    selecionados={tiposRecebe}
                    onToggle={(id) => setTiposRecebe((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]))}
                  />
                  <button
                    disabled={busy === "receber" || !conexaoSel}
                    onClick={() =>
                      run("receber", async () => {
                        const r = (await receber({ data: { conexaoId: conexaoSel, tipos: tiposRecebe } })) as { registros: number };
                        toast.success(`${r.registros} registro(s) recebido(s)`);
                        return r;
                      })
                    }
                    className="w-full h-11 rounded-2xl bg-secondary text-sm font-semibold disabled:opacity-60"
                  >
                    {busy === "receber" ? "Recebendo..." : "Receber agora"}
                  </button>
                </Card>

                <Card>
                  <h2 className="text-sm font-semibold">Dados recebidos</h2>
                  {(painel?.recebidos.length ?? 0) === 0 && <Vazio texto="Aguardando sincronização." />}
                  {painel?.recebidos.map((r) => (
                    <p key={r.id} className="text-[11px] text-muted-foreground break-all">
                      {labelTipo(r.tipo)} · {r.origem} · {r.remote_id} · {dt(r.recebido_em)}
                    </p>
                  ))}
                </Card>
              </>
            )}
          </>
        )}

        {aba === "aprender" && (
          <Card>
            <h2 className="text-sm font-semibold flex items-center gap-2"><Brain size={15} /> Aprender estrutura</h2>
            <p className="text-xs text-muted-foreground">
              Lê apenas a estrutura do outro aplicativo (módulos, tipos, permissões). Nenhum dado pessoal é acessado.
            </p>
            {(painel?.conexoes.length ?? 0) === 0 && <Vazio texto="Nenhum aplicativo conectado." />}
            {painel?.conexoes.map((c) => (
              <div key={c.id} className="rounded-xl bg-secondary p-3 space-y-2">
                <div className="flex justify-between items-center gap-2">
                  <p className="text-sm font-semibold">{c.remote_nome}</p>
                  <button
                    disabled={busy === "learn" + c.id}
                    onClick={() => run("learn" + c.id, () => aprender({ data: { conexaoId: c.id } }), "Estrutura aprendida")}
                    className="h-9 px-3 rounded-xl bg-primary text-primary-foreground text-xs font-semibold"
                  >
                    Aprender
                  </button>
                </div>
                {c.estrutura ? (
                  <pre className="text-[10px] text-muted-foreground overflow-x-auto whitespace-pre-wrap">
                    {JSON.stringify(c.estrutura, null, 1)}
                  </pre>
                ) : (
                  <p className="text-[11px] text-muted-foreground">Estrutura ainda não aprendida.</p>
                )}
              </div>
            ))}
          </Card>
        )}

        {aba === "historico" && (
          <Card>
            <h2 className="text-sm font-semibold flex items-center gap-2"><History size={15} /> Histórico</h2>
            {(painel?.historico.length ?? 0) === 0 && <Vazio texto="Nenhum dado disponível." />}
            {painel?.historico.map((h) => (
              <div key={h.id} className="rounded-xl bg-secondary p-3">
                <div className="flex justify-between gap-2">
                  <p className="text-xs font-semibold capitalize">{h.operacao}</p>
                  <span className={`text-[10px] uppercase ${h.status === "concluido" ? "text-accent" : "text-destructive"}`}>
                    {h.status}
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  {h.origem} → {h.destino} · {dt(h.criado_em)}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {h.registros} registro(s){h.tipos.length ? ` · ${h.tipos.map(labelTipo).join(", ")}` : ""}
                </p>
                {h.erro && <p className="text-[11px] text-destructive break-words">{h.erro}</p>}
              </div>
            ))}
          </Card>
        )}

        {aba === "backups" && (
          <Card>
            <h2 className="text-sm font-semibold flex items-center gap-2"><Database size={15} /> Backups</h2>
            <button
              disabled={busy === "backup"}
              onClick={() => run("backup", () => backupFn(), "Backup criado")}
              className="w-full h-11 rounded-2xl bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-60"
            >
              {busy === "backup" ? "Gerando..." : "Criar backup agora"}
            </button>
            {(painel?.backups.length ?? 0) === 0 && <Vazio texto="Nenhum dado disponível." />}
            {painel?.backups.map((b) => (
              <div key={b.id} className="rounded-xl bg-secondary p-3 space-y-1">
                <p className="text-xs font-semibold">{dt(b.criado_em)}</p>
                <p className="text-[11px] text-muted-foreground">
                  Origem: {b.origem} · {b.registros} registro(s) · {(b.tamanho_bytes / 1024).toFixed(1)} KB · {b.status}
                </p>
                <p className="text-[11px] text-muted-foreground">Itens: {b.itens.map(labelTipo).join(", ")}</p>
                <button
                  disabled={busy === "rest" + b.id}
                  onClick={() => {
                    if (!window.confirm("Restaurar este backup? Registros ausentes serão recriados.")) return;
                    run("rest" + b.id, async () => {
                      const r = (await restaurar({ data: { backupId: b.id } })) as { restaurados: number };
                      toast.success(`${r.restaurados} registro(s) restaurado(s)`);
                      return r;
                    });
                  }}
                  className="h-9 px-3 rounded-xl bg-card ring-1 ring-black/5 text-xs font-semibold"
                >
                  Restaurar
                </button>
              </div>
            ))}
          </Card>
        )}

        {aba === "status" && (
          <>
            <Card>
              <h2 className="text-sm font-semibold flex items-center gap-2"><RefreshCw size={15} /> Status da sincronização</h2>
              <p className="text-xs text-muted-foreground">
                Alterações pendentes: <strong>{painel?.pendentes ?? 0}</strong> · Aplicativos conectados:{" "}
                <strong>{painel?.conexoes.length ?? 0}</strong>
              </p>
              <p className="text-[11px] text-muted-foreground">
                Verificação automática a cada 1 minuto enquanto esta tela estiver aberta; cada alteração relevante é
                registrada automaticamente pelo banco de dados.
              </p>
              <button
                disabled={busy === "sync"}
                onClick={() => run("sync", () => sincronizar(), "Sincronização verificada")}
                className="w-full h-11 rounded-2xl bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-60"
              >
                {busy === "sync" ? "Sincronizando..." : "Sincronizar agora"}
              </button>
            </Card>

            <Card>
              <h2 className="text-sm font-semibold">Manifesto Kevin</h2>
              <pre className="text-[10px] text-muted-foreground overflow-x-auto whitespace-pre-wrap">
                {JSON.stringify(manifesto, null, 1)}
              </pre>
            </Card>

            <Card>
              <h2 className="text-sm font-semibold">Teste de integração</h2>
              <button
                disabled={busy === "teste"}
                onClick={() =>
                  run("teste", async () => {
                    const r = (await autoteste({ data: { baseUrl: window.location.origin } })) as {
                      ok: boolean;
                      etapas: { etapa: string; ok: boolean; detalhe: string }[];
                    };
                    setTeste(r.etapas);
                    toast[r.ok ? "success" : "error"](r.ok ? "Integração validada" : "Falha no teste");
                    return r;
                  })
                }
                className="w-full h-11 rounded-2xl bg-secondary text-sm font-semibold disabled:opacity-60"
              >
                {busy === "teste" ? "Testando..." : "Executar teste de conexão real"}
              </button>
              {teste?.map((e) => (
                <p key={e.etapa} className={`text-[11px] ${e.ok ? "text-accent" : "text-destructive"}`}>
                  {e.ok ? "✓" : "✗"} {e.etapa} — {e.detalhe}
                </p>
              ))}
            </Card>
          </>
        )}
      </div>
    </AppShell>
  );
}
