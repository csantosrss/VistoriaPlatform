import { Injectable } from "@nestjs/common";
import {
  REDE_VISTORIAS_TO_STATUS,
  RedeVistoriasWebhookSchema,
  type RedeVistoriasStatus,
  type StatusVistoria,
} from "@vistoria/api-contracts";
import type {
  AgendamentoDto,
  AgendamentoResult,
  ConsultaResult,
  ProviderId,
} from "../types/provider";
import { BaseHttpProvider, type ProviderHttpOptions } from "./base.provider";

@Injectable()
export class RedeVistoriasProvider extends BaseHttpProvider {
  readonly providerId: ProviderId = "rede-vistorias";

  constructor(opts: ProviderHttpOptions) {
    super(opts);
  }

  static mapStatus(partnerStatus: RedeVistoriasStatus): StatusVistoria {
    return REDE_VISTORIAS_TO_STATUS[partnerStatus];
  }

  async agendar(_dto: AgendamentoDto): Promise<AgendamentoResult> {
    return this.notImplemented("agendar");
  }

  async consultar(_externalId: string): Promise<ConsultaResult> {
    return this.notImplemented("consultar");
  }

  async cancelar(_externalId: string): Promise<void> {
    return this.notImplemented("cancelar");
  }

  async receberWebhook(payload: unknown): Promise<void> {
    const parsed = RedeVistoriasWebhookSchema.parse(payload);
    this.logger.log(
      {
        event: parsed.event,
        externalId: parsed.inspectionId,
        status: parsed.status,
      },
      "Rede Vistorias webhook received (no-op até BE Sprint 03+)",
    );
  }
}
