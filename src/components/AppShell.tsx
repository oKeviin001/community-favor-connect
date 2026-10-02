import type { ReactNode } from "react";
import { useEffect } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { Home, ClipboardList, Bike, User, Shield, Plus } from "lucide-react";
import { useUser } from "@/lib/use-user";
import { supabase } from "@/integrations/supabase/client";
import { loadNotificationControl, notificationPreferenceKey, playNotificationSound, showBrowserNotification, registerNotificationServiceWorker, type NotificationRow } from "@/lib/notifications";
import { toast } from "sonner";

interface Props {
  children: ReactNode;
  hideNav?: boolean;
}

export function AppShell({ children, hideNav }: Props) {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const { isAdmin } = useUser();

  useEffect(() => {
    void registerNotificationServiceWorker();
  }, []);

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let cancelled = false;

    (async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user || cancelled) return;

      if (cancelled) return;

      channel = supabase
        .channel(`user-notifications-${data.user.id}`)
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${data.user.id}` },
          async (payload) => {
            const notification = payload.new as NotificationRow;
            let control;
            try {
              control = await loadNotificationControl();
            } catch {
              return;
            }
            const key = notificationPreferenceKey(notification.tipo);
            if (!control[key]) return;

            if (control.som) playNotificationSound(true);
            toast(notification.titulo, { description: notification.mensagem });
            await showBrowserNotification(notification.titulo, notification.mensagem);
          },
        )
        .subscribe();
    })();

    return () => {
      cancelled = true;
      if (channel) void supabase.removeChannel(channel);
    };
  }, []);

  const navItems = [
    { to: "/home", label: "Início", icon: Home },
    { to: "/novo-pedido", label: "Pedir", icon: Plus },
    { to: "/pedidos", label: "Meus pedidos", icon: ClipboardList },
    { to: "/entregador", label: "Entregar", icon: Bike },
    ...(isAdmin ? [{ to: "/admin", label: "Admin", icon: Shield }] : []),
    { to: "/perfil", label: "Perfil", icon: User },
  ] as const;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="pb-28 max-w-screen-sm mx-auto">{children}</div>
      {!hideNav && (
        <nav className="fixed bottom-0 left-0 right-0 z-40 bg-card/90 backdrop-blur-xl border-t border-border px-3 pt-2.5 pb-[max(0.75rem,env(safe-area-inset-bottom))] flex justify-between items-center max-w-screen-sm mx-auto">
          {navItems.map(({ to, label, icon: Icon }) => {
            const active = path === to || (to !== "/home" && path.startsWith(to));
            return (
              <Link
                key={to}
                to={to}
                className={`flex flex-col items-center gap-1 py-1.5 px-2 min-w-[54px] rounded-xl transition-colors ${active ? "text-primary bg-secondary" : "text-muted-foreground"}`}
              >
                <Icon size={20} strokeWidth={active ? 2.2 : 1.7} />
                <span className="text-[10px] font-semibold tracking-tight whitespace-nowrap">{label}</span>
              </Link>
            );
          })}
        </nav>
      )}
    </div>
  );
}
