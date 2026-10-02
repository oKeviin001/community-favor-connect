import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Result = "pending" | "completed" | "failed";
type Entry = {
  id: string; created_at: string; responsible_user_id: string | null;
  action_description: string; prompt_reference: string | null; objective: string | null;
  affected_files: string[]; result: Result; tests: string | null;
  errors_notes: string | null; related_commit: string | null;
};

const emptyForm = { action_description: "", prompt_reference: "", objective: "", affected_files: "", result: "completed" as Result, tests: "", errors_notes: "", related_commit: "" };

export function SystemMaintenanceLog() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [filter, setFilter] = useState<"all" | Result>("all");
  const [selected, setSelected] = useState<Entry | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  async function load() {
    const { data, error } = await supabase.from("system_maintenance_log").select("*").order("created_at", { ascending: false }).limit(100);
    if (error) return toast.error(error.message);
    setEntries((data ?? []) as Entry[]);
  }
  useEffect(() => { load(); }, []);

  async function register() {
    if (!form.action_description.trim()) return toast.error("Descreva a alteração realizada.");
    setSaving(true);
    const { error } = await supabase.from("system_maintenance_log").insert({
      action_description: form.action_description.trim(),
      prompt_reference: form.prompt_reference.trim() || null,
      objective: form.objective.trim() || null,
      affected_files: form.affected_files.split("\n").map((x) => x.trim()).filter(Boolean),
      result: form.result, tests: form.tests.trim() || null,
      errors_notes: form.errors_notes.trim() || null, related_commit: form.related_commit.trim() || null,
    });
    setSaving(false);
    if (error) return toast.error(error.message);
    setForm(emptyForm); toast.success("Alteração registrada."); await load();
  }

  const visible = filter === "all" ? entries : entries.filter((e) => e.result === filter);
  return (
    <div className="space-y-5">
      <div><h2 className="text-base font-semibold">Registro de Alterações do Sistema</h2>
        <p className="text-xs text-muted-foreground">Histórico técnico das alterações reais executadas no projeto. Credenciais são redigidas antes do armazenamento.</p>
      </div>
      <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
        <p className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">Registrar alteração</p>
        <textarea value={form.action_description} onChange={(e) => setForm({ ...form, action_description: e.target.value })} placeholder="Descrição da alteração realizada" className="w-full min-h-20 rounded-xl border border-border bg-background p-3 text-sm" />
        <input value={form.prompt_reference} onChange={(e) => setForm({ ...form, prompt_reference: e.target.value })} placeholder="Prompt/comando/referência" className="w-full h-10 rounded-xl border border-border bg-background px-3 text-sm" />
        <input value={form.objective} onChange={(e) => setForm({ ...form, objective: e.target.value })} placeholder="Objetivo" className="w-full h-10 rounded-xl border border-border bg-background px-3 text-sm" />
        <textarea value={form.affected_files} onChange={(e) => setForm({ ...form, affected_files: e.target.value })} placeholder="Arquivos afetados — um por linha" className="w-full min-h-20 rounded-xl border border-border bg-background p-3 text-sm" />
        <select value={form.result} onChange={(e) => setForm({ ...form, result: e.target.value as Result })} className="w-full h-10 rounded-xl border border-border bg-background px-3 text-sm">
          <option value="completed">Concluído</option><option value="pending">Pendente</option><option value="failed">Falhou</option>
        </select>
        <input value={form.tests} onChange={(e) => setForm({ ...form, tests: e.target.value })} placeholder="Testes/validação" className="w-full h-10 rounded-xl border border-border bg-background px-3 text-sm" />
        <input value={form.errors_notes} onChange={(e) => setForm({ ...form, errors_notes: e.target.value })} placeholder="Erros/observações" className="w-full h-10 rounded-xl border border-border bg-background px-3 text-sm" />
        <input value={form.related_commit} onChange={(e) => setForm({ ...form, related_commit: e.target.value })} placeholder="Commit relacionado" className="w-full h-10 rounded-xl border border-border bg-background px-3 text-sm" />
        <button type="button" disabled={saving} onClick={register} className="w-full h-11 rounded-xl bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-50">{saving ? "Registrando…" : "Registrar alteração"}</button>
      </div>
      <div className="flex gap-2 overflow-x-auto">
        {(["all", "completed", "pending", "failed"] as const).map((value) => (
          <button key={value} type="button" onClick={() => setFilter(value)} className={`shrink-0 rounded-full px-3 py-2 text-xs border ${filter === value ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border"}`}>
            {value === "all" ? "Todos" : value === "completed" ? "Concluídos" : value === "pending" ? "Pendentes" : "Falhos"}
          </button>
        ))}
      </div>
      <div className="space-y-2">
        {visible.map((entry) => <button key={entry.id} type="button" onClick={() => setSelected(entry)} className="w-full text-left rounded-2xl border border-border bg-card p-4">
          <div className="flex items-start justify-between gap-3"><p className="text-sm font-medium">{entry.action_description}</p><span className="text-[10px] uppercase font-semibold">{entry.result}</span></div>
          <p className="mt-1 text-[11px] text-muted-foreground">{new Date(entry.created_at).toLocaleString("pt-BR")}</p>
          {entry.related_commit && <p className="mt-1 text-[10px] font-mono text-muted-foreground truncate">{entry.related_commit}</p>}
        </button>)}
        {visible.length === 0 && <p className="text-sm text-muted-foreground text-center py-6">Nenhuma alteração registrada.</p>}
      </div>
      {selected && <div className="rounded-2xl border border-border bg-card p-4 space-y-2">
        <div className="flex items-center justify-between gap-3"><h3 className="font-semibold text-sm">Detalhes da alteração</h3><button type="button" onClick={() => setSelected(null)} className="text-xs text-primary">Fechar</button></div>
        <p className="text-sm">{selected.action_description}</p><p className="text-xs text-muted-foreground">Data: {new Date(selected.created_at).toLocaleString("pt-BR")}</p>
        <p className="text-xs text-muted-foreground">Responsável: {selected.responsible_user_id ?? "não informado"}</p>
        {selected.objective && <p className="text-xs">Objetivo: {selected.objective}</p>}
        {selected.prompt_reference && <p className="text-xs break-words">Referência: {selected.prompt_reference}</p>}
        {selected.affected_files.length > 0 && <p className="text-xs break-words">Arquivos: {selected.affected_files.join(", ")}</p>}
        {selected.tests && <p className="text-xs">Testes: {selected.tests}</p>}
        {selected.errors_notes && <p className="text-xs">Observações: {selected.errors_notes}</p>}
        {selected.related_commit && <p className="text-xs font-mono break-all">Commit: {selected.related_commit}</p>}
      </div>}
    </div>
  );
}
