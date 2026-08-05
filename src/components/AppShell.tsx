import type { ReactNode } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { Home, ClipboardList, Bike, User, Shield, Plus } from "lucide-react";
import { useUser } from "@/lib/use-user";

interface Props {
  children: ReactNode;
  hideNav?: boolean;
}

export function AppShell({ children, hideNav }: Props) {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const { canDeliver, isAdmin } = useUser();

  const navItems = [
    { to: "/home", label: "Início", icon: Home },
    { to: "/novo-pedido", label: "Pedir", icon: Plus },
    { to: "/pedidos", label: "Meus pedidos", icon: ClipboardList },
    ...(canDeliver ? [{ to: "/entregador", label: "Entregar", icon: Bike }] : []),
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
                className={`flex flex-col items-center gap-1 py-1.5 px-2 min-w-[54px] rounded-xl transition-colors ${
                  active ? "text-primary bg-secondary" : "text-muted-foreground"
                }`}
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