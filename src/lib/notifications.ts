import { supabase } from "@/integrations/supabase/client";

export type NotificationType =
  | "pedido"
  | "mensagem"
  | "entrega"
  | "avaliacao"
  | "candidatura"
  | "pagamento"
  | "disputa"
  | "seguranca"
  | "sistema";

export const NOTIFICATION_TYPES: { id: NotificationType; label: string; description: string }[] = [
  { id: "pedido", label: "Pedidos", description: "Criação, alterações e atualizações dos seus pedidos." },
  { id: "mensagem", label: "Mensagens", description: "Novas mensagens relacionadas aos seus pedidos." },
  { id: "entrega", label: "Entregas", description: "Aceite, andamento e conclusão de entregas." },
  { id: "avaliacao", label: "Avaliações", description: "Novas avaliações e pedidos para avaliar." },
  { id: "candidatura", label: "Candidatura", description: "Atualizações sobre sua candidatura de entregador." },
  { id: "pagamento", label: "Pagamentos", description: "Depósitos, liberações, reembolsos e alterações financeiras." },
  { id: "disputa", label: "Disputas", description: "Abertura, análise e decisão de uma disputa." },
  { id: "seguranca", label: "Segurança", description: "Eventos importantes de segurança e acesso da conta." },
  { id: "sistema", label: "Sistema", description: "Avisos importantes da plataforma." },
];

export type NotificationRow = {
  id: string;
  tipo: NotificationType;
  titulo: string;
  mensagem: string;
  dados: Record<string, unknown>;
  lida: boolean;
  criado_em: string;
};

export type NotificationControl = {
  pedidos: boolean;
  mensagens: boolean;
  entregas: boolean;
  avaliacoes: boolean;
  candidatura: boolean;
  pagamentos: boolean;
  disputas: boolean;
  seguranca: boolean;
  sistema: boolean;
  som: boolean;
};

export async function loadNotificationControl() {
  const { data, error } = await supabase
    .from("notification_control")
    .select("pedidos,mensagens,entregas,avaliacoes,candidatura,pagamentos,disputas,seguranca,sistema,som")
    .eq("id", true)
    .single();
  if (error) throw error;
  return data as NotificationControl;
}

export async function setNotificationControl(control: NotificationControl) {
  const { data, error } = await supabase.rpc("set_notification_control", {
    _pedidos: control.pedidos,
    _mensagens: control.mensagens,
    _entregas: control.entregas,
    _avaliacoes: control.avaliacoes,
    _candidatura: control.candidatura,
    _pagamentos: control.pagamentos,
    _disputas: control.disputas,
    _seguranca: control.seguranca,
    _sistema: control.sistema,
    _som: control.som,
  });
  if (error) throw error;
  return data as NotificationControl;
}

export function notificationPreferenceKey(type: NotificationType) {
  return ({
    pedido: "pedidos",
    mensagem: "mensagens",
    entrega: "entregas",
    avaliacao: "avaliacoes",
    candidatura: "candidatura",
    pagamento: "pagamentos",
    disputa: "disputas",
    seguranca: "seguranca",
    sistema: "sistema",
  } as const)[type];
}

export async function markNotificationRead(id: string) {
  return supabase.from("notifications").update({ lida: true }).eq("id", id);
}

export function playNotificationSound(enabled = true) {
  if (!enabled || typeof window === "undefined") return;
  const AudioContextCtor = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextCtor) return;

  try {
    const ctx = new AudioContextCtor();
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(880, ctx.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(660, ctx.currentTime + 0.12);
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.12, ctx.currentTime + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.16);
    oscillator.connect(gain);
    gain.connect(ctx.destination);
    oscillator.start();
    oscillator.stop(ctx.currentTime + 0.17);
    oscillator.addEventListener("ended", () => void ctx.close());
  } catch {
    // Browsers may block audio until a user gesture; the notification still works.
  }
}

export async function showBrowserNotification(title: string, body: string) {
  if (typeof window === "undefined" || !("Notification" in window)) return false;
  if (Notification.permission !== "granted") return false;
  try {
    new Notification(title, { body, icon: "/favicon.ico" });
    return true;
  } catch {
    return false;
  }
}


export async function registerNotificationServiceWorker() {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return null;
  try {
    return await navigator.serviceWorker.register("/sw.js");
  } catch {
    return null;
  }
}

function urlBase64ToUint8Array(value: string) {
  const padding = "=".repeat((4 - (value.length % 4)) % 4);
  const base64 = (value + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);
  return Uint8Array.from([...raw].map((char) => char.charCodeAt(0)));
}

export async function subscribeToPush(userId: string) {
  const publicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined;
  if (!publicKey || typeof window === "undefined" || !("serviceWorker" in navigator) || !("PushManager" in window)) {
    return { subscription: null, reason: "push_not_configured" as const };
  }

  const registration = await registerNotificationServiceWorker();
  if (!registration) return { subscription: null, reason: "service_worker_unavailable" as const };

  const permission = await Notification.requestPermission();
  if (permission !== "granted") return { subscription: null, reason: "permission_denied" as const };

  const subscription =
    (await registration.pushManager.getSubscription()) ??
    (await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    }));

  const json = subscription.toJSON();
  if (!json.endpoint) return { subscription: null, reason: "invalid_subscription" as const };

  const { error } = await supabase.from("notification_devices").upsert(
    {
      user_id: userId,
      endpoint: json.endpoint,
      subscription: json,
      user_agent: navigator.userAgent,
      ativo: true,
      atualizado_em: new Date().toISOString(),
    },
    { onConflict: "user_id,endpoint" },
  );

  if (error) throw error;
  return { subscription, reason: "subscribed" as const };
}
