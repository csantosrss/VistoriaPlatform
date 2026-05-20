import {
  AuthUserSchema,
  type AuthUser,
  type LoginResponse,
  type RefreshResponse,
} from "@vistoria/api-contracts";

/**
 * Helpers de persistência de sessão em `localStorage`. Isolados da camada
 * HTTP para o `api-client` poder ler/escrever tokens sem criar ciclo de
 * imports com `auth.service` (cf. Sprint 14 FE — refresh transparente).
 */

const TOKEN_KEY = "auth.access";
const REFRESH_KEY = "auth.refresh";
const USER_KEY = "auth.user";

export function persistSession(
  response: LoginResponse | RefreshResponse,
): void {
  localStorage.setItem(TOKEN_KEY, response.access);
  localStorage.setItem(REFRESH_KEY, response.refresh);
  localStorage.setItem(USER_KEY, JSON.stringify(response.user));
}

export function clearSession(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_KEY);
  localStorage.removeItem(USER_KEY);
}

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function getStoredRefresh(): string | null {
  return localStorage.getItem(REFRESH_KEY);
}

export function getStoredUser(): AuthUser | null {
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return null;
  }
  const parsed = AuthUserSchema.safeParse(json);
  return parsed.success ? parsed.data : null;
}
