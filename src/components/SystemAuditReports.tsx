import { useState } from "react";
import { ChevronDown, ChevronUp, ClipboardCheck, FileText } from "lucide-react";
import auditReport from "../../AUDITORIA.md?raw";
import currentAudit from "../../AUDITORIA_20261002.md?raw";

const REPORTS = [
  {
    id: "auditoria-20261002",
    name: "Auditoria pós-hardening — revisão atual",
    date: "2026-10-02",
    content: currentAudit,
  },
  {
    id: "auditoria-seguranca-inicial",
    name: "Auditoria técnica de segurança — relatório inicial",
    date: "2026-10-01",
    content: auditReport,
  },
];

export function SystemAuditReports() {
  const [expandedId, setExpandedId] = useState<string>(REPORTS[0].id);

  return (
    <section className="space-y-4" aria-label="Relatórios de auditoria técnica do sistema">
      <header className="flex items-center gap-3">
        <div className="flex size-11 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-600">
          <ClipboardCheck size={23} strokeWidth={2.5} />
        </div>
        <div>
          <h2 className="text-lg font-semibold">Auditorias do Sistema</h2>
          <p className="text-xs text-muted-foreground">
            Relatórios técnicos completos · clique para ver mais ou ver menos
          </p>
        </div>
      </header>

      <div className="space-y-3">
        {REPORTS.map((report) => {
          const expanded = expandedId === report.id;

          return (
            <article key={report.id} className="overflow-hidden rounded-2xl border border-border bg-card">
              <button
                type="button"
                onClick={() => setExpandedId(expanded ? "" : report.id)}
                aria-expanded={expanded}
                className="flex w-full items-center gap-3 p-4 text-left transition-colors hover:bg-muted/40"
              >
                <FileText size={19} className="shrink-0 text-emerald-600" />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold">{report.name}</span>
                  <time dateTime={report.date} className="mt-1 block text-xs text-muted-foreground">
                    {new Date(report.date + "T12:00:00").toLocaleDateString("pt-BR")}
                  </time>
                </span>
                <span className="flex shrink-0 items-center gap-2 text-xs font-medium text-emerald-600">
                  {expanded ? "Ver menos" : "Ver mais"}
                  {expanded ? <ChevronUp size={17} /> : <ChevronDown size={17} />}
                </span>
              </button>

              {expanded && (
                <div className="border-t border-border">
                  <pre className="max-h-[70vh] overflow-auto whitespace-pre-wrap break-words p-4 font-sans text-sm leading-6 text-foreground">
                    {report.content}
                  </pre>
                </div>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}
