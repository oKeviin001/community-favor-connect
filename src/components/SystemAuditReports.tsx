import { useState } from "react";
import { ClipboardCheck, FileText } from "lucide-react";
import auditReport from "../../AUDITORIA.md?raw";

const REPORTS = [
  {
    id: "auditoria-seguranca-inicial",
    name: "Auditoria técnica de segurança — relatório completo",
    date: "2026-10-01",
    content: auditReport,
  },
];

export function SystemAuditReports() {
  const [selectedId, setSelectedId] = useState<string>(REPORTS[0].id);
  const selected = REPORTS.find((report) => report.id === selectedId) ?? REPORTS[0];

  return (
    <section className="space-y-4" aria-label="Relatórios de auditoria técnica do sistema">
      <header className="flex items-center gap-3">
        <div className="flex size-11 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-600">
          <ClipboardCheck size={23} strokeWidth={2.5} />
        </div>
        <div>
          <h2 className="text-lg font-semibold">Auditorias do Sistema</h2>
          <p className="text-xs text-muted-foreground">Relatórios técnicos completos</p>
        </div>
      </header>

      <div className="space-y-2">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Relatórios disponíveis
        </h3>
        {REPORTS.map((report) => (
          <button
            key={report.id}
            type="button"
            onClick={() => setSelectedId(report.id)}
            aria-pressed={selectedId === report.id}
            className={`flex w-full items-center gap-3 rounded-2xl border p-4 text-left ${
              selectedId === report.id
                ? "border-emerald-500/50 bg-emerald-500/5"
                : "border-border bg-card"
            }`}
          >
            <FileText size={19} className="shrink-0 text-emerald-600" />
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-medium">{report.name}</span>
              <time dateTime={report.date} className="mt-1 block text-xs text-muted-foreground">
                {new Date(`${report.date}T12:00:00`).toLocaleDateString("pt-BR")}
              </time>
            </span>
          </button>
        ))}
      </div>

      {selected && (
        <article className="overflow-hidden rounded-2xl border border-border bg-card">
          <header className="border-b border-border p-4">
            <h3 className="text-sm font-semibold">{selected.name}</h3>
            <time dateTime={selected.date} className="mt-1 block text-xs text-muted-foreground">
              {new Date(`${selected.date}T12:00:00`).toLocaleDateString("pt-BR")}
            </time>
          </header>
          <pre className="max-h-[70vh] overflow-auto whitespace-pre-wrap break-words p-4 font-sans text-sm leading-6 text-foreground">
            {selected.content}
          </pre>
        </article>
      )}
    </section>
  );
}
