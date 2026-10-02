import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { ArrowLeft, KeyRound, LogOut, ShieldCheck, Smartphone } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/configuracoes/seguranca")({
  head: () => ({
    meta: [
      { title: "Segurança — Pede pro Kevin" },
      { name: "description", content: "Proteja sua conta e gerencie o acesso ao Pede pro Kevin." },
    ],
  }),
  component: Seguranca,
});

function Seguranca() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmacao, setConfirmacao] = useState("");
  const [saving, setSaving] = useState(false);
  const [globalSignOut, setGlobalSignOut] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? ""));
  }, []);

  async function alterarSenha() {
    if (novaSenha.length < 8) {
      toast.error("A nova senha precisa ter pelo menos 8 caracteres.");
      return;
    }
    if (novaSenha !== confirmacao) {
      toast.error("As senhas não conferem.");
      return;
    }

    setSaving(true);
    const { error } = await supabase.auth.updateUser({ password: novaSenha });
    setSaving(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    setNovaSenha("");
    setConfirmacao("");
    toast.success("Senha alterada com sucesso.");
  }

  async function encerrarSessoes() {
    setGlobalSignOut(true);
    const { error } = await supabase.auth.signOut({ scope: "global" });
    if (error) {
      setGlobalSignOut(false);
      toast.error(error.message);
      return;
    }
    navigate({ to: "/auth" });
  }

  return (
    <AppShell>
      <header className="px-6 pt-10 pb-4">
        <Link
          to="/perfil"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft size={16} /> Voltar para o perfil
        </Link>
        <p className="label-kicker mt-6">Configurações</p>
        <h1 className="text-[26px] font-semibold leading-tight mt-1">Segurança</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Proteja sua conta e controle o acesso.
        </p>
      </header>

      <div className="px-6 space-y-4 pb-8">
        <section className="surface p-5">
          <div className="flex items-start gap-3">
            <div className="size-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <ShieldCheck size={20} />
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-sm">Conta protegida</p>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                Seu acesso é controlado pela autenticação da plataforma. Dados de função, permissões e privilégios não podem ser alterados por esta tela.
              </p>
            </div>
          </div>
        </section>

        <section className="surface p-5">
          <div className="flex items-start gap-3">
            <div className="size-10 rounded-xl bg-secondary flex items-center justify-center shrink-0">
              <KeyRound size={19} />
            </div>
            <div className="min-w-0">
              <h2 className="font-semibold text-sm">Alterar senha</h2>
              <p className="text-xs text-muted-foreground mt-1">
                Use uma senha forte com pelo menos 8 caracteres.
              </p>
            </div>
          </div>

          <div className="mt-4 space-y-3">
            <Field label="Nova senha">
              <input
                type="password"
                autoComplete="new-password"
                value={novaSenha}
                onChange={(e) => setNovaSenha(e.target.value)}
                className="field-input"
                placeholder="••••••••"
              />
            </Field>
            <Field label="Confirmar nova senha">
              <input
                type="password"
                autoComplete="new-password"
                value={confirmacao}
                onChange={(e) => setConfirmacao(e.target.value)}
                className="field-input"
                placeholder="••••••••"
              />
            </Field>
            <button
              type="button"
              onClick={alterarSenha}
              disabled={saving}
              className="btn-base btn-primary-solid w-full h-12 rounded-2xl text-sm font-semibold"
            >
              {saving ? "Alterando..." : "Alterar senha"}
            </button>
          </div>
        </section>

        <section className="surface p-5">
          <div className="flex items-start gap-3">
            <div className="size-10 rounded-xl bg-secondary flex items-center justify-center shrink-0">
              <Smartphone size={19} />
            </div>
            <div className="min-w-0">
              <h2 className="font-semibold text-sm">Conta e acesso</h2>
              <p className="text-xs text-muted-foreground mt-1 break-all">
                {email || "E-mail da conta"}
              </p>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-border">
            <p className="text-sm font-medium">Encerrar sessões</p>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              Encerra a sessão atual e solicita a invalidação das outras sessões da sua conta.
            </p>
            <button
              type="button"
              onClick={encerrarSessoes}
              disabled={globalSignOut}
              className="btn-base w-full h-12 rounded-2xl mt-3 border border-destructive/25 bg-destructive/10 text-destructive text-sm font-semibold flex items-center justify-center gap-2"
            >
              <LogOut size={16} />
              {globalSignOut ? "Encerrando..." : "Encerrar sessões"}
            </button>
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-muted/30 p-4">
          <p className="text-xs font-semibold">Importante</p>
          <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">
            Alterações de função, permissões administrativas, bloqueios, suspensões e outros controles protegidos continuam sujeitos às regras do sistema e à administração.
          </p>
        </section>
      </div>
    </AppShell>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="block text-xs font-medium mb-1.5">{label}</span>
      {children}
    </label>
  );
}
