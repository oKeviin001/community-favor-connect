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
      <div className="pb-24">{children}</div>
      {!hideNav && (
        <nav className="fixed bottom-0 left-0 right-0 bg-card/85 backdrop-blur-md border-t border-border px-4 py-3 flex justify-between items-center max-w-screen-sm mx-auto">
          {navItems.map(({ to, label, icon: Icon, exact }) => {
            const active = exact ? path === to : path.startsWith(to);
            return (
              <Link
                key={to}
                to={to}
                className={`flex flex-col items-center gap-1 py-1 px-2 min-w-[52px] ${
                  active ? "text-primary" : "text-muted-foreground"
                }`}
              >
                <Icon size={22} strokeWidth={active ? 2.4 : 1.8} />
                <span className="text-[10px] font-medium">{label}</span>
              </Link>
            );
          })}
        </nav>
      )}
    </div>
  );
}