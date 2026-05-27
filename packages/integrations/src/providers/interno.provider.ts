import {
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  NotImplementedException,
  Optional,
} from "@nestjs/common";
import type {
  AgendamentoDto,
  AgendamentoResult,
  CancelarDto,
  ConsultaResult,
  IVistoriaProvider,
  PartnerHealth,
  ProviderId,
} from "../types/provider";
import {
  VISTORIA_STATUS_WRITER,
  type VistoriaStatusWriterPort,
} from "../ports/vistoria-status-writer.port";
import {
  VISTORIA_READER,
  type VistoriaReaderPort,
} from "../ports/vistoria-reader.port";

/**
 * Provider para a equipe interna da Auxiliadora.
 *
 * Não chama HTTP externo. `agendar()` e `cancelar()` publicam transição
 * no exchange `vistoria.events` via {@link VistoriaStatusWriterPort} —
 * o BE consumer aplica a transição na SAGA. Isso mantém o fluxo do
 * provider interno consistente com Rede Vistorias/Conceitual, sem
 * acoplar IN à camada de domínio do `apps/api`.
 *
 * Sprint 28 IN: `consultar(externalId, tenantId)` agora usa
 * {@link VistoriaReaderPort} (port BE→IN). Quando o adapter não está
 * registrado, segue caindo em {@link NotImplementedException} — forward-compat
 * para consumidores que ainda não atualizaram o `IntegrationsModule.forRoot()`.
 */
@Injectable()
export class InternoProvider implements IVistoriaProvider {
  readonly providerId: ProviderId = "interno";
  private readonly logger = new Logger(InternoProvider.name);

  constructor(
    @Inject(VISTORIA_STATUS_WRITER)
    private readonly statusWriter: VistoriaStatusWriterPort,
    @Optional()
    @Inject(VISTORIA_READER)
    private readonly reader?: VistoriaReaderPort,
  ) {}

  async agendar(dto: AgendamentoDto): Promise<AgendamentoResult> {
    const dataAgendada = dto.dataPreferida ?? new Date();
    this.logger.log(
      {
        vistoriaId: dto.vistoriaId,
        tenantId: dto.tenantId,
        tipo: dto.tipo,
        vistoriadorId: dto.vistoriadorId,
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
      // Sprint 23 IN: propaga vistoriadorId quando o BE pré-atribuiu
      // (campo opcional em VistoriaRoutedEvent desde S18). Consumer BE
      // pode aplicar `vistoria.vistoriadorId` quando vir o evento.
      vistoriadorId: dto.vistoriadorId,
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

  async consultar(
    externalId: string,
    tenantId: string,
  ): Promise<ConsultaResult> {
    if (!this.reader) {
      throw new NotImplementedException(
        "InternoProvider.consultar — VistoriaReaderPort não registrada. Registre `{ provide: VISTORIA_READER, useClass: VistoriaReaderAdapter }` no consumidor.",
      );
    }
    const snap = await this.reader.read(externalId, tenantId);
    if (!snap) {
      throw new NotFoundException(
        `Vistoria ${externalId} não encontrada no tenant ${tenantId}.`,
      );
    }
    return {
      externalId: snap.codigoImovelExterno ?? snap.vistoriaId,
      status: snap.status,
      dataAgendada: snap.agendadoPara ?? undefined,
      observacoes: snap.observacoes ?? undefined,
    };
  }

  async cancelar(dto: CancelarDto): Promise<void> {
    this.logger.log(
      { vistoriaId: dto.externalId, tenantId: dto.tenantId },
      "Cancelando vistoria interna (publica CANCELADA via writer)",
    );
    await this.statusWriter.update({
      vistoriaId: dto.externalId,
      tenantId: dto.tenantId,
      newStatus: "CANCELADA",
      source: this.providerId,
      motivo: dto.motivo ?? "Cancelado via InternoProvider.cancelar",
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
