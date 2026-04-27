import { Injectable } from "@nestjs/common";
import {
  CONCEITUAL_TO_STATUS,
  ConceitualWebhookSchema,
  type ConceitualStatus,
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
export class ConceitualProvider extends BaseHttpProvider {
  readonly providerId: ProviderId = "conceitual";

  constructor(opts: ProviderHttpOptions) {
    super(opts);
  }

  static mapStatus(partnerStatus: ConceitualStatus): StatusVistoria {
    return CONCEITUAL_TO_STATUS[partnerStatus];
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
    const parsed = ConceitualWebhookSchema.parse(payload);
    this.logger.log(
      {
        evento: parsed.evento,
        externalId: parsed.idVistoria,
        situacao: parsed.situacao,
      },
      "Conceitual webhook received (no-op até BE Sprint 03+)",
    );
  }
}
