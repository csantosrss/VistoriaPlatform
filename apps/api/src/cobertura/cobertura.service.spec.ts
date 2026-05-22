import { Test } from "@nestjs/testing";
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from "@nestjs/common";
import { Role } from "@prisma/client";
import { CoberturaService } from "./cobertura.service";
import { PrismaService } from "../infrastructure/prisma/prisma.service";
import type { AuthenticatedUser } from "../auth/jwt-payload.interface";

const actor: AuthenticatedUser = {
  id: "00000000-0000-4000-8000-000000000001",
  tenantId: "00000000-0000-4000-8000-000000000010",
  email: "gestor@example.com",
  roles: [Role.GESTOR],
};

const VISTORIADOR_ID = "00000000-0000-4000-8000-000000000099";

function userFixture(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: VISTORIADOR_ID,
    roles: [Role.VISTORIADOR],
    active: true,
    providerId: "interno",
    ...overrides,
  };
}

function coberturaRow(
  uf: string,
  cidade: string | null,
  bairro: string | null,
  id = "c-" + uf + (cidade ?? "_") + (bairro ?? "_"),
) {
  const now = new Date("2026-05-21T00:00:00Z");
  return {
    id,
    tenantId: actor.tenantId,
    vistoriadorId: VISTORIADOR_ID,
    uf,
    cidade,
    bairro,
    createdAt: now,
    updatedAt: now,
  };
}

describe("CoberturaService", () => {
  let service: CoberturaService;
  const tx = {
    vistoriadorCobertura: {
      findFirst: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
    },
    auditLog: { create: jest.fn() },
  };
  const prismaMock = {
    $transaction: jest.fn(async (fn: (t: typeof tx) => Promise<unknown>) =>
      fn(tx),
    ),
    user: { findFirst: jest.fn() },
    vistoriadorCobertura: { findMany: jest.fn() },
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const ref = await Test.createTestingModule({
      providers: [
        CoberturaService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();
    service = ref.get(CoberturaService);
  });

  describe("assertVistoriador (preconditions)", () => {
    it("404 quando vistoriador não existe no tenant", async () => {
      prismaMock.user.findFirst.mockResolvedValueOnce(null);
      await expect(
        service.create(actor, VISTORIADOR_ID, { uf: "SP" }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it("400 quando usuário não é VISTORIADOR", async () => {
      prismaMock.user.findFirst.mockResolvedValueOnce(
        userFixture({ roles: [Role.GESTOR] }),
      );
      await expect(
        service.create(actor, VISTORIADOR_ID, { uf: "SP" }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it("400 quando vistoriador sem providerId (invariante S22)", async () => {
      prismaMock.user.findFirst.mockResolvedValueOnce(
        userFixture({ providerId: null }),
      );
      await expect(
        service.create(actor, VISTORIADOR_ID, { uf: "SP" }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe("create", () => {
    beforeEach(() => {
      prismaMock.user.findFirst.mockResolvedValue(userFixture());
    });

    it("cria (SP, null, null) quando não há nada", async () => {
      prismaMock.vistoriadorCobertura.findMany.mockResolvedValueOnce([]);
      tx.vistoriadorCobertura.create.mockResolvedValueOnce(
        coberturaRow("SP", null, null, "c-1"),
      );

      const result = await service.create(actor, VISTORIADOR_ID, { uf: "sp" });
      expect(result.uf).toBe("SP");
      expect(result.cidade).toBeNull();
      expect(result.bairro).toBeNull();
      expect(tx.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ action: "COBERTURA.CREATED" }),
      });
    });

    it("409 quando (SP, null, null) já cobre tentativa (SP, São Paulo, null)", async () => {
      prismaMock.vistoriadorCobertura.findMany.mockResolvedValueOnce([
        coberturaRow("SP", null, null),
      ]);
      await expect(
        service.create(actor, VISTORIADOR_ID, {
          uf: "SP",
          cidade: "São Paulo",
        }),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it("409 quando (SP, São Paulo, null) impede a nova (SP, null, null) mais ampla", async () => {
      prismaMock.vistoriadorCobertura.findMany.mockResolvedValueOnce([
        coberturaRow("SP", "São Paulo", null),
      ]);
      await expect(
        service.create(actor, VISTORIADOR_ID, { uf: "SP" }),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it("409 em duplicata exata (SP, São Paulo, Pinheiros)", async () => {
      prismaMock.vistoriadorCobertura.findMany.mockResolvedValueOnce([
        coberturaRow("SP", "São Paulo", "Pinheiros"),
      ]);
      await expect(
        service.create(actor, VISTORIADOR_ID, {
          uf: "SP",
          cidade: "São Paulo",
          bairro: "Pinheiros",
        }),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it("aceita (SP, São Paulo, Pinheiros) quando só existe (RJ, ...)", async () => {
      prismaMock.vistoriadorCobertura.findMany.mockResolvedValueOnce([]); // só UF=SP é carregada
      tx.vistoriadorCobertura.create.mockResolvedValueOnce(
        coberturaRow("SP", "São Paulo", "Pinheiros"),
      );
      const result = await service.create(actor, VISTORIADOR_ID, {
        uf: "SP",
        cidade: "São Paulo",
        bairro: "Pinheiros",
      });
      expect(result.bairro).toBe("Pinheiros");
    });

    it("400 quando bairro sem cidade", async () => {
      prismaMock.vistoriadorCobertura.findMany.mockResolvedValueOnce([]);
      await expect(
        service.create(actor, VISTORIADOR_ID, {
          uf: "SP",
          bairro: "Pinheiros",
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe("remove", () => {
    it("deleta + audit COBERTURA.DELETED", async () => {
      tx.vistoriadorCobertura.findFirst.mockResolvedValueOnce(
        coberturaRow("SP", null, null, "c-1"),
      );
      await service.remove(actor, VISTORIADOR_ID, "c-1");
      expect(tx.vistoriadorCobertura.delete).toHaveBeenCalledWith({
        where: { id: "c-1" },
      });
      expect(tx.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ action: "COBERTURA.DELETED" }),
      });
    });

    it("404 quando não existe", async () => {
      tx.vistoriadorCobertura.findFirst.mockResolvedValueOnce(null);
      await expect(
        service.remove(actor, VISTORIADOR_ID, "missing"),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});
