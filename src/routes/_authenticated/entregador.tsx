import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { CourierShell } from "@/components/CourierShell";
import { Bike, Clock, Loader2, ShieldCheck, XCircle } from "lucide-react";

export const Route = createFileRoute("/_authenticated/entregador")({
  component: EntregadorGate,
});

type Status = "sem_candidatura" | "pendente" | "aprovado" | "reprovado";

function EntregadorGate() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const [status, setStatus] = useState<Status | null>(null);
  const [nota, setNota] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      const { data: app } = await supabase
        .from("courier_applications")
        .select("status, analise_observacao")
        .eq("user_id", u.user.id)
        .maybeSingle();
      if (!mounted) return;
      const raw = app?.status ?? null;
      setNota(app?.analise_observacao ?? null);
      setStatus(
        raw === "aprovado" ? "aprovado" : raw === "reprovado" ? "reprovado" : raw ? "pendente" : "sem_candidatura",
      );
    })();
    return () => {
      mounted = false;
    };
  }, [path]);

  if (path.startsWith("/entregador/cadastro")) return <Outlet />;

  if (status === null) {
    return (
      <CourierShell hideNav>
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="animate-spin text-primary" />
        </div>
      </CourierShell>
    );
  }

  if (status === "aprovado") return <Outlet />;

  return (
    <CourierShell hideNav>
      <div className="px-6 pt-16 pb-10 flex flex-col items-center text-center fade-rise">
        {status === "pendente" ? (
          <>
            <div className="size-16 rounded-2xl bg-warning/10 text-warning flex items-center justify-center border border-warning/20">
              <Clock size={28} />
            </div>
            <h1 className="text-[26px] font-semibold mt-5 text-balance">Sua candidatura foi enviada</h1>
            <p className="text-sm text-muted-foreground mt-2 leading-relaxed max-w-sm">
              Recebemos seus dados. Nossa equipe irá analisar suas informações antes da aprovação.
            </p>
            <span className="mt-5 inline-flex items-center gap-2 px-4 h-9 rounded-full text-[12px] font-semibold bg-warning/10 text-warning border border-warning/20">
              🟡 Em análise
            </span>
            <div className="surface p-4 mt-8 text-left w-full space-y-2">
              <p className="text-[13px] font-semibold">Enquanto estiver em análise</p>
              <p className="text-[12px] text-muted-foreground">• Você não visualiza pedidos disponíveis</p>
              <p className="text-[12px] text-muted-foreground">• Você não pode aceitar pedidos</p>
              <p className="text-[12px] text-muted-foreground">• As ferramentas de entregador ficam bloqueadas</p>
            </div>
            <Link
              to="/entregador/cadastro"
              className="mt-6 text-[13px] text-primary font-semibold underline underline-offset-4"
            >
              Revisar meus dados
            </Link>
          </>
        ) : status === "reprovado" ? (
          <>
            <div className="size-16 rounded-2xl bg-destructive/10 text-destructive flex items-center justify-center border border-destructive/20">
              <XCircle size={28} />
            </div>
            <h1 className="text-[26px] font-semibold mt-5 text-balance">Candidatura não aprovada</h1>
            <p className="text-sm text-muted-foreground mt-2 leading-relaxed max-w-sm">
              Sua candidatura foi analisada e não foi aprovada neste momento. A área de entregas segue bloqueada.
            </p>
            {nota && (
              <div className="surface p-4 mt-6 text-left w-full">
                <p className="label-kicker mb-1">Observação da análise</p>
                <p className="text-[13px]">{nota}</p>
              </div>
            )}
            <Link
              to="/entregador/cadastro"
              className="mt-7 h-13 px-6 inline-flex items-center rounded-2xl bg-primary text-primary-foreground text-sm font-semibold h-12"
            >
              Enviar nova candidatura
            </Link>
          </>
        ) : (
          <>
            <div className="size-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center border border-primary/20">
              <Bike size={28} />
            </div>
            <h1 className="text-[26px] font-semibold mt-5 text-balance">Área de entregas bloqueada</h1>
            <p className="text-sm text-muted-foreground mt-2 leading-relaxed max-w-sm">
              Para realizar entregas é necessário passar por uma análise de cadastro.
            </p>
            <Link
              to="/entregador/cadastro"
              className="mt-7 h-12 px-7 inline-flex items-center rounded-2xl bg-primary text-primary-foreground text-sm font-semibold"
            >
              Quero me candidatar
            </Link>
            <p className="flex items-start gap-2 text-[11px] text-muted-foreground bg-success/10 border border-success/20 rounded-xl p-3 mt-8 text-left">
              <ShieldCheck size={14} className="text-success shrink-0 mt-px" />
              Seus dados são usados apenas para validação de identidade e segurança da plataforma.
            </p>
          </>
        )}
        <Link to="/home" className="mt-8 text-[12px] text-muted-foreground underline underline-offset-4">
          Voltar para o início
        </Link>
      </div>
    </CourierShell>
  );
}
