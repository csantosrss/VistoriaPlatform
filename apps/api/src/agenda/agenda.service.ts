import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  Prisma,
  Role,
  type AgendaSlot as AgendaSlotModel,
} from "@prisma/client";
import type {
  AgendaSlot as AgendaSlotDto,
  ListAgendaSlotsResponse,
} from "@vistoria/api-contracts";
import { PrismaService } from "../infrastructure/prisma/prisma.service";
import type { AuthenticatedUser } from "../auth/jwt-payload.interface";
import type { CreateAgendaSlotsDto } from "./dto/create-agenda-slots.dto";
import type { UpdateAgendaSlotDto } from "./dto/update-agenda-slot.dto";
import type { ListAgendaSlotsQueryDto } from "./dto/list-agenda-slots.dto";

function toDto(s: AgendaSlotModel): AgendaSlotDto {
  return {
    id: s.id,
    tenantId: s.tenantId,
    vistoriadorId: s.vistoriadorId,
    inicio: s.inicio.toISOString(),
    fim: s.fim.toISOString(),
    disponivel: s.disponivel,
    motivo: s.motivo,
    createdAt: s.createdAt.toISOString(),
    updatedAt: s.updatedAt.toISOString(),
  };
}

@Injectable()
export class AgendaService {
  constructor(private readonly prisma: PrismaService) {}

  /** Garante que o `vistoriadorId` referencia um User do tenant com role VISTORIADOR ativo. */
  private async assertVistoriador(
    tenantId: string,
    vistoriadorId: string,
  ): Promise<void> {
    const user = await this.prisma.user.findFirst({
      where: { id: vistoriadorId, tenantId },
      select: { id: true, roles: true, active: true },
    });
    if (!user) {
      throw new NotFoundException("Vistoriador não encontrado.");
    }
    if (!user.active) {
      throw new BadRequestException("Vistoriador está inativo.");
    }
    if (!user.roles.includes(Role.VISTORIADOR)) {
      throw new BadRequestException(
        "Usuário informado não tem role VISTORIADOR.",
      );
    }
  }

  async create(
    actor: AuthenticatedUser,
    vistoriadorId: string,
    input: CreateAgendaSlotsDto,
  ): Promise<ListAgendaSlotsResponse> {
    await this.assertVistoriador(actor.tenantId, vistoriadorId);

    // Valida fim > inicio em cada slot (zod no contract valida no FE; aqui
    // garantimos no BE também — class-validator não conhece o cruzamento).
    for (const s of input.slots) {
      if (new Date(s.fim) <= new Date(s.inicio)) {
        throw new BadRequestException(
          "Cada slot deve ter `fim` maior que `inicio`.",
        );
      }
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const created: AgendaSlotModel[] = [];
      for (const s of input.slots) {
        const slot = await tx.agendaSlot.create({
          data: {
            tenantId: actor.tenantId,
            vistoriadorId,
            inicio: new Date(s.inicio),
            fim: new Date(s.fim),
            disponivel: s.disponivel ?? true,
            motivo: s.motivo ?? null,
          },
        });
        created.push(slot);
      }
      await tx.auditLog.create({
        data: {
          tenantId: actor.tenantId,
          userId: actor.id,
          action: "AGENDA.SLOTS_CREATED",
          resourceType: "AgendaSlot",
          resourceId: vistoriadorId,
          after: {
            count: created.length,
            slotIds: created.map((s) => s.id),
          } as Prisma.InputJsonValue,
        },
      });
      return created;
    });
    return { data: result.map(toDto) };
  }

  async list(
    actor: AuthenticatedUser,
    vistoriadorId: string,
    query: ListAgendaSlotsQueryDto,
  ): Promise<ListAgendaSlotsResponse> {
    await this.assertVistoriador(actor.tenantId, vistoriadorId);
    const where: Prisma.AgendaSlotWhereInput = {
      tenantId: actor.tenantId,
      vistoriadorId,
      ...(typeof query.disponivel === "boolean"
        ? { disponivel: query.disponivel }
        : {}),
      ...(query.from || query.to
        ? {
            inicio: {
              ...(query.from ? { gte: new Date(query.from) } : {}),
              ...(query.to ? { lte: new Date(query.to) } : {}),
            },
          }
        : {}),
    };
    const data = await this.prisma.agendaSlot.findMany({
      where,
      orderBy: { inicio: "asc" },
    });
    return { data: data.map(toDto) };
  }

  async update(
    actor: AuthenticatedUser,
    vistoriadorId: string,
    slotId: string,
    input: UpdateAgendaSlotDto,
  ): Promise<AgendaSlotDto> {
    if (
      input.inicio === undefined &&
      input.fim === undefined &&
      input.disponivel === undefined &&
      input.motivo === undefined
    ) {
      throw new BadRequestException("Nenhum campo informado para atualização.");
    }
    const result = await this.prisma.$transaction(async (tx) => {
      const current = await tx.agendaSlot.findFirst({
        where: { id: slotId, tenantId: actor.tenantId, vistoriadorId },
      });
      if (!current) {
        throw new NotFoundException("Slot não encontrado.");
      }
      const novoInicio =
        input.inicio !== undefined ? new Date(input.inicio) : current.inicio;
      const novoFim =
        input.fim !== undefined ? new Date(input.fim) : current.fim;
      if (novoFim <= novoInicio) {
        throw new BadRequestException("`fim` deve ser maior que `inicio`.");
      }
      const data: Prisma.AgendaSlotUpdateInput = {};
      if (input.inicio !== undefined) data.inicio = novoInicio;
      if (input.fim !== undefined) data.fim = novoFim;
      if (input.disponivel !== undefined) data.disponivel = input.disponivel;
      if (input.motivo !== undefined) data.motivo = input.motivo;
      const updated = await tx.agendaSlot.update({
        where: { id: slotId },
        data,
      });
      await tx.auditLog.create({
        data: {
          tenantId: actor.tenantId,
          userId: actor.id,
          action: "AGENDA.SLOT_UPDATED",
          resourceType: "AgendaSlot",
          resourceId: slotId,
          before: current as unknown as Prisma.InputJsonValue,
          after: updated as unknown as Prisma.InputJsonValue,
        },
      });
      return updated;
    });
    return toDto(result);
  }

  async remove(
    actor: AuthenticatedUser,
    vistoriadorId: string,
    slotId: string,
  ): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const current = await tx.agendaSlot.findFirst({
        where: { id: slotId, tenantId: actor.tenantId, vistoriadorId },
      });
      if (!current) {
        throw new NotFoundException("Slot não encontrado.");
      }
      await tx.agendaSlot.delete({ where: { id: slotId } });
      await tx.auditLog.create({
        data: {
          tenantId: actor.tenantId,
          userId: actor.id,
          action: "AGENDA.SLOT_DELETED",
          resourceType: "AgendaSlot",
          resourceId: slotId,
          before: current as unknown as Prisma.InputJsonValue,
        },
      });
    });
  }
}
