import { supabase } from "@/integrations/supabase/client";

export type NotificationType =
  | "pedido"
  | "mensagem"
  | "entrega"
  | "avaliacao"
  | "candidatura"
  | "sistema";

export const NOTIFICATION_TYPES: { id: NotificationType; label: string; description: string }[] = [
  { id: "pedido", label: "Pedidos", description: "Criação, alterações e atualizações dos seus pedidos." },
  { id: "mensagem", label: "Mensagens", description: "Novas mensagens relacionadas aos seus pedidos." },
  { id: "entrega", label: "Entregas", description: "Aceite, andamento e conclusão de entregas." },
  { id: "avaliacao", label: "Avaliações", description: "Novas avaliações e pedidos para avaliar." },
  { id: "candidatura", label: "Candidatura", description: "Atualizações sobre sua candidatura de entregador." },
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

export async function loadNotificationPreferences(userId: string) {
  const { data, error } = await supabase
    .from("notification_preferences")
    .select("pedidos,mensagens,entregas,avaliacoes,candidatura,sistema,som")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;
  if (data) return data;

  const { data: created, error: createError } = await supabase
    .from("notification_preferences")
    .insert({ user_id: userId })
    .select("pedidos,mensagens,entregas,avaliacoes,candidatura,sistema,som")
    .single();

  if (createError) throw createError;
  return created;
}

export function notificationPreferenceKey(type: NotificationType) {
  return ({
    pedido: "pedidos",
    mensagem: "mensagens",
    entrega: "entregas",
    avaliacao: "avaliacoes",
    candidatura: "candidatura",
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
