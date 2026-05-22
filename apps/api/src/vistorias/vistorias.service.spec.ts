import { Test } from "@nestjs/testing";
import { ConflictException, NotFoundException } from "@nestjs/common";
import { Role, StatusVistoria, TipoVistoria } from "@prisma/client";
import { ProviderRoutingService } from "@vistoria/integrations";
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

describe("VistoriasService", () => {
  let service: VistoriasService;
  const txMock = {
    vistoria: { findFirst: jest.fn(), update: jest.fn(), create: jest.fn() },
    vistoriaTransicao: { create: jest.fn(), createMany: jest.fn() },
    auditLog: { create: jest.fn(), createMany: jest.fn() },
  };
  const prismaMock = {
    $transaction: jest.fn(
      async (
        arg: ((tx: typeof txMock) => Promise<unknown>) | Promise<unknown>[],
      ) => (Array.isArray(arg) ? Promise.all(arg) : arg(txMock)),
    ),
    vistoria: { findFirst: jest.fn(), groupBy: jest.fn() },
    vistoriaTransicao: { findMany: jest.fn() },
  };
  const routing = new ProviderRoutingService();

  beforeEach(async () => {
    jest.clearAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [
        VistoriasService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: ProviderRoutingService, useValue: routing },
      ],
    }).compile();
    service = moduleRef.get(VistoriasService);
  });

  describe("create", () => {
    it("roteia na criação e devolve vistoria já em ROTEADA com providerId + transições + auditoria", async () => {
      const created = vistoriaFixture({
        status: StatusVistoria.ROTEADA,
        providerId: "rede-vistorias",
        enderecoUf: "SP",
      });
      txMock.vistoria.create.mockResolvedValue(created);

      const result = await service.create(actor, {
        tipo: TipoVistoria.ENTRADA,
        codigoImovelExterno: "IMOVEL-001",
        enderecoLogradouro: "Rua B",
        enderecoNumero: "10",
        enderecoBairro: "Centro",
        enderecoCidade: "São Paulo",
        enderecoUf: "sp",
        enderecoCep: "01000-000",
        contatoNome: "Cliente",
        contatoTelefone: "5511999999999",
      });

      expect(result.status).toBe(StatusVistoria.ROTEADA);
      expect(result.providerId).toBe("rede-vistorias");
      expect(txMock.vistoria.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: StatusVistoria.ROTEADA,
            providerId: "rede-vistorias",
            enderecoUf: "SP",
          }),
        }),
      );
      expect(txMock.vistoriaTransicao.createMany).toHaveBeenCalledWith({
        data: expect.arrayContaining([
          expect.objectContaining({
            de: null,
            para: StatusVistoria.SOLICITADA,
          }),
          expect.objectContaining({
            de: StatusVistoria.SOLICITADA,
            para: StatusVistoria.ROTEADA,
            motivo: expect.stringContaining("SP"),
          }),
        ]),
      });
      expect(txMock.auditLog.createMany).toHaveBeenCalledWith({
        data: expect.arrayContaining([
          expect.objectContaining({ action: "VISTORIA.CREATED" }),
          expect.objectContaining({ action: "VISTORIA.ROUTED" }),
        ]),
      });
    });

    it("roteia SAIDA para o provider interno", async () => {
      const created = vistoriaFixture({
        status: StatusVistoria.ROTEADA,
        providerId: "interno",
        tipo: TipoVistoria.SAIDA,
        enderecoUf: "SP",
      });
      txMock.vistoria.create.mockResolvedValue(created);

      const result = await service.create(actor, {
        tipo: TipoVistoria.SAIDA,
        codigoImovelExterno: "IMOVEL-002",
        enderecoLogradouro: "Rua C",
        enderecoNumero: "20",
        enderecoBairro: "Centro",
        enderecoCidade: "São Paulo",
        enderecoUf: "SP",
        enderecoCep: "01000-000",
        contatoNome: "Cliente",
        contatoTelefone: "5511999999999",
      });

      expect(result.providerId).toBe("interno");
    });
  });

  describe("stats", () => {
    it("retorna total + byStatus preenchido com zeros nos status ausentes", async () => {
      prismaMock.vistoria.groupBy.mockResolvedValue([
        { status: StatusVistoria.ROTEADA, _count: { _all: 4 } },
        { status: StatusVistoria.CANCELADA, _count: { _all: 1 } },
      ]);

      const result = await service.stats(actor);

      expect(result.total).toBe(5);
      expect(result.byStatus[StatusVistoria.ROTEADA]).toBe(4);
      expect(result.byStatus[StatusVistoria.CANCELADA]).toBe(1);
      expect(result.byStatus[StatusVistoria.SOLICITADA]).toBe(0);
      expect(result.byStatus[StatusVistoria.CONCLUIDA]).toBe(0);
    });
  });

  describe("listTransicoes", () => {
    it("devolve transições ordem ASC quando a vistoria existe no tenant", async () => {
      prismaMock.vistoria.findFirst.mockResolvedValue({ id: "v-1" });
      prismaMock.vistoriaTransicao.findMany.mockResolvedValue([
        {
          id: "t-1",
          vistoriaId: "v-1",
          tenantId: "t-1",
          de: null,
          para: StatusVistoria.SOLICITADA,
          motivo: null,
          executadoPor: "u-1",
          correlationId: null,
          createdAt: new Date("2026-05-19T00:00:00Z"),
        },
        {
          id: "t-2",
          vistoriaId: "v-1",
          tenantId: "t-1",
          de: StatusVistoria.SOLICITADA,
          para: StatusVistoria.ROTEADA,
          motivo: "UF SP → rede-vistorias",
          executadoPor: "u-1",
          correlationId: null,
          createdAt: new Date("2026-05-19T00:00:01Z"),
        },
      ]);

      const result = await service.listTransicoes(actor, "v-1");

      expect(result.data).toHaveLength(2);
      expect(result.data[0].para).toBe(StatusVistoria.SOLICITADA);
      expect(result.data[1].para).toBe(StatusVistoria.ROTEADA);
    });

    it("404 quando a vistoria não existe no tenant", async () => {
      prismaMock.vistoria.findFirst.mockResolvedValue(null);
      await expect(
        service.listTransicoes(actor, "v-404"),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe("cancel", () => {
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

    it("lança 404 se a vistoria não existe no tenant", async () => {
      txMock.vistoria.findFirst.mockResolvedValue(null);
      await expect(
        service.cancel(actor, "v-404", { motivo: "x" }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});
