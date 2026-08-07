import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { ChevronLeft, Check } from "lucide-react";
import { STATUS_LABEL, STATUS_TONE } from "@/lib/order-helpers";

/** Cabeçalho padrão de tela interna, com botão voltar opcional. */
export function PageHeader({
  kicker,
  title,
  subtitle,
  backTo,
  right,
}: {
  kicker?: string;
  title: string;
  subtitle?: string;
  backTo?: string;
  right?: ReactNode;
}) {
  return (
    <header className="px-6 pt-10 pb-4 flex items-start gap-3">
      {backTo && (
        <Link
          to={backTo}
          className="size-10 rounded-full bg-card border border-border shadow-soft flex items-center justify-center shrink-0 mt-0.5"
          aria-label="Voltar"
        >
          <ChevronLeft size={18} />
        </Link>
      )}
      <div className="flex-1 min-w-0">
        {kicker && <p className="label-kicker">{kicker}</p>}
        <h1 className="text-[26px] font-semibold leading-tight text-balance mt-1">{title}</h1>
        {subtitle && <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">{subtitle}</p>}
      </div>
      {right}
    </header>
  );
}

/** Título numerado de seção, no padrão "1. Escolha o tipo de serviço". */
export function SectionTitle({ index, children }: { index?: number; children: ReactNode }) {
  return (
    <h2 className="text-[15px] font-semibold flex items-center gap-2 mb-3">
      {index != null && <span className="text-primary">{index}.</span>}
      {children}
    </h2>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const tone = STATUS_TONE[status] ?? "neutral";
  const map: Record<string, string> = {
    neutral: "bg-secondary text-muted-foreground border-border",
    info: "bg-primary/10 text-primary border-primary/20",
    success: "bg-success/10 text-success border-success/20",
    warning: "bg-warning/15 text-warning-foreground border-warning/30",
    danger: "bg-destructive/10 text-destructive border-destructive/20",
  };
  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold border whitespace-nowrap ${map[tone]}`}
    >
      {STATUS_LABEL[status] ?? status}
    </span>
  );
}

/** Estado vazio padronizado — nunca exibimos dados fictícios. */
export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="surface p-8 text-center fade-rise">
      {icon && (
        <div className="size-12 rounded-2xl bg-secondary border border-border flex items-center justify-center mx-auto mb-3 text-muted-foreground">
          {icon}
        </div>
      )}
      <p className="text-sm font-semibold">{title}</p>
      {description && <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function SkeletonCard({ className = "h-24" }: { className?: string }) {
  return <div className={`card-flat animate-pulse bg-secondary ${className}`} />;
}

/** Indicador de passos "1 — 2 — 3 — 4" usado nos formulários longos. */
export function StepBar({ total, current }: { total: number; current: number }) {
  return (
    <div className="flex items-center px-1" role="progressbar" aria-valuemin={1} aria-valuemax={total} aria-valuenow={current}>
      {Array.from({ length: total }).map((_, i) => {
        const step = i + 1;
        const done = step < current;
        const active = step === current;
        return (
          <div key={step} className="flex items-center flex-1 last:flex-none">
            <div
              className={`size-7 rounded-full text-[11px] font-bold flex items-center justify-center shrink-0 transition-colors ${
                done
                  ? "bg-success text-success-foreground"
                  : active
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-muted-foreground border border-border"
              }`}
            >
              {done ? <Check size={13} strokeWidth={3} /> : step}
            </div>
            {step < total && (
              <div className={`h-0.5 flex-1 mx-1.5 rounded-full ${done ? "bg-success" : "bg-border"}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

export function Field({
  label,
  hint,
  required,
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <div>
      <label className="label-kicker">
        {label}
        {required && <span className="text-destructive ml-1">*</span>}
      </label>
      <div className="mt-1.5">{children}</div>
      {hint && <p className="text-[11px] text-muted-foreground mt-1.5 leading-relaxed">{hint}</p>}
    </div>
  );
}

export function InfoRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 text-sm">
      <span className="text-muted-foreground shrink-0">{label}</span>
      <span className="font-medium text-right break-words">{value}</span>
    </div>
  );
}