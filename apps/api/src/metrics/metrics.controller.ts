import {
  Controller,
  Get,
  Header,
  HttpCode,
  HttpStatus,
  VERSION_NEUTRAL,
} from "@nestjs/common";
import { ApiExcludeController } from "@nestjs/swagger";
import { Public } from "../auth/decorators/public.decorator";
import { MetricsService } from "./metrics.service";

/**
 * Endpoint de scraping do Prometheus. Exposto sem auth na rede interna (a
 * exposição pública depende de network policy / reverse proxy; ver
 * ADR-016). Fora do `/api` para casar com o padrão Prometheus `/metrics`.
 *
 * Sprint 32 BE: `version: VERSION_NEUTRAL` substitui `version: undefined`.
 * O `defaultVersion: "1"` global do `main.ts` aplica versionamento mesmo
 * quando `version` é `undefined` — só `VERSION_NEUTRAL` desliga o
 * versionamento e mantém o path em `/metrics` puro. Corrigindo bug do
 * S27 BE detectado no S31 QI: scraper Prometheus aponta para `/metrics`
 * e marcava o target como DOWN.
 */
@ApiExcludeController()
@Public()
@Controller({ path: "metrics", version: VERSION_NEUTRAL })
export class MetricsController {
  constructor(private readonly service: MetricsService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @Header("Content-Type", "text/plain; version=0.0.4; charset=utf-8")
  async metrics(): Promise<string> {
    return this.service.registry.metrics();
  }
}
