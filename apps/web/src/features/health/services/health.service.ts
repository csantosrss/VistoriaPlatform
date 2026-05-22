import { apiClient } from "@/lib/api-client";
import type { HealthCheckResponse } from "../types";

export async function fetchHealth(): Promise<HealthCheckResponse> {
  // BE serve em `/v1/health` (versioning URI ligado em main.ts; o
  // `setGlobalPrefix('api', { exclude: ['health'] })` tira o /api mas
  // não a versão). Sem o prefix `/v1` aqui, o proxy do Vite encaminha
  // para /health no BE e cai em 404.
  const { data } = await apiClient.get<HealthCheckResponse>("/v1/health");
  return data;
}
