import { Injectable, Logger, type OnModuleInit } from "@nestjs/common";
import { Prisma, StatusVistoria } from "@prisma/client";
import {
  VistoriaStatusChangedEventSchema,
  type VistoriaStatusChangedEvent,
} from "@vistoria/api-contracts";
import { PrismaService } from "../../infrastructure/prisma/prisma.service";
import {
  RmqSubscriber,
  type RmqMessageMeta,
} from "../../infrastructure/messaging/rmq-subscriber.service";

const ROUTING_KEY = "vistoria.status.changed";

const STATUS_TERMINAIS: StatusVistoria[] = [
  StatusVistoria.CONCLUIDA,
  StatusVistoria.CANCELADA,
];

/**
 * Consome o evento `vistoria.status.changed` que o IN publica via
 * `RmqVistoriaStatusWriter` (handoff IN08). Aplica a transição na SAGA
 * de forma idempotente: se a vistoria já está no `newStatus`, o evento
 * é descartado com log. Transições partindo de estado terminal
 * (CONCLUIDA/CANCELADA) são bloqueadas — IN só deveria publicar para
 * vistorias em andamento.
 *
 * Trade-off de idempotência: feita por comparação de status final, não
 * por messageId. Se o IN começar a publicar transições legítimas que
 * passem pelo mesmo status duas vezes (ex.: reabertura), refazer com
 * dedup por eventId — pedido aberto em handoff de BE12 para o IN13.
 */
@Injectable()
export class VistoriaStatusChangedHandler implements OnModuleInit {
  private readonly logger = new Logger(VistoriaStatusChangedHandler.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly subscriber: RmqSubscriber,
  ) {}

  onModuleInit(): void {
    this.subscriber.subscribe(ROUTING_KEY, (payload, meta) =>
      this.handle(payload, meta),
    );
  }

  async handle(payload: unknown, meta: RmqMessageMeta): Promise<void> {
    const parsed = VistoriaStatusChangedEventSchema.safeParse(payload);
    if (!parsed.success) {
      this.logger.error(
        { issues: parsed.error.issues, routingKey: meta.routingKey },
        "Payload inválido para vistoria.status.changed; descartado",
      );
      return;
    }
    const event: VistoriaStatusChangedEvent = parsed.data;
    const correlationId = event.correlationId ?? meta.correlationId ?? null;

    await this.applyTransition(event, correlationId);
  }

  private async applyTransition(
    event: VistoriaStatusChangedEvent,
    correlationId: string | null,
  ): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const current = await tx.vistoria.findFirst({
        where: { id: event.vistoriaId, tenantId: event.tenantId },
      });
      if (!current) {
        this.logger.warn(
          {
            vistoriaId: event.vistoriaId,
            tenantId: event.tenantId,
            source: event.source,
          },
          "Vistoria do evento não encontrada no tenant; descartado",
        );
        return;
      }
      if (current.status === event.newStatus) {
        this.logger.log(
          {
            vistoriaId: current.id,
            status: current.status,
            source: event.source,
          },
          "Idempotente: vistoria já está no status alvo; descartado",
        );
        return;
      }
      if (STATUS_TERMINAIS.includes(current.status)) {
        this.logger.warn(
          {
            vistoriaId: current.id,
            from: current.status,
            to: event.newStatus,
            source: event.source,
          },
          "Transição a partir de estado terminal bloqueada",
        );
        return;
      }

      const updateData: Prisma.VistoriaUpdateInput = {
        status: event.newStatus,
        // Sprint 23 IN: aplica vistoriadorId quando presente (sem
        // sobrescrever quando ausente — preserva atribuição anterior).
        ...(event.vistoriadorId
          ? {
              vistoriador: {
                connect: { id: event.vistoriadorId },
              },
            }
          : {}),
        ...(event.newStatus === StatusVistoria.CONCLUIDA
          ? { concluidoEm: new Date() }
          : {}),
        ...(event.newStatus === StatusVistoria.CANCELADA
          ? {
              canceladoEm: new Date(),
              canceladoMotivo: event.motivo ?? null,
            }
          : {}),
      };
      const updated = await tx.vistoria.update({
        where: { id: current.id },
        data: updateData,
      });
      await tx.vistoriaTransicao.create({
        data: {
          vistoriaId: current.id,
          tenantId: current.tenantId,
          de: current.status,
          para: event.newStatus,
          motivo: event.motivo ?? `source=${event.source}`,
          executadoPor: null,
          correlationId,
        },
      });
      await tx.auditLog.create({
        data: {
          tenantId: current.tenantId,
          userId: null,
          action: "VISTORIA.STATUS_CHANGED",
          resourceType: "Vistoria",
          resourceId: current.id,
          before: current as unknown as Prisma.InputJsonValue,
          after: {
            ...updated,
            _source: event.source,
            _motivo: event.motivo ?? null,
          } as unknown as Prisma.InputJsonValue,
          correlationId,
        },
      });
      this.logger.log(
        {
          vistoriaId: current.id,
          from: current.status,
          to: event.newStatus,
          source: event.source,
          correlationId,
        },
        "Transição aplicada",
      );
    });
  }
}
