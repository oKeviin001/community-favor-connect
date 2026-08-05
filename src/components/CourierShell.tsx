import type { ReactNode } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { Bike, ClipboardCheck, History, User, ShoppingBag, Shield } from "lucide-react";
import { useUser } from "@/lib/use-user";

interface Props {
  children: ReactNode;
  hideNav?: boolean;
}

export function CourierShell({ children, hideNav }: Props) {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const { canOrder, isAdmin } = useUser();

  const navItems = [
    { to: "/entregador", label: "Disponíveis", icon: Bike, exact: true },
    { to: "/entregador/aceitos", label: "Aceitos", icon: ClipboardCheck, exact: false },
    { to: "/entregador/historico", label: "Histórico", icon: History, exact: false },
    ...(canOrder ? [{ to: "/home", label: "Pedir", icon: ShoppingBag, exact: false }] : []),
    ...(isAdmin ? [{ to: "/admin", label: "Admin", icon: Shield, exact: false }] : []),
    { to: "/perfil", label: "Perfil", icon: User, exact: false },
  ] as const;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="pb-28 max-w-screen-sm mx-auto">{children}</div>
      {!hideNav && (
        <nav className="fixed bottom-0 left-0 right-0 z-40 bg-card/90 backdrop-blur-xl border-t border-border px-3 pt-2.5 pb-[max(0.75rem,env(safe-area-inset-bottom))] flex justify-between items-center max-w-screen-sm mx-auto">
          {navItems.map(({ to, label, icon: Icon, exact }) => {
            const active = exact ? path === to : path.startsWith(to);
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