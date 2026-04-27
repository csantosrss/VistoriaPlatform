import { createBrowserRouter } from "react-router-dom";
import { AdminLayout } from "@/layouts/AdminLayout";
import { DashboardPage } from "@/features/dashboard/DashboardPage";
import { HealthPage } from "@/features/health/HealthPage";
import { LoginPage } from "@/features/auth/LoginPage";
import { VistoriasPlaceholderPage } from "@/features/vistorias/VistoriasPlaceholderPage";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: AdminLayout,
    children: [
      { index: true, Component: DashboardPage },
      { path: "health", Component: HealthPage },
      { path: "login", Component: LoginPage },
      { path: "vistorias", Component: VistoriasPlaceholderPage },
    ],
  },
]);
