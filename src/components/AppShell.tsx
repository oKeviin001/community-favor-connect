import type { ReactNode } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { Home, ClipboardList, Bike, User, Shield } from "lucide-react";
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
    { to: "/pedidos", label: "Pedidos", icon: ClipboardList },
    ...(canDeliver ? [{ to: "/entregador", label: "Entregar", icon: Bike }] : []),
    ...(isAdmin ? [{ to: "/admin", label: "Admin", icon: Shield }] : []),
    { to: "/perfil", label: "Perfil", icon: User },
  ] as const;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="pb-24">{children}</div>
      {!hideNav && (
        <nav className="fixed bottom-0 left-0 right-0 bg-card/85 backdrop-blur-md border-t border-border px-6 py-3 flex justify-between items-center max-w-screen-sm mx-auto">
          {navItems.map(({ to, label, icon: Icon }) => {
            const active = path === to || (to !== "/home" && path.startsWith(to));
            return (
              <Link
                key={to}
                to={to}
                className={`flex flex-col items-center gap-1 py-1 px-3 min-w-[56px] ${
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