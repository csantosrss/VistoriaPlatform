import { apiClient } from "@/lib/api-client";
import type { HealthCheckResponse } from "../types";

export async function fetchHealth(): Promise<HealthCheckResponse> {
  const { data } = await apiClient.get<HealthCheckResponse>("/health");
  return data;
}
