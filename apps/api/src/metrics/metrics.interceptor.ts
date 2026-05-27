import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from "@nestjs/common";
import type { Request, Response } from "express";
import { Observable, tap } from "rxjs";
import { MetricsService } from "./metrics.service";

/**
 * Mede latência e conta status de cada request HTTP. Usa `req.route.path` se
 * o roteador resolveu a rota (placeholders preservados: `/users/:id`); caso
 * contrário cai no path bruto. O `/metrics` é ignorado para evitar feedback
 * loop com o Prometheus.
 */
@Injectable()
export class MetricsInterceptor implements NestInterceptor {
  constructor(private readonly metrics: MetricsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const req = http.getRequest<Request & { route?: { path?: string } }>();
    const res = http.getResponse<Response>();
    const start = process.hrtime.bigint();

    return next.handle().pipe(
      tap({
        next: () => this.record(req, res, start),
        error: () => this.record(req, res, start),
      }),
    );
  }

  private record(
    req: Request & { route?: { path?: string } },
    res: Response,
    start: bigint,
  ): void {
    const route = req.route?.path ?? req.path ?? "unknown";
    if (route === "/metrics") return;
    const durationSeconds = Number(process.hrtime.bigint() - start) / 1e9;
    this.metrics.observe(req.method, route, res.statusCode, durationSeconds);
  }
}
