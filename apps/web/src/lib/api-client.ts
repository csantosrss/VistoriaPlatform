import axios, { type AxiosInstance } from "axios";

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
  const token = localStorage.getItem("auth.access");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("auth.access");
      // BE Sprint 03+ entregará refresh — por ora, apenas log
      console.warn("401 from API; redirect to /login should happen here");
    }
    return Promise.reject(error);
  },
);
