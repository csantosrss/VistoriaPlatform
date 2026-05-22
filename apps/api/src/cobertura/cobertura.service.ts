import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  Prisma,
  Role,
  type VistoriadorCobertura as CoberturaModel,
} from "@prisma/client";
import type {
  ListCoberturasResponse,
  VistoriadorCobertura as CoberturaDto,
} from "@vistoria/api-contracts";
import { PrismaService } from "../infrastructure/prisma/prisma.service";
import type { AuthenticatedUser } from "../auth/jwt-payload.interface";
import type { CreateCoberturaDto } from "./dto/create-cobertura.dto";

function toDto(c: CoberturaModel): CoberturaDto {
  return {
    id: c.id,
    tenantId: c.tenantId,
    vistoriadorId: c.vistoriadorId,
    uf: c.uf,
    cidade: c.cidade,
    bairro: c.bairro,
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
  };
}

/** "A cobre B" = existe alguma linha A com `uf=ufB AND (A.cidade==null OR A.cidade==cidadeB)
 * AND (A.bairro==null OR A.bairro==bairroB)`. Usado para detectar overlap entre uma
 * cobertura nova e as existentes — qualquer overlap dispara 409 (decisão de produto
 * Sprint 22: redundância sempre bloqueia, exibe qual regra existente bloqueia). */
function covers(
  a: { uf: string; cidade: string | null; bairro: string | null },
  b: { uf: string; cidade: string | null; bairro: string | null },
): boolean {
  if (a.uf !== b.uf) return false;
  if (a.cidade !== null && a.cidade !== b.cidade) return false;
  if (a.bairro !== null && a.bairro !== b.bairro) return false;
  return true;
}

@Injectable()
export class CoberturaService {
  constructor(private readonly prisma: PrismaService) {}

  /** Igual à Agenda: User precisa existir no tenant, ser VISTORIADOR ativo
   * e ter `providerId` set (invariante Sprint 22 BE). */
  private async assertVistoriador(
    tenantId: string,
    vistoriadorId: string,
  ): Promise<void> {
    const user = await this.prisma.user.findFirst({
      where: { id: vistoriadorId, tenantId },
      select: { id: true, roles: true, active: true, providerId: true },
    });
    if (!user) throw new NotFoundException("Vistoriador não encontrado.");
    if (!user.active)
      throw new BadRequestException("Vistoriador está inativo.");
    if (!user.roles.includes(Role.VISTORIADOR)) {
      throw new BadRequestException(
        "Usuário informado não tem role VISTORIADOR.",
      );
    }
    if (!user.providerId) {
      throw new BadRequestException(
        "Vistoriador precisa ter `providerId` definido antes de cadastrar cobertura. Atualize via PATCH /users/:id.",
      );
    }
  }

  async list(
    actor: AuthenticatedUser,
    vistoriadorId: string,
  ): Promise<ListCoberturasResponse> {
    await this.assertVistoriador(actor.tenantId, vistoriadorId);
    const data = await this.prisma.vistoriadorCobertura.findMany({
      where: { tenantId: actor.tenantId, vistoriadorId },
      orderBy: [{ uf: "asc" }, { cidade: "asc" }, { bairro: "asc" }],
    });
    return { data: data.map(toDto) };
  }

  async create(
    actor: AuthenticatedUser,
    vistoriadorId: string,
    input: CreateCoberturaDto,
  ): Promise<CoberturaDto> {
    await this.assertVistoriador(actor.tenantId, vistoriadorId);

    const uf = input.uf.toUpperCase();
    const cidade = input.cidade?.trim() || null;
    const bairro = input.bairro?.trim() || null;

    if (bairro && !cidade) {
      throw new BadRequestException(
        "`bairro` só pode ser informado quando `cidade` está presente.",
      );
    }

    const target = { uf, cidade, bairro };

    // Carrega todas as coberturas existentes do vistoriador na mesma UF e
    // checa overlap em qualquer direção (existente cobre nova, nova cobre
    // existente, exact-duplicate). Tabela pequena por vistoriador (algumas
    // dezenas no pior caso); load total é OK.
    const existing = await this.prisma.vistoriadorCobertura.findMany({
      where: { tenantId: actor.tenantId, vistoriadorId, uf },
    });

    for (const ex of existing) {
      const exTuple = { uf: ex.uf, cidade: ex.cidade, bairro: ex.bairro };
      if (covers(exTuple, target) || covers(target, exTuple)) {
        throw new ConflictException(
          `Cobertura conflita com regra existente (${formatTuple(exTuple)}). Remova-a primeiro se quiser substituir.`,
        );
      }
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const created = await tx.vistoriadorCobertura.create({
        data: {
          tenantId: actor.tenantId,
          vistoriadorId,
          uf,
          cidade,
          bairro,
        },
      });
      await tx.auditLog.create({
        data: {
          tenantId: actor.tenantId,
          userId: actor.id,
          action: "COBERTURA.CREATED",
          resourceType: "VistoriadorCobertura",
          resourceId: created.id,
          after: {
            vistoriadorId,
            uf,
            cidade,
            bairro,
          } as Prisma.InputJsonValue,
        },
      });
      return created;
    });
    return toDto(result);
  }

  async remove(
    actor: AuthenticatedUser,
    vistoriadorId: string,
    coberturaId: string,
  ): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const current = await tx.vistoriadorCobertura.findFirst({
        where: { id: coberturaId, tenantId: actor.tenantId, vistoriadorId },
      });
      if (!current) {
        throw new NotFoundException("Cobertura não encontrada.");
      }
      await tx.vistoriadorCobertura.delete({ where: { id: coberturaId } });
      await tx.auditLog.create({
        data: {
          tenantId: actor.tenantId,
          userId: actor.id,
          action: "COBERTURA.DELETED",
          resourceType: "VistoriadorCobertura",
          resourceId: coberturaId,
          before: {
            vistoriadorId: current.vistoriadorId,
            uf: current.uf,
            cidade: current.cidade,
            bairro: current.bairro,
          } as Prisma.InputJsonValue,
        },
      });
    });
  }
}

function formatTuple(t: {
  uf: string;
  cidade: string | null;
  bairro: string | null;
}): string {
  if (t.bairro) return `${t.uf} · ${t.cidade} · ${t.bairro}`;
  if (t.cidade) return `${t.uf} · ${t.cidade}`;
  return t.uf;
}
