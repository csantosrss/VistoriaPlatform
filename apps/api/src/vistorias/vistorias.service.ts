import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  Prisma,
  StatusVistoria,
  type Vistoria as VistoriaModel,
} from "@prisma/client";
import { PrismaService } from "../infrastructure/prisma/prisma.service";
import type { CreateVistoriaDto } from "./dto/create-vistoria.dto";
import type { CancelVistoriaDto } from "./dto/cancel-vistoria.dto";
import type { ListVistoriasQueryDto } from "./dto/list-vistorias.dto";
import type {
  ListVistoriasResponse,
  Vistoria as VistoriaDto,
} from "@vistoria/api-contracts";
import type { AuthenticatedUser } from "../auth/jwt-payload.interface";

const ESTADOS_CANCELAVEIS: StatusVistoria[] = [
  StatusVistoria.SOLICITADA,
  StatusVistoria.ROTEADA,
  StatusVistoria.AGENDADA,
  StatusVistoria.CONFIRMADA,
];

function toDto(v: VistoriaModel): VistoriaDto {
  return {
    id: v.id,
    tenantId: v.tenantId,
    status: v.status,
    tipo: v.tipo,
    enderecoLogradouro: v.enderecoLogradouro,
    enderecoNumero: v.enderecoNumero,
    enderecoComplemento: v.enderecoComplemento,
    enderecoBairro: v.enderecoBairro,
    enderecoCidade: v.enderecoCidade,
    enderecoUf: v.enderecoUf,
    enderecoCep: v.enderecoCep,
    contatoNome: v.contatoNome,
    contatoTelefone: v.contatoTelefone,
    contatoEmail: v.contatoEmail,
    observacoes: v.observacoes,
    vistoriadorId: v.vistoriadorId,
    providerId: v.providerId,
    agendadoPara: v.agendadoPara ? v.agendadoPara.toISOString() : null,
    concluidoEm: v.concluidoEm ? v.concluidoEm.toISOString() : null,
    canceladoEm: v.canceladoEm ? v.canceladoEm.toISOString() : null,
    canceladoMotivo: v.canceladoMotivo,
    createdAt: v.createdAt.toISOString(),
    updatedAt: v.updatedAt.toISOString(),
  };
}

@Injectable()
export class VistoriasService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    actor: AuthenticatedUser,
    input: CreateVistoriaDto,
  ): Promise<VistoriaDto> {
    const result = await this.prisma.$transaction(async (tx) => {
      const vistoria = await tx.vistoria.create({
        data: {
          tenantId: actor.tenantId,
          status: StatusVistoria.SOLICITADA,
          tipo: input.tipo,
          enderecoLogradouro: input.enderecoLogradouro,
          enderecoNumero: input.enderecoNumero,
          enderecoComplemento: input.enderecoComplemento ?? null,
          enderecoBairro: input.enderecoBairro,
          enderecoCidade: input.enderecoCidade,
          enderecoUf: input.enderecoUf.toUpperCase(),
          enderecoCep: input.enderecoCep,
          contatoNome: input.contatoNome,
          contatoTelefone: input.contatoTelefone,
          contatoEmail: input.contatoEmail ?? null,
          observacoes: input.observacoes ?? null,
        },
      });
      await tx.vistoriaTransicao.create({
        data: {
          vistoriaId: vistoria.id,
          tenantId: vistoria.tenantId,
          de: null,
          para: StatusVistoria.SOLICITADA,
          executadoPor: actor.id,
        },
      });
      await tx.auditLog.create({
        data: {
          tenantId: actor.tenantId,
          userId: actor.id,
          action: "VISTORIA.CREATED",
          resourceType: "Vistoria",
          resourceId: vistoria.id,
          after: vistoria as unknown as Prisma.InputJsonValue,
        },
      });
      return vistoria;
    });
    return toDto(result);
  }

  async list(
    actor: AuthenticatedUser,
    query: ListVistoriasQueryDto,
  ): Promise<ListVistoriasResponse> {
    const where: Prisma.VistoriaWhereInput = {
      tenantId: actor.tenantId,
      ...(query.status ? { status: query.status } : {}),
      ...(query.tipo ? { tipo: query.tipo } : {}),
      ...(query.vistoriadorId ? { vistoriadorId: query.vistoriadorId } : {}),
      ...(query.from || query.to
        ? {
            createdAt: {
              ...(query.from ? { gte: new Date(query.from) } : {}),
              ...(query.to ? { lte: new Date(query.to) } : {}),
            },
          }
        : {}),
    };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.vistoria.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.prisma.vistoria.count({ where }),
    ]);
    return {
      data: data.map(toDto),
      page: query.page,
      pageSize: query.pageSize,
      total,
    };
  }

  async findOne(actor: AuthenticatedUser, id: string): Promise<VistoriaDto> {
    const vistoria = await this.prisma.vistoria.findFirst({
      where: { id, tenantId: actor.tenantId },
    });
    if (!vistoria) {
      throw new NotFoundException("Vistoria não encontrada.");
    }
    return toDto(vistoria);
  }

  async cancel(
    actor: AuthenticatedUser,
    id: string,
    input: CancelVistoriaDto,
  ): Promise<VistoriaDto> {
    const result = await this.prisma.$transaction(async (tx) => {
      const current = await tx.vistoria.findFirst({
        where: { id, tenantId: actor.tenantId },
      });
      if (!current) {
        throw new NotFoundException("Vistoria não encontrada.");
      }
      if (!ESTADOS_CANCELAVEIS.includes(current.status)) {
        throw new ConflictException(
          `Vistoria em estado ${current.status} não pode ser cancelada.`,
        );
      }
      const updated = await tx.vistoria.update({
        where: { id },
        data: {
          status: StatusVistoria.CANCELADA,
          canceladoEm: new Date(),
          canceladoMotivo: input.motivo,
        },
      });
      await tx.vistoriaTransicao.create({
        data: {
          vistoriaId: id,
          tenantId: actor.tenantId,
          de: current.status,
          para: StatusVistoria.CANCELADA,
          motivo: input.motivo,
          executadoPor: actor.id,
        },
      });
      await tx.auditLog.create({
        data: {
          tenantId: actor.tenantId,
          userId: actor.id,
          action: "VISTORIA.CANCELED",
          resourceType: "Vistoria",
          resourceId: id,
          before: current as unknown as Prisma.InputJsonValue,
          after: updated as unknown as Prisma.InputJsonValue,
        },
      });
      return updated;
    });
    if (result instanceof BadRequestException) throw result;
    return toDto(result);
  }
}
