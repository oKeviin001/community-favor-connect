import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { toast } from "sonner";
import { LogOut, Star, Wand2, Shield } from "lucide-react";
import { useUser } from "@/lib/use-user";
import { Link } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/perfil")({
  head: () => ({
    meta: [
      { title: "Perfil — Pede pro Kevin" },
      { name: "description", content: "Gerencie seu perfil e preferências." },
      { property: "og:title", content: "Perfil — Pede pro Kevin" },
      { property: "og:description", content: "Gerencie seu perfil e preferências." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Perfil,
});

interface P { id: string; nome: string; telefone: string | null; bairro: string | null; tipo: string; nota_media: number | null; total_avaliacoes: number | null; total_entregas?: number | null }

const MODOS = [
  { id: "cliente", label: "Quero pedir favores", hint: "Você cria pedidos" },
  { id: "entregador", label: "Quero fazer entregas", hint: "Você aceita pedidos" },
  { id: "ambos", label: "Quero utilizar ambos", hint: "Pede e entrega" },
] as const;

function Perfil() {
  const navigate = useNavigate();
  const { isDev, isAdmin, reload } = useUser();
  const [p, setP] = useState<P | null>(null);
  const [nome, setNome] = useState("");
  const [tel, setTel] = useState("");
  const [bairro, setBairro] = useState("");
  const [tipo, setTipo] = useState<"cliente" | "entregador" | "ambos">("cliente");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      const { data } = await supabase.from("profiles").select("*").eq("id", u.user.id).maybeSingle();
      if (data) {
        setP(data as P);
        setNome(data.nome ?? "");
        setTel(data.telefone ?? "");
        setBairro(data.bairro ?? "");
        setTipo((data.tipo as "cliente" | "entregador" | "ambos") ?? "cliente");
      }
      setLoading(false);
    })();
  }, []);

  if (loading) {
    return (
      <AppShell>
        <div className="min-h-screen flex items-center justify-center">
          <div className="size-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </AppShell>
    );
  }

  async function salvar() {
    if (!p) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ nome, telefone: tel || null, bairro: bairro || null, tipo })
      .eq("id", p.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    reload();
    toast.success("Perfil atualizado");
  }

  async function sair() {
    await supabase.auth.signOut();
    navigate({ to: "/auth" });
  }

  return (
    <AppShell>
      <header className="px-6 pt-10 pb-4">
        <h1 className="text-2xl font-semibold">Perfil</h1>
      </header>

      <div className="px-6 space-y-5">
        {isAdmin && (
          <Link
            to="/admin"
            className="w-full h-12 bg-card ring-1 ring-black/5 rounded-2xl text-sm font-semibold flex items-center justify-center gap-2"
          >
            <Shield size={16} /> Painel administrativo
          </Link>
        )}
        {isDev && (
          <Link
            to="/dev"
            className="w-full h-12 bg-primary/10 text-primary ring-1 ring-primary/20 rounded-2xl text-sm font-semibold flex items-center justify-center gap-2"
          >
            <Wand2 size={16} /> Abrir Modo Deus
          </Link>
        )}
        <div className="bg-card ring-1 ring-black/5 rounded-2xl p-5 flex items-center gap-4">
          <div className="size-16 rounded-full bg-secondary flex items-center justify-center text-2xl font-semibold">
            {nome.charAt(0).toUpperCase() || "?"}
          </div>
          <div className="flex-1">
            <p className="font-semibold text-lg">{nome || "Sem nome"}</p>
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <Star size={14} className="fill-accent text-accent" />
              <span>{(p?.nota_media ?? 0).toFixed(1)}</span>
              <span>· {p?.total_avaliacoes ?? 0} avaliações</span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              {p?.total_entregas ?? 0} entregas concluídas
            </p>
          </div>
        </div>

        <Field label="Nome">
          <input value={nome} onChange={(e) => setNome(e.target.value)} className="input" />
        </Field>
        <Field label="Telefone (WhatsApp)">
          <input value={tel} onChange={(e) => setTel(e.target.value)} className="input" placeholder="(11) 90000-0000" />
          <p className="text-[11px] text-muted-foreground mt-1">
            Usado para abrir a conversa no WhatsApp durante o pedido.
          </p>
        </Field>
        <Field label="Bairro">
          <input value={bairro} onChange={(e) => setBairro(e.target.value)} className="input" placeholder="Vila Mariana" />
        </Field>

        <Field label="Modo de utilização">
          <div className="space-y-2">
            {MODOS.map((m) => (
              <button
                key={m.id}
                onClick={() => setTipo(m.id)}
                className={`w-full flex items-center gap-3 px-4 h-14 rounded-2xl text-left ring-1 ${
                  tipo === m.id ? "bg-primary/10 ring-primary" : "bg-card ring-black/5"
                }`}
              >
                <span
                  className={`size-5 rounded-full border-2 shrink-0 flex items-center justify-center ${
                    tipo === m.id ? "border-primary" : "border-border"
                  }`}
                >
                  {tipo === m.id && <span className="size-2.5 rounded-full bg-primary" />}
                </span>
                <span className="flex-1">
                  <span className="block text-sm font-medium">{m.label}</span>
                  <span className="block text-xs text-muted-foreground">{m.hint}</span>
                </span>
              </button>
            ))}
          </div>
        </Field>

        <button
          onClick={salvar}
          disabled={saving}
          className="w-full h-14 bg-primary text-primary-foreground rounded-2xl font-medium disabled:opacity-60"
        >
          {saving ? "Salvando..." : "Salvar alterações"}
        </button>

        <button
          onClick={sair}
          className="w-full h-12 bg-card ring-1 ring-black/5 rounded-2xl text-destructive text-sm font-medium flex items-center justify-center gap-2"
        >
          <LogOut size={16} /> Sair
        </button>
      </div>

      <style>{`.input{width:100%;height:48px;padding:0 16px;border-radius:16px;background:var(--card);box-shadow:inset 0 0 0 1px rgba(0,0,0,0.05);font-size:16px;outline:none}.input:focus{box-shadow:inset 0 0 0 2px var(--primary)}`}</style>
    </AppShell>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs uppercase tracking-wider text-muted-foreground font-medium">{label}</label>
      <div className="mt-2">{children}</div>
    </div>
  );
}