export interface HealthIndicatorEntry {
  status: "up" | "down";
  message?: string;
}

export interface HealthCheckResponse {
  status: "ok" | "error" | "shutting_down";
  info?: Record<string, HealthIndicatorEntry>;
  error?: Record<string, HealthIndicatorEntry>;
  details: Record<string, HealthIndicatorEntry>;
}
