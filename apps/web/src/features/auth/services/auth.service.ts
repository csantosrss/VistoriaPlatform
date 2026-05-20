import { apiClient } from "@/lib/api-client";
import {
  LoginResponseSchema,
  MeResponseSchema,
  RefreshResponseSchema,
  type AuthUser,
  type LoginRequest,
  type LoginResponse,
  type RefreshResponse,
} from "@vistoria/api-contracts";

export {
  clearSession,
  getStoredRefresh,
  getStoredToken,
  getStoredUser,
  persistSession,
} from "./session-storage";

export async function login(input: LoginRequest): Promise<LoginResponse> {
  const { data } = await apiClient.post("/api/v1/auth/login", input);
  return LoginResponseSchema.parse(data);
}

export async function fetchMe(): Promise<AuthUser> {
  const { data } = await apiClient.get("/api/v1/auth/me");
  return MeResponseSchema.parse(data);
}

/**
 * Troca um refresh token por um novo par access/refresh. Usado pelo
 * interceptor do `api-client` em respostas 401 (refresh transparente).
 * Schema strict para falhar previsivelmente se o BE divergir.
 */
export async function refreshTokens(refresh: string): Promise<RefreshResponse> {
  const { data } = await apiClient.post("/api/v1/auth/refresh", { refresh });
  return RefreshResponseSchema.parse(data);
}
