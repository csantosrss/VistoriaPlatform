import { Injectable, Logger, type OnModuleInit } from "@nestjs/common";
import { VistoriaRoutedEventSchema } from "@vistoria/api-contracts";
import { RmqSubscriber } from "../messaging/rmq-subscriber.service";
import { ConceitualProvider } from "../providers/conceitual.provider";
import { InternoProvider } from "../providers/interno.provider";
import { RedeVistoriasProvider } from "../providers/rede-vistorias.provider";
import type {
  AgendamentoDto,
  IVistoriaProvider,
  ProviderId,
} from "../types/provider";

const ROUTING_KEY = "vistoria.routed";

/**
 * Consome `vistoria.routed` (publicado pelo BE — pendente Sprint 16,
 * ver `docs/agent-sync/2026-05-20-from-in-to-be-vistoria-routed-event.md`)
 * e dispara `agendar()` no provider apropriado.
 *
 * Fluxo async completo (quando BE publicar):
 *   create vistoria → BE roteia + publica `vistoria.routed` →
 *   IN consome → IN chama `provider.agendar()` → provider publica
 *   `vistoria.status.changed` com newStatus=AGENDADA → BE consumer
 *   aplica a transição.
 *
 * Hoje, o orchestrator fica registrado e dormente: nenhum publisher de
 * `vistoria.routed` existe ainda. Quando começar a chegar mensagem,
 * funciona sem mais mudanças no IN.
 */
@Injectable()
export class AgendamentoOrchestrator implements OnModuleInit {
  private readonly logger = new Logger(AgendamentoOrchestrator.name);

  constructor(
    private readonly subscriber: RmqSubscriber,
    private readonly redeVistorias: RedeVistoriasProvider,
    private readonly conceitual: ConceitualProvider,
    private readonly interno: InternoProvider,
  ) {}

  onModuleInit(): void {
    this.subscriber.subscribe(ROUTING_KEY, (payload, meta) =>
      this.handle(payload, meta.correlationId),
    );
  }

  async handle(payload: unknown, correlationId?: string): Promise<void> {
    const parsed = VistoriaRoutedEventSchema.safeParse(payload);
    if (!parsed.success) {
      this.logger.error(
        { issues: parsed.error.issues },
        "Payload inválido para vistoria.routed; descartado",
      );
      return;
    }
    const event = parsed.data;
    const provider = this.providerFor(event.providerId);
    if (!provider) {
      this.logger.error(
        { providerId: event.providerId, eventId: event.eventId },
        "ProviderId desconhecido em vistoria.routed; descartado",
      );
      return;
    }
    const dto: AgendamentoDto = {
      vistoriaId: event.vistoriaId,
      tenantId: event.tenantId,
      tipo: event.tipo,
      enderecoCompleto: event.enderecoCompleto,
      cep: event.cep,
      contato: event.contato,
      observacoes: event.observacoes,
      dataPreferida: event.dataPreferida
        ? new Date(event.dataPreferida)
        : undefined,
      vistoriadorId: event.vistoriadorId,
    };
    try {
      const result = await provider.agendar(dto);
      this.logger.log(
        {
          vistoriaId: event.vistoriaId,
          providerId: event.providerId,
          externalId: result.externalId,
          status: result.status,
          eventId: event.eventId,
          correlationId: correlationId ?? event.correlationId,
        },
        "agendar() concluído",
      );
    } catch (err) {
      this.logger.error(
        {
          err,
          vistoriaId: event.vistoriaId,
          providerId: event.providerId,
          eventId: event.eventId,
        },
        "Falha ao executar agendar() do provider — descartado (sem retry automático)",
      );
    }
  }

  private providerFor(providerId: ProviderId): IVistoriaProvider | null {
    switch (providerId) {
      case "rede-vistorias":
        return this.redeVistorias;
      case "conceitual":
        return this.conceitual;
      case "interno":
        return this.interno;
      default:
        return null;
    }
  }
}
