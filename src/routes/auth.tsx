import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState, useSyncExternalStore } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Phone, Mail, Lock, User as UserIcon, ShieldCheck, Check, ChevronRight } from "lucide-react";
import { TERMOS_VERSAO, PRIVACIDADE_VERSAO } from "@/lib/kevin/shared";
import logoAsset from "@/assets/logo-oficial.png.asset.json";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Entrar — Pede pro Kevin" },
      { name: "description", content: "Entre no Pede pro Kevin para pedir ou entregar na sua vizinhança." },
      { property: "og:title", content: "Entrar — Pede pro Kevin" },
      { property: "og:description", content: "Entre no Pede pro Kevin para pedir ou entregar na sua vizinhança." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

function useHydrated() {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
}

function soDigitos(v: string) {
  return v.replace(/\D/g, "").slice(0, 11);
}

function formatarTelefone(v: string) {
  const d = soDigitos(v);
  if (d.length <= 2) return d;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

function AuthPage() {
  const navigate = useNavigate();
  const hydrated = useHydrated();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [tipo, setTipo] = useState<"cliente" | "entregador">("cliente");
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [loading, setLoading] = useState(false);
  const [aceitaTermos, setAceitaTermos] = useState(false);
  const [aceitaPrivacidade, setAceitaPrivacidade] = useState(false);
  const consentimentoOk = aceitaTermos && aceitaPrivacidade;

  useEffect(() => {
    let mounted = true;
    supabase.auth.getUser().then(({ data }) => {
      if (!mounted) return;
      if (data.user) {
        navigate({ to: "/home", replace: true });
      }
    });
    return () => { mounted = false; };
  }, [navigate]);

  if (!hydrated) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6">
        <div className="size-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="mt-4 text-sm text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        if (!consentimentoOk) {
          throw new Error("É necessário aceitar os Termos de Uso e a Política de Privacidade.");
        }
        const digitos = soDigitos(telefone);
        if (digitos.length < 10) throw new Error("Informe um telefone válido com DDD.");
        const emailFinal = email.trim() || `${digitos}@telefone.pedeprokevin.app`;
        const { error } = await supabase.auth.signUp({
          email: emailFinal,
          password: senha,
          options: {
            emailRedirectTo: window.location.origin,
            data: { nome, tipo, telefone: formatarTelefone(telefone) },
          },
        });
        if (error) throw error;
        const { data: sess } = await supabase.auth.getUser();
        if (sess.user) {
          await supabase
            .from("profiles")
            .update({ nome, telefone: formatarTelefone(telefone) })
            .eq("id", sess.user.id);
          await supabase.from("user_consents").insert({
            user_id: sess.user.id,
            termos_versao: TERMOS_VERSAO,
            privacidade_versao: PRIVACIDADE_VERSAO,
          });
        }
        toast.success("Conta criada! Bem-vindo ao Pede pro Kevin.");
      } else {
        const entrada = email.trim();
        const emailLogin = /\S+@\S+/.test(entrada)
          ? entrada
          : `${soDigitos(entrada)}@telefone.pedeprokevin.app`;
        const { error } = await supabase.auth.signInWithPassword({ email: emailLogin, password: senha });
        if (error) throw error;
      }
      navigate({ to: "/home", replace: true });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro ao entrar";
      toast.error(traduzirErroAuth(msg));
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    if (mode === "signup" && !consentimentoOk) {
      toast.error("Aceite os Termos de Uso e a Política de Privacidade para continuar.");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin },
    });
    if (error) {
      toast.error("Erro no login com Google");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col px-6 pt-12 pb-10">
      <div className="mx-auto w-full max-w-sm">
        <div className="flex justify-center mb-8">
          <div className="rounded-[2rem] overflow-hidden shadow-soft bg-card border border-border p-1">
            <img
              src={logoAsset.url}
              alt="Logo oficial Pede pro Kevin"
              width={1254}
              height={1254}
              className="w-32 h-32 object-contain"
            />
          </div>
        </div>

        <div className="mb-8">
          <p className="text-muted-foreground font-medium text-[11px] tracking-[0.18em] uppercase">
            Sua vizinhança
          </p>
          <h1 className="text-[28px] font-semibold leading-tight text-foreground mt-1.5">
            Pede pro Kevin
          </h1>
          <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
            Peça o que precisar. Um vizinho de confiança entrega para você.
          </p>
        </div>

        <div className="flex gap-1 mb-6 bg-secondary p-1 rounded-2xl border border-border">
          {(["signin", "signup"] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`flex-1 h-11 rounded-xl text-sm font-semibold transition-colors ${
                mode === m ? "bg-card text-foreground shadow-soft" : "text-muted-foreground"
              }`}
            >
              {m === "signin" ? "Entrar" : "Criar conta"}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          {mode === "signup" && (
            <>
              <FieldWrap icon={UserIcon} label="Nome completo">
                <input
                  required
                  placeholder="Como podemos te chamar"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  className="field-input pl-11"
                />
              </FieldWrap>
              <FieldWrap icon={Phone} label="Telefone (WhatsApp)" hint="Principal forma de contato entre vizinhos.">
                <input
                  required
                  inputMode="tel"
                  placeholder="(11) 90000-0000"
                  value={formatarTelefone(telefone)}
                  onChange={(e) => setTelefone(e.target.value)}
                  className="field-input pl-11"
                />
              </FieldWrap>
            </>
          )}

          <FieldWrap
            icon={Mail}
            label={mode === "signup" ? "E-mail (opcional)" : "E-mail ou telefone"}
          >
            <input
              required={mode === "signin"}
              type={mode === "signup" ? "email" : "text"}
              placeholder={mode === "signup" ? "Se preferir receber avisos" : "seu@email.com"}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="field-input pl-11"
            />
          </FieldWrap>

          <FieldWrap icon={Lock} label="Senha">
            <input
              required
              type="password"
              placeholder="Mínimo de 6 caracteres"
              minLength={6}
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              className="field-input pl-11"
            />
          </FieldWrap>

          {mode === "signup" && (
            <div className="grid grid-cols-2 gap-2 pt-1">
              {([
                { id: "cliente", label: "Quero pedir" },
                { id: "entregador", label: "Quero entregar" },
              ] as const).map((o) => (
                <button
                  key={o.id}
                  type="button"
                  onClick={() => setTipo(o.id)}
                  className={`h-12 rounded-xl text-sm font-semibold border transition-colors ${
                    tipo === o.id
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-card text-foreground border-border"
                  }`}
                >
                  {o.label}
                </button>
              ))}
            </div>
          )}

          {mode === "signup" && (
            <div className="space-y-2 pt-2">
              <p className="label-kicker">Antes de finalizar</p>
              <ConsentRow
                checked={aceitaTermos}
                onToggle={() => setAceitaTermos((v) => !v)}
                label="Li e aceito os"
                strong="Termos de Uso"
                to="/termos"
              />
              <ConsentRow
                checked={aceitaPrivacidade}
                onToggle={() => setAceitaPrivacidade((v) => !v)}
                label="Li e aceito a"
                strong="Política de Privacidade"
                to="/privacidade"
              />
              <p className="flex items-start gap-2 text-[11px] text-muted-foreground bg-success/10 border border-success/20 rounded-xl p-3">
                <ShieldCheck size={14} className="text-success shrink-0 mt-px" />
                Seus dados são usados exclusivamente para validação de identidade e segurança da plataforma.
              </p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading || (mode === "signup" && !consentimentoOk)}
            className="btn-base btn-base-active btn-primary-solid w-full mt-1"
          >
            {loading ? "Aguarde..." : mode === "signin" ? "Entrar" : "Criar conta"}
          </button>

          {mode === "signup" && (
            <p className="flex items-center gap-2 text-[11px] text-muted-foreground pt-1">
              <ShieldCheck size={13} /> Conta criada na hora, sem confirmação por e-mail.
            </p>
          )}
        </form>

        <div className="flex items-center gap-4 my-6">
          <div className="flex-1 h-px bg-border" />
          <span className="text-[11px] text-muted-foreground uppercase tracking-[0.16em]">ou</span>
          <div className="flex-1 h-px bg-border" />
        </div>

        <button
          onClick={handleGoogle}
          disabled={loading || (mode === "signup" && !consentimentoOk)}
          className="btn-base btn-base-active btn-soft w-full disabled:opacity-55"
        >
          <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
          Continuar com Google
        </button>

        <p className="mt-8 text-center text-[11px] text-muted-foreground leading-relaxed">
          Ao entrar, você concorda com os{" "}
          <Link to="/termos" className="text-primary font-semibold">Termos de Uso</Link> e a{" "}
          <Link to="/privacidade" className="text-primary font-semibold">Política de Privacidade</Link>.
        </p>
      </div>
    </div>
  );
}

function ConsentRow({
  checked,
  onToggle,
  label,
  strong,
  to,
}: {
  checked: boolean;
  onToggle: () => void;
  label: string;
  strong: string;
  to: string;
}) {
  return (
    <div className="surface p-3.5 flex items-center gap-3">
      <button
        type="button"
        role="checkbox"
        aria-checked={checked}
        onClick={onToggle}
        className={`size-5 rounded-md border-2 shrink-0 flex items-center justify-center transition-colors ${
          checked ? "bg-success border-success text-success-foreground" : "border-border bg-card"
        }`}
      >
        {checked && <Check size={13} strokeWidth={3} />}
      </button>
      <button type="button" onClick={onToggle} className="flex-1 text-left">
        <span className="text-[13px] text-muted-foreground">{label} </span>
        <span className="text-[13px] font-semibold text-foreground">{strong}</span>
      </button>
      <Link
        to={to}
        className="text-[11px] font-bold text-primary flex items-center gap-0.5 shrink-0"
      >
        Ler <ChevronRight size={13} />
      </Link>
    </div>
  );
}

function FieldWrap({
  icon: Icon,
  label,
  hint,
  children,
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
        {label}
      </label>
      <div className="relative mt-1.5">
        <Icon size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
        {children}
      </div>
      {hint && <p className="text-[11px] text-muted-foreground mt-1.5">{hint}</p>}
    </div>
  );
}

function traduzirErroAuth(msg: string): string {
  const map: Record<string, string> = {
    "Invalid login credentials": "Email ou senha incorretos.",
    "Email not confirmed": "Email ainda não confirmado. Verifique sua caixa de entrada.",
    "User already registered": "Este telefone ou email já está cadastrado.",
    "Password should be at least 6 characters": "A senha deve ter pelo menos 6 caracteres.",
    "Unable to validate email address: invalid format": "Email inválido.",
    "Signup requires a valid password": "Informe uma senha válida.",
  };
  if (msg.toLowerCase().includes("password") && msg.toLowerCase().includes("weak")) {
    return "Senha muito fraca. Escolha uma senha mais forte com letras, números e símbolos.";
  }
  return map[msg] ?? msg;
}
