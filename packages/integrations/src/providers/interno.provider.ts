import { Injectable, Logger, NotImplementedException } from "@nestjs/common";
import type {
  AgendamentoDto,
  AgendamentoResult,
  ConsultaResult,
  IVistoriaProvider,
  PartnerHealth,
  ProviderId,
} from "../types/provider";

/**
 * Provider para a equipe interna da Auxiliadora.
 * Não chama HTTP externo — futuramente lerá/escreverá do próprio banco
 * via repositório (a ser injetado pelo BE Sprint 03+).
 */
@Injectable()
export class InternoProvider implements IVistoriaProvider {
  readonly providerId: ProviderId = "interno";
  private readonly logger = new Logger(InternoProvider.name);

  async agendar(_dto: AgendamentoDto): Promise<AgendamentoResult> {
    throw new NotImplementedException(
      "InternoProvider.agendar — depende de VistoriaRepository do BE Sprint 03+",
    );
  }

  async consultar(_externalId: string): Promise<ConsultaResult> {
    throw new NotImplementedException(
      "InternoProvider.consultar — pendente BE Sprint 03+",
    );
  }

  async cancelar(_externalId: string): Promise<void> {
    throw new NotImplementedException(
      "InternoProvider.cancelar — pendente BE Sprint 03+",
    );
  }

  async receberWebhook(_payload: unknown): Promise<void> {
    this.logger.warn(
      "InternoProvider.receberWebhook chamado — equipe interna não emite webhooks",
    );
  }

  async healthCheck(): Promise<PartnerHealth> {
    return {
      provider: this.providerId,
      healthy: true,
      latencyMs: 0,
      message: "in-process provider",
      checkedAt: new Date(),
    };
  }
}
