import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { RefreshCw, Send, Loader2, Link2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { kevinDashboard, kevinAction } from "@/lib/kevin-system/dashboard.functions";
import { connectCentralKevinV2, sendKevinV2SettingsPing } from "@/lib/dev-actions.functions";

const statusLabels: Record<string, string> = { connected: "Conectada", pending: "Pendente", verified: "Confirmado", revoked: "Revogada", rejected: "Recusado", success: "Sucesso", error: "Falha", partial: "Parcial" };
const date = (value: string | null) => value ? new Date(value).toLocaleString("pt-BR") : "—";

export function KevinSystemPanel() {
  const load = useServerFn(kevinDashboard);
  const run = useServerFn(kevinAction);
  const connect = useServerFn(connectCentralKevinV2);
  const ping = useServerFn(sendKevinV2SettingsPing);
  const query = useQuery({ queryKey: ["kevin-v2-dashboard"], queryFn: () => load(), retry: false });
  const [busy, setBusy] = useState(false);
  const [code, setCode] = useState("");
  const [file, setFile] = useState<File | null>(null);

  async function execute(task: () => Promise<string>) {
    setBusy(true);
    try { toast.success(await task()); }
    catch (error) { toast.error(error instanceof Error ? error.message : "A operação não foi concluída."); }
    finally { setBusy(false); await query.refetch(); }
  }

  async function upload() {
    if (!file) return;
    if (!window.confirm(`Enviar ${file.name} à Central Kevin?`)) return;
    await execute(async () => {
      if (file.size < 1 || file.size > 10 * 1024 * 1024) throw new Error("O arquivo deve ter entre 1 byte e 10 MB.");
      const bytes = new Uint8Array(await file.arrayBuffer());
      let binary = "";
      for (let offset = 0; offset < bytes.length; offset += 0x8000) binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000));
      const result = await run({ data: { action: "send", fileName: file.name, contentType: file.type || "text/plain", base64: btoa(binary) } });
      setFile(null);
      return result.message;
    });
  }

  const dashboard = query.data;
  const ready = dashboard?.readiness;
  const communicationReady = Boolean(ready?.keyConfigured && ready.originsConfigured && ready.bilateralConnection);

  return <section className="space-y-6" aria-label="Sistema Kevin V2">
    <div className="flex items-center justify-between gap-3">
      <h2 className="text-lg font-semibold">Sistema Kevin V2</h2>
      <Button variant="outline" size="icon" title="Atualizar situação" aria-label="Atualizar situação" disabled={busy || query.isFetching} onClick={() => query.refetch()}><RefreshCw /></Button>
    </div>
    {query.isPending && <p role="status" className="flex gap-2 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" />Carregando situação…</p>}
    {query.error && <p role="alert" className="text-sm text-destructive">{query.error instanceof Error ? query.error.message : "Não foi possível consultar o sistema."}</p>}
    {dashboard && <>
      <div className="border-b border-border pb-4 space-y-2">
        <h3 className="font-medium">{dashboard.identity.app_name}</h3>
        <p className="text-sm text-muted-foreground">{dashboard.identity.app_slug} · versão {dashboard.identity.app_version}</p>
        <dl className="grid gap-2 text-sm">
          <div className="flex justify-between gap-2"><dt>Configuração segura</dt><dd>{ready?.keyConfigured && ready.originsConfigured ? "Disponível" : "Incompleta"}</dd></div>
          <div className="flex justify-between gap-2"><dt>Armazenamento de arquivos</dt><dd>{ready?.filesAvailable ? "Disponível" : "Indisponível"}</dd></div>
          <div className="flex justify-between gap-2"><dt>Comandos aceitos</dt><dd>Diagnóstico do sistema</dd></div>
        </dl>
      </div>
      <div className="space-y-3">
        <h3 className="font-medium">Conexões</h3>
        {!dashboard.connections.length && <p className="text-sm text-muted-foreground">Nenhuma conexão cadastrada.</p>}
        {dashboard.connections.map(connection => <article key={connection.id} className="border border-border rounded-lg p-3 space-y-1">
          <div className="flex justify-between gap-2"><h4 className="font-medium">{connection.remote_name}</h4><span className="text-sm">{statusLabels[connection.status] ?? connection.status}</span></div>
          <p className="break-all text-xs text-muted-foreground">{connection.remote_origin}</p>
          <p className="text-xs text-muted-foreground">Confirmação: {date(connection.confirmed_at)}</p>
          <p className="text-xs text-muted-foreground">Última sincronização: {date(connection.last_successful_sync_at)}</p>
          {!connection.remote_connection_id && <p className="text-xs text-destructive">Confirmação bilateral incompleta.</p>}
          {connection.last_error_code && <p className="text-xs text-destructive">{connection.last_error_code}</p>}
        </article>)}
      </div>
    </>}
    {!ready?.bilateralConnection && <div className="space-y-3 border-t border-border pt-4">
      <label htmlFor="kevin-code" className="text-sm font-medium">Código da Central Kevin</label>
      <Input id="kevin-code" autoComplete="off" placeholder="KVN-XXXX-XXXX-XXXX" value={code} onChange={event => setCode(event.target.value.toUpperCase())} />
      <Button disabled={busy || !code.trim() || !ready?.keyConfigured} onClick={() => execute(async () => { await connect({ data: { code } }); setCode(""); return "Central Kevin confirmou a conexão."; })}><Link2 />Conectar</Button>
    </div>}
    <div className="flex flex-wrap gap-2 border-t border-border pt-4">
      <Button variant="outline" disabled={busy || !communicationReady} onClick={() => execute(async () => { const result = await ping(); return result.alreadyDelivered ? "Diagnóstico já confirmado anteriormente." : `Diagnóstico confirmado: HTTP ${result.httpStatus}.`; })}>Testar comunicação</Button>
      <Button variant="outline" disabled={busy || !communicationReady} onClick={() => execute(async () => (await run({ data: { action: "commands" } })).message)}>Consultar comandos</Button>
    </div>
    <div className="space-y-3 border-t border-border pt-4">
      <h3 className="font-medium">Arquivos para a Central</h3>
      <Input type="file" aria-label="Arquivo para transferir" accept=".pdf,.json,.zip,.txt,.jpg,.jpeg,.png,.webp" disabled={busy || !communicationReady || !ready?.filesAvailable} onChange={event => setFile(event.target.files?.[0] ?? null)} />
      <div className="flex flex-wrap gap-2">
        <Button disabled={busy || !file || !communicationReady || !ready?.filesAvailable} onClick={upload}><Send />Enviar arquivo</Button>
        <Button variant="outline" disabled={busy || !communicationReady || !ready?.filesAvailable} onClick={() => execute(async () => (await run({ data: { action: "retry" } })).message)}>Reenviar pendentes</Button>
      </div>
      {dashboard?.files.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma transferência registrada.</p>}
      {dashboard?.files.map(item => <article key={item.transfer_id} className="border-b border-border py-2 text-sm">
        <p className="break-all font-medium">{item.file_name}</p>
        <p className="text-xs text-muted-foreground">{item.direction === "outbound" ? "Enviado" : "Recebido"} · {statusLabels[item.status] ?? item.status} · {Math.ceil(item.size_bytes / 1024)} KB</p>
      </article>)}
    </div>
    <div className="space-y-2 border-t border-border pt-4">
      <h3 className="font-medium">Histórico de comunicação</h3>
      {dashboard?.history.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma comunicação registrada.</p>}
      {dashboard?.history.map((item, index) => <div key={index} className="border-b border-border py-2 text-xs">
        <p>{item.operation} · {statusLabels[item.status] ?? item.status} · {item.item_count} item(ns)</p>
        <p className="text-muted-foreground">{date(item.created_at)}{item.error_code ? ` · ${item.error_code}` : ""}</p>
      </div>)}
    </div>
  </section>;
}