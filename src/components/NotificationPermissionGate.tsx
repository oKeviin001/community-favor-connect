import { useEffect, useState } from "react";
import { Bell, CheckCircle2, ShieldAlert, X } from "lucide-react";
import { subscribeToPush } from "@/lib/notifications";

type Props = {
  userId: string;
};

const DISMISSED_KEY = "pede-pro-kevin-notification-permission-dismissed";

export function NotificationPermissionGate({ userId }: Props) {
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">("default");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState(false);

  const refresh = () => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      setPermission("unsupported");
      return;
    }
    setPermission(Notification.permission);
  };

  useEffect(() => {
    refresh();
    if (typeof window !== "undefined") {
      setDismissed(localStorage.getItem(DISMISSED_KEY) === "true");
    }
  }, []);

  async function requestPermission() {
    setBusy(true);
    setError(null);

    try {
      if (typeof window === "undefined" || !("Notification" in window)) {
        setPermission("unsupported");
        return;
      }

      const result = await Notification.requestPermission();
      setPermission(result);

      if (result !== "granted") return;

      const push = await subscribeToPush(userId);
      if (push.reason !== "subscribed" && push.reason !== "push_not_configured") {
        setError("A permissão foi concedida, mas o cadastro deste aparelho para Push não foi concluído.");
      }
    } catch {
      setError("Não foi possível concluir a ativação das notificações neste aparelho.");
    } finally {
      setBusy(false);
      refresh();
    }
  }

  function dismiss() {
    setDismissed(true);
    if (typeof window !== "undefined") {
      localStorage.setItem(DISMISSED_KEY, "true");
    }
  }

  if (permission === "granted" || dismissed) return null;

  return (
    <div className="fixed inset-x-0 bottom-24 z-[90] px-4 pointer-events-none">
      <section className="pointer-events-auto max-w-screen-sm mx-auto rounded-2xl border border-border bg-card/95 backdrop-blur-md p-4 shadow-lg motion-lift">
        <div className="flex items-start gap-3">
          <div className="size-10 shrink-0 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
            {permission === "unsupported" ? <ShieldAlert size={20} /> : <Bell size={20} />}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  Recomendado
                </p>
                <h2 className="text-sm font-semibold mt-0.5">Ative as notificações</h2>
              </div>
              <button
                type="button"
                onClick={dismiss}
                className="motion-interactive shrink-0 rounded-lg p-1.5 text-muted-foreground hover:text-foreground"
                aria-label="Fechar recomendação de notificações"
              >
                <X size={17} />
              </button>
            </div>

            <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
              Você pode receber avisos sobre pedidos, mensagens e entregas. A autorização é opcional e não impede o uso do app.
            </p>

            {permission === "unsupported" ? (
              <p className="mt-2 text-xs text-muted-foreground">
                Este navegador não disponibiliza notificações.
              </p>
            ) : permission === "denied" ? (
              <p className="mt-2 text-xs text-muted-foreground">
                As notificações estão bloqueadas neste aparelho. Você pode alterar isso nas configurações do navegador/aplicativo.
              </p>
            ) : (
              <button
                type="button"
                onClick={() => void requestPermission()}
                disabled={busy}
                className="mt-3 rounded-xl bg-primary px-4 py-2.5 text-xs font-bold text-primary-foreground motion-interactive disabled:opacity-50"
              >
                {busy ? "Ativando..." : "Ativar notificações"}
              </button>
            )}

            {error && (
              <p className="mt-2 text-xs text-destructive" role="alert">{error}</p>
            )}

            {permission === "granted" && (
              <div className="mt-2 flex items-center gap-2 text-xs text-emerald-600">
                <CheckCircle2 size={15} />
                Notificações autorizadas neste aparelho.
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
