import axios, {
  type AxiosError,
  type AxiosInstance,
  type InternalAxiosRequestConfig,
} from "axios";
import {
  RefreshResponseSchema,
  type RefreshResponse,
} from "@vistoria/api-contracts";
import {
  clearSession,
  getStoredRefresh,
  getStoredToken,
  persistSession,
} from "@/features/auth/services/session-storage";

function generateId(): string {
  return crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

/**
 * Cliente HTTP da plataforma. Em dev, o Vite faz proxy de `/api` e `/health` para
 * `http://localhost:3000` (apps/api). Em produção, configurar `VITE_API_BASE_URL`.
 */
export const apiClient: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? "",
  timeout: 15_000,
  headers: { "Content-Type": "application/json" },
});

apiClient.interceptors.request.use((config) => {
  config.headers = config.headers ?? {};
  if (!config.headers["x-correlation-id"]) {
    config.headers["x-correlation-id"] = generateId();
  }
  const token = getStoredToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

interface RetryConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

let refreshPromise: Promise<RefreshResponse> | null = null;

function isAuthEndpoint(url?: string): boolean {
  if (!url) return false;
  return url.includes("/auth/login") || url.includes("/auth/refresh");
}

function redirectToLoginIfNeeded(): void {
  if (typeof window === "undefined") return;
  if (window.location.pathname === "/login") return;
  const next = encodeURIComponent(
    window.location.pathname + window.location.search,
  );
  window.location.href = `/login?next=${next}`;
}

/**
 * Faz a chamada de refresh com axios "cru" (sem ir pelo apiClient) para
 * evitar recursão pelos interceptors. Mantém `baseURL` para casar com o
 * proxy do Vite em dev e o `VITE_API_BASE_URL` em prod.
 */
async function callRefresh(refresh: string): Promise<RefreshResponse> {
  const { data } = await axios.post(
    "/api/v1/auth/refresh",
    { refresh },
    {
      baseURL: apiClient.defaults.baseURL,
      timeout: 15_000,
      headers: {
        "Content-Type": "application/json",
        "x-correlation-id": generateId(),
      },
    },
  );
  return RefreshResponseSchema.parse(data);
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as RetryConfig | undefined;
    const status = error.response?.status;

    if (
      status !== 401 ||
      !originalRequest ||
      originalRequest._retry ||
      isAuthEndpoint(originalRequest.url)
    ) {
      // 401 em /auth/login: credenciais inválidas — não derrubar sessão atual.
      // 401 em /auth/refresh: refresh expirado/inválido — limpar e mandar pro login.
      if (status === 401 && originalRequest?.url?.includes("/auth/refresh")) {
        clearSession();
        redirectToLoginIfNeeded();
      }
      return Promise.reject(error);
    }

    const refresh = getStoredRefresh();
    if (!refresh) {
      clearSession();
      redirectToLoginIfNeeded();
      return Promise.reject(error);
    }

    originalRequest._retry = true;
    try {
      refreshPromise ??= callRefresh(refresh);
      const refreshed = await refreshPromise;
      persistSession(refreshed);
      originalRequest.headers = originalRequest.headers ?? {};
      originalRequest.headers.Authorization = `Bearer ${refreshed.access}`;
      return apiClient(originalRequest);
    } catch (refreshErr) {
      clearSession();
      redirectToLoginIfNeeded();
      return Promise.reject(refreshErr);
    } finally {
      refreshPromise = null;
    }
  },
);
