import { createBrowserRouter } from "react-router-dom";
import { AdminLayout } from "@/layouts/AdminLayout";
import { DashboardPage } from "@/features/dashboard/DashboardPage";
import { HealthPage } from "@/features/health/HealthPage";
import { LoginPage } from "@/features/auth/LoginPage";
import { RequireAuth } from "@/features/auth/components/RequireAuth";
import { VistoriasListPage } from "@/features/vistorias/VistoriasListPage";
import { VistoriaDetailPage } from "@/features/vistorias/VistoriaDetailPage";
import { NewVistoriaPage } from "@/features/vistorias/NewVistoriaPage";
import { AuditPage } from "@/features/audit/AuditPage";

export const router = createBrowserRouter([
  { path: "/login", Component: LoginPage },
  {
    path: "/",
    element: (
      <RequireAuth>
        <AdminLayout />
      </RequireAuth>
    ),
    children: [
      { index: true, Component: DashboardPage },
      { path: "health", Component: HealthPage },
      { path: "vistorias", Component: VistoriasListPage },
      { path: "vistorias/novo", Component: NewVistoriaPage },
      { path: "vistorias/:id", Component: VistoriaDetailPage },
      { path: "audit", Component: AuditPage },
    ],
  },
]);
