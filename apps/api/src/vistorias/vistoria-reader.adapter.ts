import { Injectable } from "@nestjs/common";
import type {
  VistoriaReaderPort,
  VistoriaSnapshot,
} from "@vistoria/integrations";
import { PrismaService } from "../infrastructure/prisma/prisma.service";

/**
 * Implementação BE da {@link VistoriaReaderPort} (port definida em
 * `packages/integrations` na Sprint 28 IN). Lê a Vistoria via Prisma
 * aplicando tenant isolation. Usado pelo `InternoProvider.consultar()` —
 * mantém IN sem importar do domínio do BE.
 *
 * BE-side dentro de uma sprint IN, mesmo padrão da Sprint 23 (handler do BE
 * estendido lá): o adapter é só o "consumidor" da port que IN definiu, sem
 * alterar lógica de negócio.
 */
@Injectable()
export class VistoriaReaderAdapter implements VistoriaReaderPort {
  constructor(private readonly prisma: PrismaService) {}

  async read(
    vistoriaId: string,
    tenantId: string,
  ): Promise<VistoriaSnapshot | null> {
    const v = await this.prisma.vistoria.findFirst({
      where: { id: vistoriaId, tenantId },
      select: {
        id: true,
        tenantId: true,
        status: true,
        codigoImovelExterno: true,
        vistoriadorId: true,
        agendadoPara: true,
        concluidoEm: true,
        canceladoEm: true,
        canceladoMotivo: true,
        observacoes: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    if (!v) return null;
    return {
      vistoriaId: v.id,
      tenantId: v.tenantId,
      status: v.status,
      codigoImovelExterno: v.codigoImovelExterno,
      vistoriadorId: v.vistoriadorId,
      agendadoPara: v.agendadoPara,
      concluidoEm: v.concluidoEm,
      canceladoEm: v.canceladoEm,
      canceladoMotivo: v.canceladoMotivo,
      observacoes: v.observacoes,
      createdAt: v.createdAt,
      updatedAt: v.updatedAt,
    };
  }
}
