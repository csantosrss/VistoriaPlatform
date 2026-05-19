import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Headers,
  HttpCode,
  HttpStatus,
  Inject,
  Logger,
  Param,
  Post,
  Req,
  SetMetadata,
} from "@nestjs/common";
import type { Request } from "express";
import { ApiTags } from "@nestjs/swagger";
import { ConfigService } from "@nestjs/config";
import {
  ConceitualWebhookSchema,
  RedeVistoriasWebhookSchema,
} from "@vistoria/api-contracts";
import { WebhookSignatureVerifier } from "./signature-verifier";
import { ConceitualProvider } from "../providers/conceitual.provider";
import { RedeVistoriasProvider } from "../providers/rede-vistorias.provider";
import {
  VISTORIA_STATUS_WRITER,
  type VistoriaStatusWriterPort,
} from "../ports/vistoria-status-writer.port";
import type { ProviderId } from "../types/provider";

// Mesma chave que apps/api/src/auth/decorators/public.decorator.ts.
// Declarada aqui para que o pacote @vistoria/integrations não dependa do apps/api.
const IS_PUBLIC_KEY = "isPublic";
const Public = (): MethodDecorator & ClassDecorator =>
  SetMetadata(IS_PUBLIC_KEY, true);

interface WebhookConfig {
  secret: string;
  signatureHeader: string;
}

/**
 * Aceita webhooks dos parceiros, valida HMAC, mapeia o status do parceiro
 * para o enum unificado da SAGA e delega a transição ao
 * {@link VistoriaStatusWriterPort}.
 *
 * Rotas:
 * - `POST /api/v1/integrations/webhooks/rede-vistorias`
 * - `POST /api/v1/integrations/webhooks/conceitual`
 *
 * Marcado `@Public()` porque autenticação é via HMAC do parceiro, não JWT.
 */
@ApiTags("integrations:webhooks")
@Public()
@Controller({ path: "integrations/webhooks", version: "1" })
export class WebhookController {
  private readonly logger = new Logger(WebhookController.name);

  constructor(
    private readonly verifier: WebhookSignatureVerifier,
    private readonly redeVistorias: RedeVistoriasProvider,
    private readonly conceitual: ConceitualProvider,
    private readonly config: ConfigService,
    @Inject(VISTORIA_STATUS_WRITER)
    private readonly statusWriter: VistoriaStatusWriterPort,
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
    const correlationId = this.headerValue(headers, "x-correlation-id");
    const tenantId = this.headerValue(headers, "x-tenant-id") ?? "";

    switch (id) {
      case "rede-vistorias":
        await this.handleRedeVistorias(body, { correlationId, tenantId });
        return;
      case "conceitual":
        await this.handleConceitual(body, { correlationId, tenantId });
        return;
      case "interno":
        throw new BadRequestException('Provider "interno" não recebe webhooks');
      default:
        throw new BadRequestException(`Provider desconhecido: ${id}`);
    }
  }

  private async handleRedeVistorias(
    body: unknown,
    meta: { correlationId?: string; tenantId: string },
  ): Promise<void> {
    await this.redeVistorias.receberWebhook(body);
    const parsed = RedeVistoriasWebhookSchema.parse(body);
    // `externalId` é o externalRef que enviamos em agendar() — o nosso vistoriaId.
    if (!parsed.externalId) {
      this.logger.warn(
        {
          provider: "rede-vistorias",
          inspectionId: parsed.inspectionId,
          status: parsed.status,
        },
        "Webhook sem externalId; não é possível mapear para Vistoria — ignorado.",
      );
      return;
    }
    const newStatus = RedeVistoriasProvider.mapStatus(parsed.status);
    await this.statusWriter.update({
      vistoriaId: parsed.externalId,
      tenantId: meta.tenantId,
      newStatus,
      source: "rede-vistorias",
      correlationId: meta.correlationId,
      rawPayload: parsed,
    });
  }

  private async handleConceitual(
    body: unknown,
    meta: { correlationId?: string; tenantId: string },
  ): Promise<void> {
    await this.conceitual.receberWebhook(body);
    const parsed = ConceitualWebhookSchema.parse(body);
    if (!parsed.idExterno) {
      this.logger.warn(
        {
          provider: "conceitual",
          idVistoria: parsed.idVistoria,
          situacao: parsed.situacao,
        },
        "Webhook sem idExterno; não é possível mapear para Vistoria — ignorado.",
      );
      return;
    }
    const newStatus = ConceitualProvider.mapStatus(parsed.situacao);
    await this.statusWriter.update({
      vistoriaId: parsed.idExterno,
      tenantId: meta.tenantId,
      newStatus,
      source: "conceitual",
      correlationId: meta.correlationId,
      rawPayload: parsed,
    });
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
