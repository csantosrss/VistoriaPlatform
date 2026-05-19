import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Headers,
  HttpCode,
  HttpStatus,
  Logger,
  Param,
  Post,
  Req,
} from "@nestjs/common";
import type { Request } from "express";
import { ApiTags } from "@nestjs/swagger";
import { ConfigService } from "@nestjs/config";
import { WebhookSignatureVerifier } from "./signature-verifier";
import { ConceitualProvider } from "../providers/conceitual.provider";
import { RedeVistoriasProvider } from "../providers/rede-vistorias.provider";
import type { ProviderId } from "../types/provider";

interface WebhookConfig {
  secret: string;
  signatureHeader: string;
}

/**
 * Aceita webhooks dos parceiros e roteia para o provider correto.
 *
 * Rotas:
 * - `POST /api/v1/integrations/webhooks/rede-vistorias`
 * - `POST /api/v1/integrations/webhooks/conceitual`
 *
 * Idempotência e auditoria são responsabilidade do provider concreto (Sprint 03+ do BE).
 */
@ApiTags("integrations:webhooks")
@Controller({ path: "integrations/webhooks", version: "1" })
export class WebhookController {
  private readonly logger = new Logger(WebhookController.name);

  constructor(
    private readonly verifier: WebhookSignatureVerifier,
    private readonly redeVistorias: RedeVistoriasProvider,
    private readonly conceitual: ConceitualProvider,
    private readonly config: ConfigService,
  ) {}

  @Post(":provider")
  @HttpCode(HttpStatus.NO_CONTENT)
  async receive(
    @Param("provider") providerId: string,
    @Body() body: unknown,
    @Headers() headers: Record<string, string | string[] | undefined>,
    @Req() req: Request,
  ): Promise<void> {
    const id = providerId as ProviderId;
    const cfg = this.configFor(id);
    const signature = this.headerValue(headers, cfg.signatureHeader);
    const rawBody =
      (req as Request & { rawBody?: Buffer }).rawBody ??
      Buffer.from(JSON.stringify(body));
    const valid = this.verifier.verify(rawBody, signature ?? "", cfg.secret);
    if (!valid) {
      this.logger.warn({ providerId: id }, "Invalid webhook signature");
      throw new ForbiddenException("Invalid webhook signature");
    }
    switch (id) {
      case "rede-vistorias":
        await this.redeVistorias.receberWebhook(body);
        return;
      case "conceitual":
        await this.conceitual.receberWebhook(body);
        return;
      case "interno":
        throw new BadRequestException('Provider "interno" não recebe webhooks');
      default:
        throw new BadRequestException(`Provider desconhecido: ${id}`);
    }
  }

  private configFor(id: ProviderId): WebhookConfig {
    switch (id) {
      case "rede-vistorias":
        return {
          secret: this.config.get<string>("REDE_VISTORIAS_WEBHOOK_SECRET", ""),
          signatureHeader: "x-rv-signature",
        };
      case "conceitual":
        return {
          secret: this.config.get<string>("CONCEITUAL_WEBHOOK_SECRET", ""),
          signatureHeader: "x-conceitual-signature",
        };
      default:
        return { secret: "", signatureHeader: "" };
    }
  }

  private headerValue(
    headers: Record<string, string | string[] | undefined>,
    name: string,
  ): string | undefined {
    const v = headers[name.toLowerCase()];
    return Array.isArray(v) ? v[0] : v;
  }
}
