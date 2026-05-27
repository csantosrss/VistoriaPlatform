import { Injectable, OnModuleInit } from "@nestjs/common";
import {
  Counter,
  Histogram,
  Registry,
  collectDefaultMetrics,
} from "prom-client";

/**
 * Registry isolado da `prom-client` para evitar colisão com o registry global
 * (relevante em testes/jest e em monorepo onde múltiplos módulos podem
 * importar prom-client).
 */
@Injectable()
export class MetricsService implements OnModuleInit {
  readonly registry = new Registry();

  readonly httpRequestsTotal = new Counter({
    name: "http_requests_total",
    help: "Total de requisições HTTP atendidas pela API.",
    labelNames: ["method", "route", "status_code"] as const,
    registers: [this.registry],
  });

  readonly httpRequestDurationSeconds = new Histogram({
    name: "http_request_duration_seconds",
    help: "Duração das requisições HTTP em segundos.",
    labelNames: ["method", "route", "status_code"] as const,
    buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2, 5],
    registers: [this.registry],
  });

  onModuleInit(): void {
    this.registry.setDefaultLabels({ service: "vistoria-api" });
    collectDefaultMetrics({ register: this.registry });
  }

  observe(
    method: string,
    route: string,
    statusCode: number,
    durationSeconds: number,
  ): void {
    const labels = {
      method: method.toUpperCase(),
      route,
      status_code: String(statusCode),
    };
    this.httpRequestsTotal.inc(labels);
    this.httpRequestDurationSeconds.observe(labels, durationSeconds);
  }
}
