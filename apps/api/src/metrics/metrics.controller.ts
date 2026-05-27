import { Controller, Get, Header, HttpCode, HttpStatus } from "@nestjs/common";
import { ApiExcludeController } from "@nestjs/swagger";
import { Public } from "../auth/decorators/public.decorator";
import { MetricsService } from "./metrics.service";

/**
 * Endpoint de scraping do Prometheus. Exposto sem auth na rede interna (a
 * exposição pública depende de network policy / reverse proxy; ver ADR DOC
 * Sprint 30). Fora do `/api` para casar com o padrão prometheus `/metrics`.
 */
@ApiExcludeController()
@Public()
@Controller({ path: "metrics", version: undefined })
export class MetricsController {
  constructor(private readonly service: MetricsService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @Header("Content-Type", "text/plain; version=0.0.4; charset=utf-8")
  async metrics(): Promise<string> {
    return this.service.registry.metrics();
  }
}
