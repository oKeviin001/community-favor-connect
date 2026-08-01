import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { toast } from "sonner";

export const Route = createFileRoute("/auth")({
  ssr: false,
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

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [tipo, setTipo] = useState<"cliente" | "entregador">("cliente");
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getUser().then(({ data }) => {
      if (!mounted) return;
      if (data.user) {
        navigate({ to: "/home", replace: true });
        return;
      }
      setChecking(false);
    });
    return () => { mounted = false; };
  }, [navigate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password: senha,
          options: {
            emailRedirectTo: window.location.origin,
            data: { nome, tipo },
          },
        });
        if (error) throw error;
        toast.success("Conta criada! Verifique seu email se necessário.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
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
    setLoading(true);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      toast.error("Erro no login com Google");
      setLoading(false);
      return;
    }
    if (result.redirected) return;
    navigate({ to: "/home", replace: true });
  }

  if (checking) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6">
        <div className="size-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="mt-4 text-sm text-muted-foreground">Verificando sessão...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col px-6 pt-16 pb-8">
      <div className="mb-10">
        <p className="text-accent font-medium text-sm tracking-wide uppercase">Sua vizinhança</p>
        <h1 className="text-3xl font-semibold leading-tight text-foreground mt-1">
          Pede pro Kevin
        </h1>
        <p className="text-muted-foreground mt-2 text-sm max-w-xs">
          Peça o que precisar. Um vizinho de confiança entrega para você.
        </p>
      </div>

      <div className="flex gap-2 mb-6 bg-secondary p-1 rounded-full">
        <button
          onClick={() => setMode("signin")}
          className={`flex-1 h-11 rounded-full text-sm font-medium transition-colors ${
            mode === "signin" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
          }`}
        >
          Entrar
        </button>
        <button
          onClick={() => setMode("signup")}
          className={`flex-1 h-11 rounded-full text-sm font-medium transition-colors ${
            mode === "signup" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
          }`}
        >
          Criar conta
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        {mode === "signup" && (
          <>
            <input
              required
              placeholder="Seu nome"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              className="w-full h-14 px-5 rounded-2xl bg-card ring-1 ring-black/5 text-base placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setTipo("cliente")}
                className={`flex-1 h-12 rounded-2xl text-sm font-medium ring-1 ${
                  tipo === "cliente" ? "bg-primary text-primary-foreground ring-primary" : "bg-card ring-black/5 text-foreground"
                }`}
              >
                Quero pedir
              </button>
              <button
                type="button"
                onClick={() => setTipo("entregador")}
                className={`flex-1 h-12 rounded-2xl text-sm font-medium ring-1 ${
                  tipo === "entregador" ? "bg-primary text-primary-foreground ring-primary" : "bg-card ring-black/5 text-foreground"
                }`}
              >
                Quero entregar
              </button>
            </div>
          </>
        )}
        <input
          required
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full h-14 px-5 rounded-2xl bg-card ring-1 ring-black/5 text-base placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
        />
        <input
          required
          type="password"
          placeholder="Senha"
          minLength={6}
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
          className="w-full h-14 px-5 rounded-2xl bg-card ring-1 ring-black/5 text-base placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
        />
        <button
          type="submit"
          disabled={loading}
          className="w-full h-14 bg-primary text-primary-foreground rounded-2xl font-medium text-base shadow-lg shadow-primary/10 hover:bg-primary/95 disabled:opacity-60"
        >
          {loading ? "Aguarde..." : mode === "signin" ? "Entrar" : "Criar conta"}
        </button>
      </form>

      <div className="flex items-center gap-4 my-6">
        <div className="flex-1 h-px bg-border" />
        <span className="text-xs text-muted-foreground uppercase tracking-wider">ou</span>
        <div className="flex-1 h-px bg-border" />
      </div>

      <button
        onClick={handleGoogle}
        disabled={loading}
        className="w-full h-14 bg-card text-foreground rounded-2xl font-medium text-base ring-1 ring-black/5 flex items-center justify-center gap-3 hover:bg-secondary"
      >
        <svg width="20" height="20" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
        Continuar com Google
      </button>

      <p className="mt-8 text-center text-xs text-muted-foreground">
        Ao entrar, você concorda com os termos de uso do Pede pro Kevin.
      </p>
    </div>
  );
}

function traduzirErroAuth(msg: string): string {
  const map: Record<string, string> = {
    "Invalid login credentials": "Email ou senha incorretos.",
    "Email not confirmed": "Email ainda não confirmado. Verifique sua caixa de entrada.",
    "User already registered": "Este email já está cadastrado.",
    "Password should be at least 6 characters": "A senha deve ter pelo menos 6 caracteres.",
    "Unable to validate email address: invalid format": "Email inválido.",
    "Signup requires a valid password": "Informe uma senha válida.",
  };
  return map[msg] ?? msg;
}
