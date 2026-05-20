import {
  Inject,
  Injectable,
  Logger,
  NotImplementedException,
} from "@nestjs/common";
import type {
  AgendamentoDto,
  AgendamentoResult,
  ConsultaResult,
  IVistoriaProvider,
  PartnerHealth,
  ProviderId,
} from "../types/provider";
import {
  VISTORIA_STATUS_WRITER,
  type VistoriaStatusWriterPort,
} from "../ports/vistoria-status-writer.port";

/**
 * Provider para a equipe interna da Auxiliadora.
 *
 * Não chama HTTP externo. `agendar()` e `cancelar()` publicam transição
 * no exchange `vistoria.events` via {@link VistoriaStatusWriterPort} —
 * o BE consumer aplica a transição na SAGA. Isso mantém o fluxo do
 * provider interno consistente com Rede Vistorias/Conceitual, sem
 * acoplar IN à camada de domínio do `apps/api`.
 *
 * `consultar()` permanece como `NotImplemented` — leitura de estado
 * de Vistoria requer uma port BE→IN que ainda não existe (pedido em
 * aberto, ver Sprint 13 IN handoff).
 */
@Injectable()
export class InternoProvider implements IVistoriaProvider {
  readonly providerId: ProviderId = "interno";
  private readonly logger = new Logger(InternoProvider.name);

  constructor(
    @Inject(VISTORIA_STATUS_WRITER)
    private readonly statusWriter: VistoriaStatusWriterPort,
  ) {}

  async agendar(dto: AgendamentoDto): Promise<AgendamentoResult> {
    const dataAgendada = dto.dataPreferida ?? new Date();
    this.logger.log(
      {
        vistoriaId: dto.vistoriaId,
        tenantId: dto.tenantId,
        tipo: dto.tipo,
        dataAgendada: dataAgendada.toISOString(),
      },
      "Vistoria atribuída à equipe interna",
    );
    await this.statusWriter.update({
      vistoriaId: dto.vistoriaId,
      tenantId: dto.tenantId,
      newStatus: "AGENDADA",
      source: this.providerId,
      motivo: "Atribuída à equipe interna",
    });
    return {
      externalId: dto.vistoriaId,
      status: "AGENDADA",
      dataAgendada,
      vistoriadorAtribuido: {
        nome: "Equipe Interna Auxiliadora",
      },
    };
  }

  async consultar(_externalId: string): Promise<ConsultaResult> {
    throw new NotImplementedException(
      "InternoProvider.consultar — leitura de estado requer port BE→IN (não disponível na Sprint 13 IN).",
    );
  }

  async cancelar(externalId: string): Promise<void> {
    this.logger.log(
      { vistoriaId: externalId },
      "Cancelando vistoria interna (publica CANCELADA via writer)",
    );
    await this.statusWriter.update({
      vistoriaId: externalId,
      tenantId: "",
      newStatus: "CANCELADA",
      source: this.providerId,
      motivo: "Cancelado via InternoProvider.cancelar",
    });
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
