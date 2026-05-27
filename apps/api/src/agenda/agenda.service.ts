import {
  BadRequestException,
  ForbiddenException,
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
  BulkOpResponse,
  ListAgendaSlotsResponse,
} from "@vistoria/api-contracts";
import { PrismaService } from "../infrastructure/prisma/prisma.service";
import type { AuthenticatedUser } from "../auth/jwt-payload.interface";
import type { BulkBlockAgendaDto } from "./dto/bulk-block-agenda.dto";
import type { BulkDeleteAgendaDto } from "./dto/bulk-delete-agenda.dto";
import type { BulkUpdateAgendaDto } from "./dto/bulk-update-agenda.dto";
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

  /** RBAC fino (Sprint 27 BE): VISTORIADOR sem ADMIN/GESTOR só pode operar
   * sobre a própria agenda. Chamado em TODOS os endpoints (list/create/update/
   * remove/bulk) — defesa em profundidade contra mudanças futuras no controller. */
  private assertCanAccessAgendaOf(
    actor: AuthenticatedUser,
    vistoriadorId: string,
  ): void {
    const isVistoriador = actor.roles.includes(Role.VISTORIADOR);
    const isPrivileged =
      actor.roles.includes(Role.ADMIN) || actor.roles.includes(Role.GESTOR);
    if (isVistoriador && !isPrivileged && actor.id !== vistoriadorId) {
      throw new ForbiddenException(
        "Vistoriador só pode acessar a própria agenda.",
      );
    }
  }

  /** Garante que o `vistoriadorId` referencia um User do tenant com role
   * VISTORIADOR ativo **e com `providerId` definido** (Sprint 22 BE: o
   * routing futuro precisa do canal para casar com a cobertura geográfica). */
  private async assertVistoriador(
    actor: AuthenticatedUser,
    vistoriadorId: string,
  ): Promise<void> {
    this.assertCanAccessAgendaOf(actor, vistoriadorId);

    const user = await this.prisma.user.findFirst({
      where: { id: vistoriadorId, tenantId: actor.tenantId },
      select: { id: true, roles: true, active: true, providerId: true },
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
    if (!user.providerId) {
      throw new BadRequestException(
        "Vistoriador precisa ter `providerId` definido antes de cadastrar agenda. Atualize via PATCH /users/:id.",
      );
    }
  }

  async create(
    actor: AuthenticatedUser,
    vistoriadorId: string,
    input: CreateAgendaSlotsDto,
  ): Promise<ListAgendaSlotsResponse> {
    await this.assertVistoriador(actor, vistoriadorId);

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
    await this.assertVistoriador(actor, vistoriadorId);
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
    this.assertCanAccessAgendaOf(actor, vistoriadorId);
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
    this.assertCanAccessAgendaOf(actor, vistoriadorId);
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

  /** Bloqueia todos os slots **disponíveis** do vistoriador que caem
   * inteiramente no intervalo `[from, to]`. Slots que cruzam o limite ficam
   * de fora e aparecem em `excluded` com `reason: "crosses-boundary"`. */
  async bulkBlock(
    actor: AuthenticatedUser,
    vistoriadorId: string,
    input: BulkBlockAgendaDto,
  ): Promise<BulkOpResponse> {
    await this.assertVistoriador(actor, vistoriadorId);
    const from = new Date(input.from);
    const to = new Date(input.to);
    if (to <= from) {
      throw new BadRequestException("`to` deve ser maior que `from`.");
    }

    return this.prisma.$transaction(async (tx) => {
      const candidates = await tx.agendaSlot.findMany({
        where: {
          tenantId: actor.tenantId,
          vistoriadorId,
          inicio: { gte: from },
          fim: { lte: to },
        },
        select: { id: true, disponivel: true },
      });
      const targetIds = candidates.filter((s) => s.disponivel).map((s) => s.id);
      const excluded = candidates
        .filter((s) => !s.disponivel)
        .map((s) => ({ id: s.id, reason: "already-blocked" }));

      if (targetIds.length === 0) {
        return { affectedCount: 0, ids: [], excluded };
      }

      await tx.agendaSlot.updateMany({
        where: { id: { in: targetIds }, tenantId: actor.tenantId },
        data: { disponivel: false, motivo: input.motivo ?? null },
      });

      await tx.auditLog.create({
        data: {
          tenantId: actor.tenantId,
          userId: actor.id,
          action: "AGENDA.BULK_BLOCKED",
          resourceType: "AgendaSlot",
          resourceId: vistoriadorId,
          after: {
            from: input.from,
            to: input.to,
            motivo: input.motivo ?? null,
            affectedCount: targetIds.length,
            ids: targetIds,
            excluded,
          } as Prisma.InputJsonValue,
        },
      });

      return {
        affectedCount: targetIds.length,
        ids: targetIds,
        excluded: excluded.length > 0 ? excluded : undefined,
      };
    });
  }

  /** Atualiza um lote de slots por IDs (apenas slots do próprio tenant e
   * vistoriador). Aceita `disponivel`, `motivo` ou ambos. Atómico. */
  async bulkUpdate(
    actor: AuthenticatedUser,
    vistoriadorId: string,
    input: BulkUpdateAgendaDto,
  ): Promise<BulkOpResponse> {
    await this.assertVistoriador(actor, vistoriadorId);
    if (input.disponivel === undefined && input.motivo === undefined) {
      throw new BadRequestException(
        "Informe ao menos `disponivel` ou `motivo`.",
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const found = await tx.agendaSlot.findMany({
        where: {
          id: { in: input.ids },
          tenantId: actor.tenantId,
          vistoriadorId,
        },
        select: { id: true },
      });
      const foundIds = new Set(found.map((s) => s.id));
      const excluded = input.ids
        .filter((id) => !foundIds.has(id))
        .map((id) => ({ id, reason: "not-found" }));

      if (foundIds.size === 0) {
        return { affectedCount: 0, ids: [], excluded };
      }

      const data: Prisma.AgendaSlotUpdateManyMutationInput = {};
      if (input.disponivel !== undefined) data.disponivel = input.disponivel;
      if (input.motivo !== undefined) data.motivo = input.motivo;

      await tx.agendaSlot.updateMany({
        where: { id: { in: Array.from(foundIds) } },
        data,
      });

      const ids = Array.from(foundIds);
      await tx.auditLog.create({
        data: {
          tenantId: actor.tenantId,
          userId: actor.id,
          action: "AGENDA.BULK_UPDATED",
          resourceType: "AgendaSlot",
          resourceId: vistoriadorId,
          after: {
            disponivel: input.disponivel ?? null,
            motivo: input.motivo ?? null,
            affectedCount: ids.length,
            ids,
            excluded,
          } as Prisma.InputJsonValue,
        },
      });

      return {
        affectedCount: ids.length,
        ids,
        excluded: excluded.length > 0 ? excluded : undefined,
      };
    });
  }

  /** Remove um lote de slots por IDs. Atómico. */
  async bulkDelete(
    actor: AuthenticatedUser,
    vistoriadorId: string,
    input: BulkDeleteAgendaDto,
  ): Promise<BulkOpResponse> {
    await this.assertVistoriador(actor, vistoriadorId);

    return this.prisma.$transaction(async (tx) => {
      const found = await tx.agendaSlot.findMany({
        where: {
          id: { in: input.ids },
          tenantId: actor.tenantId,
          vistoriadorId,
        },
        select: { id: true },
      });
      const foundIds = found.map((s) => s.id);
      const excluded = input.ids
        .filter((id) => !foundIds.includes(id))
        .map((id) => ({ id, reason: "not-found" }));

      if (foundIds.length === 0) {
        return { affectedCount: 0, ids: [], excluded };
      }

      await tx.agendaSlot.deleteMany({ where: { id: { in: foundIds } } });

      await tx.auditLog.create({
        data: {
          tenantId: actor.tenantId,
          userId: actor.id,
          action: "AGENDA.BULK_DELETED",
          resourceType: "AgendaSlot",
          resourceId: vistoriadorId,
          before: {
            affectedCount: foundIds.length,
            ids: foundIds,
            excluded,
          } as Prisma.InputJsonValue,
        },
      });

      return {
        affectedCount: foundIds.length,
        ids: foundIds,
        excluded: excluded.length > 0 ? excluded : undefined,
      };
    });
  }
}
