import { NavLink, Outlet } from "react-router-dom";
import {
  Activity,
  CalendarDays,
  ClipboardList,
  History,
  LayoutDashboard,
  LogOut,
  Users,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useMe } from "@/features/auth/hooks/use-me";
import { useLogout } from "@/features/auth/hooks/use-logout";

interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  end?: boolean;
}

const NAV_ITEMS: ReadonlyArray<NavItem> = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/vistorias", label: "Vistorias", icon: ClipboardList },
  { to: "/agenda", label: "Agenda", icon: CalendarDays },
  { to: "/users", label: "Usuários", icon: Users },
  { to: "/audit", label: "Auditoria", icon: History },
  { to: "/health", label: "Status", icon: Activity },
];

export function AdminLayout() {
  const { data: user } = useMe();
  const logout = useLogout();

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="flex w-60 shrink-0 flex-col border-r bg-card">
        <div className="border-b px-6 py-5">
          <h1 className="text-lg font-semibold tracking-tight">
            Vistoria Platform
          </h1>
          <p className="text-xs text-muted-foreground">Auxiliadora Predial</p>
        </div>
        <nav className="flex-1 space-y-1 p-3">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-secondary hover:text-secondary-foreground",
                )
              }
            >
              <item.icon className="h-4 w-4" />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="space-y-3 border-t p-4 text-xs">
          {user ? (
            <div>
              <p className="font-medium text-foreground">{user.name}</p>
              <p className="text-muted-foreground">{user.email}</p>
              <p className="mt-1 text-[10px] uppercase tracking-wide text-muted-foreground">
                {user.roles.join(" · ")}
              </p>
            </div>
          ) : (
            <p className="text-muted-foreground">Sem sessão</p>
          )}
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={logout}
          >
            <LogOut className="mr-2 h-3.5 w-3.5" />
            Sair
          </Button>
          <p className="text-[10px] text-muted-foreground">
            v0.0.0 — Sprint 19
          </p>
        </div>
      </aside>
      <main className="flex-1 overflow-y-auto">
        <div className="container max-w-6xl py-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
