import { Test } from "@nestjs/testing";
import { ConflictException, NotFoundException } from "@nestjs/common";
import { Role, StatusVistoria, TipoVistoria } from "@prisma/client";
import { VistoriasService } from "./vistorias.service";
import { PrismaService } from "../infrastructure/prisma/prisma.service";
import type { AuthenticatedUser } from "../auth/jwt-payload.interface";

const actor: AuthenticatedUser = {
  id: "u-1",
  tenantId: "t-1",
  email: "admin@example.com",
  roles: [Role.ADMIN],
};

function vistoriaFixture(overrides: Partial<Record<string, unknown>> = {}) {
  const now = new Date("2026-05-19T00:00:00Z");
  return {
    id: "v-1",
    tenantId: "t-1",
    status: StatusVistoria.SOLICITADA,
    tipo: TipoVistoria.ENTRADA,
    enderecoLogradouro: "Rua A",
    enderecoNumero: "123",
    enderecoComplemento: null,
    enderecoBairro: "Centro",
    enderecoCidade: "Porto Alegre",
    enderecoUf: "RS",
    enderecoCep: "90000-000",
    contatoNome: "Cliente",
    contatoTelefone: "5199999-9999",
    contatoEmail: null,
    observacoes: null,
    vistoriadorId: null,
    providerId: null,
    agendadoPara: null,
    concluidoEm: null,
    canceladoEm: null,
    canceladoMotivo: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

describe("VistoriasService.cancel", () => {
  let service: VistoriasService;
  const txMock = {
    vistoria: { findFirst: jest.fn(), update: jest.fn() },
    vistoriaTransicao: { create: jest.fn() },
    auditLog: { create: jest.fn() },
  };
  const prismaMock = {
    $transaction: jest.fn(async (fn: (tx: typeof txMock) => Promise<unknown>) =>
      fn(txMock),
    ),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [
        VistoriasService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();
    service = moduleRef.get(VistoriasService);
  });

  it("cancela vistoria em estado SOLICITADA", async () => {
    const current = vistoriaFixture({ status: StatusVistoria.SOLICITADA });
    const updated = vistoriaFixture({
      status: StatusVistoria.CANCELADA,
      canceladoEm: new Date("2026-05-19T01:00:00Z"),
      canceladoMotivo: "Cliente desistiu",
    });
    txMock.vistoria.findFirst.mockResolvedValue(current);
    txMock.vistoria.update.mockResolvedValue(updated);

    const result = await service.cancel(actor, "v-1", {
      motivo: "Cliente desistiu",
    });

    expect(result.status).toBe(StatusVistoria.CANCELADA);
    expect(txMock.vistoriaTransicao.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        de: StatusVistoria.SOLICITADA,
        para: StatusVistoria.CANCELADA,
        motivo: "Cliente desistiu",
      }),
    });
    expect(txMock.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: "VISTORIA.CANCELED",
        resourceType: "Vistoria",
        resourceId: "v-1",
      }),
    });
  });

  it("rejeita cancelar uma vistoria CONCLUIDA", async () => {
    const current = vistoriaFixture({ status: StatusVistoria.CONCLUIDA });
    txMock.vistoria.findFirst.mockResolvedValue(current);

    await expect(
      service.cancel(actor, "v-1", { motivo: "irrelevante" }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(txMock.vistoria.update).not.toHaveBeenCalled();
  });

  it("rejeita cancelar uma vistoria EM_EXECUCAO", async () => {
    const current = vistoriaFixture({ status: StatusVistoria.EM_EXECUCAO });
    txMock.vistoria.findFirst.mockResolvedValue(current);

    await expect(
      service.cancel(actor, "v-1", { motivo: "irrelevante" }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it("lança 404 se a vistoria não existe no tenant", async () => {
    txMock.vistoria.findFirst.mockResolvedValue(null);
    await expect(
      service.cancel(actor, "v-404", { motivo: "x" }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
