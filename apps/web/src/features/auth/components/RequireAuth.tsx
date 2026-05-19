import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { getStoredToken } from "../services/auth.service";

/**
 * Guard de rota. Sem token no localStorage redireciona para /login
 * preservando o destino original em `state.from` para redirect pós-login.
 */
export function RequireAuth({ children }: { children: ReactNode }) {
  const location = useLocation();
  if (!getStoredToken()) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }
  return <>{children}</>;
}
