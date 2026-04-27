import { apiClient } from "@/lib/api-client";
import type { LoginInput } from "../schemas/login.schema";

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

/**
 * Aguarda BE Sprint 03+ entregar `POST /api/v1/auth/login`.
 * Por enquanto, os campos esperados aqui são uma proposta a ser confirmada
 * via @vistoria/api-contracts quando o BE adicionar o schema.
 */
export async function login(input: LoginInput): Promise<AuthTokens> {
  const { data } = await apiClient.post<AuthTokens>(
    "/api/v1/auth/login",
    input,
  );
  return data;
}

export function persistTokens(tokens: AuthTokens): void {
  localStorage.setItem("auth.access", tokens.accessToken);
  localStorage.setItem("auth.refresh", tokens.refreshToken);
}

export function clearTokens(): void {
  localStorage.removeItem("auth.access");
  localStorage.removeItem("auth.refresh");
}
