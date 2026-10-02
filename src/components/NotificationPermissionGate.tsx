import { useEffect, useState } from "react";
import { Bell, CheckCircle2, ShieldAlert } from "lucide-react";
import { subscribeToPush } from "@/lib/notifications";

type Props = {
  userId: string;
};

const FIRST_PROMPT_KEY = "pede-pro-kevin-notification-permission-requested";

export function NotificationPermissionGate({ userId }: Props) {
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">("default");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = () => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      setPermission("unsupported");
      return;
    }
    setPermission(Notification.permission);
  };

  useEffect(() => {
    refresh();

    if (typeof window === "undefined" || !("Notification" in window)) return;
    if (Notification.permission !== "default") return;
    if (localStorage.getItem(FIRST_PROMPT_KEY)) return;

    localStorage.setItem(FIRST_PROMPT_KEY, "true");
    void requestPermission();
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

  if (permission === "granted") return null;

  return (
    <div className="fixed inset-0 z-[100] bg-background/95 backdrop-blur-md overflow-y-auto">
      <div className="min-h-full max-w-screen-sm mx-auto px-6 py-10 flex items-center">
        <section className="w-full rounded-3xl border-2 border-destructive/40 bg-card p-7 shadow-2xl">
          <div className="size-16 rounded-2xl bg-destructive/10 text-destructive flex items-center justify-center">
            {permission === "unsupported" ? <ShieldAlert size={30} /> : <Bell size={30} />}
          </div>

          <p className="label-kicker mt-7 text-destructive">Ação obrigatória</p>
          <h1 className="text-3xl font-bold leading-tight mt-2">
            Ative as notificações
          </h1>
          <p className="text-base text-muted-foreground mt-4 leading-relaxed">
            O Pede pro Kevin precisa da autorização de notificações deste aparelho para avisar você sobre pedidos, mensagens, entregas e outros acontecimentos importantes.
          </p>

          {permission === "unsupported" ? (
            <div className="mt-6 rounded-2xl bg-destructive/10 p-4 text-sm leading-relaxed">
              Este navegador não disponibiliza notificações. Abra o Pede pro Kevin em um navegador compatível com notificações.
            </div>
          ) : permission === "denied" ? (
            <div className="mt-6 rounded-2xl bg-destructive/10 p-4 text-sm leading-relaxed">
              <strong>As notificações estão bloqueadas neste aparelho.</strong>
              <br />
              Abra as configurações de notificações do navegador/aplicativo no celular, permita as notificações do Pede pro Kevin e depois volte para cá.
            </div>
          ) : (
            <div className="mt-6 rounded-2xl bg-primary/10 p-4 text-sm leading-relaxed">
              Toque em <strong>Ativar notificações</strong> e confirme a autorização quando o celular perguntar.
            </div>
          )}

          {error && (
            <p className="mt-4 text-sm text-destructive" role="alert">{error}</p>
          )}

          <button
            type="button"
            onClick={() => void requestPermission()}
            disabled={busy || permission === "unsupported"}
            className="mt-7 w-full rounded-2xl bg-primary px-5 py-4 text-sm font-bold text-primary-foreground disabled:opacity-50"
          >
            {busy ? "Ativando..." : permission === "denied" ? "Verificar novamente" : "Ativar notificações"}
          </button>

          {permission === "granted" && (
            <div className="mt-5 flex items-center gap-2 text-sm text-emerald-600">
              <CheckCircle2 size={18} />
              Notificações autorizadas neste aparelho.
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
