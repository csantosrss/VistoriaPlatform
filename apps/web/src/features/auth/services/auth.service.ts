import { apiClient } from "@/lib/api-client";
import {
  LoginResponseSchema,
  MeResponseSchema,
  type AuthUser,
  type LoginRequest,
  type LoginResponse,
} from "@vistoria/api-contracts";

const TOKEN_KEY = "auth.access";
const USER_KEY = "auth.user";

export async function login(input: LoginRequest): Promise<LoginResponse> {
  const { data } = await apiClient.post("/api/v1/auth/login", input);
  return LoginResponseSchema.parse(data);
}

export async function fetchMe(): Promise<AuthUser> {
  const { data } = await apiClient.get("/api/v1/auth/me");
  return MeResponseSchema.parse(data);
}

export function persistSession(response: LoginResponse): void {
  localStorage.setItem(TOKEN_KEY, response.access);
  localStorage.setItem(USER_KEY, JSON.stringify(response.user));
}

export function clearSession(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
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
  const parsed = MeResponseSchema.safeParse(json);
  return parsed.success ? parsed.data : null;
}
