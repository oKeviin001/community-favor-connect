import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Bell, Volume2, Smartphone } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { loadNotificationPreferences, NOTIFICATION_TYPES, playNotificationSound } from "@/lib/notifications";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/configuracoes/notificacoes")({
  head: () => ({
    meta: [
      { title: "Notificações — Pede pro Kevin" },
      { name: "description", content: "Controle os avisos e sons do Pede pro Kevin." },
    ],
  }),
  component: Notificacoes,
});

type Preferences = {
  pedidos: boolean;
  mensagens: boolean;
  entregas: boolean;
  avaliacoes: boolean;
  candidatura: boolean;
  sistema: boolean;
  som: boolean;
};

function Notificacoes() {
  const [prefs, setPrefs] = useState<Preferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">("unsupported");

  useEffect(() => {
    (async () => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;
      try {
        const data = await loadNotificationPreferences(user.user.id);
        setPrefs(data as Preferences);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Não foi possível carregar as preferências.");
      } finally {
        setLoading(false);
      }
    })();

    if ("Notification" in window) setPermission(Notification.permission);
  }, []);

  async function update(patch: Partial<Preferences>) {
    if (!prefs) return;
    const next = { ...prefs, ...patch };
    setPrefs(next);
    setSaving(true);
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) return;
    const { error } = await supabase
      .from("notification_preferences")
      .upsert({ user_id: user.user.id, ...next, atualizado_em: new Date().toISOString() });
    setSaving(false);
    if (error) {
      setPrefs(prefs);
      toast.error(error.message);
    }
  }

  async function enableBrowserNotifications() {
    if (!("Notification" in window)) {
      toast.error("Este navegador não oferece notificações.");
      return;
    }
    const result = await Notification.requestPermission();
    setPermission(result);
    if (result === "granted") {
      toast.success("Notificações do navegador ativadas.");
    } else {
      toast.error("A permissão de notificações não foi concedida.");
    }
  }

  if (loading || !prefs) {
    return (
      <AppShell>
        <div className="min-h-screen flex items-center justify-center">
          <div className="size-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <header className="px-6 pt-10 pb-4">
        <Link to="/perfil" className="inline-flex items-center gap-2 text-sm text-muted-foreground">
          <ArrowLeft size={16} /> Voltar para o perfil
        </Link>
        <p className="label-kicker mt-6">Configurações</p>
        <h1 className="text-[26px] font-semibold leading-tight mt-1">Notificações</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Escolha quais avisos você recebe e se o aplicativo pode emitir sons.
        </p>
      </header>

      <div className="px-6 space-y-4 pb-8">
        <section className="surface p-5">
          <div className="flex items-start gap-3">
            <div className="size-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <Smartphone size={19} />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-sm">Notificações no celular</p>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                Permite que o navegador mostre avisos do Pede pro Kevin neste dispositivo.
              </p>
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between gap-3">
            <span className="text-xs text-muted-foreground">
              {permission === "granted" ? "Ativadas neste dispositivo" : permission === "denied" ? "Bloqueadas pelo navegador" : "Ainda não autorizadas"}
            </span>
            <button
              type="button"
              onClick={enableBrowserNotifications}
              disabled={permission === "granted" || permission === "denied"}
              className="btn-base btn-primary-solid h-10 px-4 rounded-xl text-xs font-semibold"
            >
              {permission === "granted" ? "Ativadas" : "Ativar"}
            </button>
          </div>
        </section>

        <section className="surface overflow-hidden">
          <div className="p-5 border-b border-border flex items-start gap-3">
            <Bell size={19} className="text-muted-foreground mt-0.5" />
            <div>
              <h2 className="font-semibold text-sm">Tipos de aviso</h2>
              <p className="text-xs text-muted-foreground mt-1">Você pode desligar categorias que não deseja receber.</p>
            </div>
          </div>
          <div className="divide-y divide-border">
            {NOTIFICATION_TYPES.map((item) => {
              const key = ({
                pedido: "pedidos",
                mensagem: "mensagens",
                entrega: "entregas",
                avaliacao: "avaliacoes",
                candidatura: "candidatura",
                sistema: "sistema",
              } as const)[item.id];
              return (
                <ToggleRow
                  key={item.id}
                  title={item.label}
                  description={item.description}
                  checked={prefs[key]}
                  onChange={(checked) => update({ [key]: checked })}
                />
              );
            })}
          </div>
        </section>

        <section className="surface p-5">
          <div className="flex items-start gap-3">
            <Volume2 size={19} className="text-muted-foreground mt-0.5" />
            <div className="flex-1">
              <h2 className="font-semibold text-sm">Som das notificações</h2>
              <p className="text-xs text-muted-foreground mt-1">
                Toca um aviso sonoro quando uma nova notificação é recebida enquanto o app está aberto.
              </p>
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between gap-3">
            <span className="text-xs text-muted-foreground">{prefs.som ? "Som ativado" : "Som desativado"}</span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => playNotificationSound(true)}
                className="btn-base btn-soft h-10 px-4 rounded-xl text-xs font-semibold"
              >
                Testar som
              </button>
              <Toggle checked={prefs.som} onChange={(checked) => update({ som: checked })} />
            </div>
          </div>
          {saving && <p className="text-[11px] text-muted-foreground mt-3">Salvando...</p>}
        </section>

        <p className="text-[11px] text-muted-foreground px-1 leading-relaxed">
          O som depende das permissões e das regras do sistema operacional. A entrega de notificações quando o aplicativo estiver fechado será conectada ao serviço push do projeto.
        </p>
      </div>
    </AppShell>
  );
}

function ToggleRow({ title, description, checked, onChange }: { title: string; description: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="p-5 flex items-center gap-4">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">{title}</p>
        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{description}</p>
      </div>
      <Toggle checked={checked} onChange={onChange} />
    </div>
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative w-12 h-7 rounded-full transition-colors ${checked ? "bg-primary" : "bg-muted"}`}
    >
      <span className={`absolute top-1 size-5 rounded-full bg-white shadow-sm transition-transform ${checked ? "translate-x-6" : "translate-x-1"}`} />
    </button>
  );
}
