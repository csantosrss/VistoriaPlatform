import { NavLink, Outlet } from "react-router-dom";
import {
  Activity,
  ClipboardList,
  LayoutDashboard,
  LogIn,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  end?: boolean;
}

const NAV_ITEMS: ReadonlyArray<NavItem> = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/health", label: "Status", icon: Activity },
  { to: "/vistorias", label: "Vistorias", icon: ClipboardList },
  { to: "/login", label: "Entrar", icon: LogIn },
];

export function AdminLayout() {
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
        <div className="border-t p-4 text-xs text-muted-foreground">
          v0.0.0 — Sprint 04
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
