import { Test } from "@nestjs/testing";
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from "@nestjs/common";
import { Role } from "@prisma/client";
import { UsersService } from "./users.service";
import { PrismaService } from "../infrastructure/prisma/prisma.service";
import type { AuthenticatedUser } from "../auth/jwt-payload.interface";

const actor: AuthenticatedUser = {
  id: "00000000-0000-4000-8000-000000000001",
  tenantId: "00000000-0000-4000-8000-000000000010",
  email: "admin@example.com",
  roles: [Role.ADMIN],
};

function userFixture(overrides: Partial<Record<string, unknown>> = {}) {
  const now = new Date("2026-05-21T00:00:00Z");
  return {
    id: "00000000-0000-4000-8000-000000000099",
    tenantId: actor.tenantId,
    email: "vistoriador@example.com",
    name: "Vistoriador",
    passwordHash: "hash",
    roles: [Role.VISTORIADOR],
    active: true,
    providerId: "interno",
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

describe("UsersService", () => {
  let service: UsersService;
  const tx = {
    user: { findFirst: jest.fn(), create: jest.fn(), update: jest.fn() },
    auditLog: { create: jest.fn() },
  };
  const prismaMock = {
    $transaction: jest.fn(
      async (arg: ((t: typeof tx) => Promise<unknown>) | Promise<unknown>[]) =>
        Array.isArray(arg) ? Promise.all(arg) : arg(tx),
    ),
    user: { findMany: jest.fn(), count: jest.fn() },
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const ref = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();
    service = ref.get(UsersService);
  });

  describe("create", () => {
    it("cria vistoriador com providerId e grava audit USER.CREATED", async () => {
      tx.user.findFirst.mockResolvedValueOnce(null);
      tx.user.create.mockResolvedValueOnce(userFixture());

      const result = await service.create(actor, {
        email: "vistoriador@example.com",
        name: "Vistoriador",
        password: "senha-forte-123",
        roles: [Role.VISTORIADOR],
        providerId: "interno",
      });

      expect(result.email).toBe("vistoriador@example.com");
      expect(result.providerId).toBe("interno");
      expect(tx.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            tenantId: actor.tenantId,
            roles: [Role.VISTORIADOR],
            providerId: "interno",
            active: true,
          }),
        }),
      );
      expect(tx.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ action: "USER.CREATED" }),
      });
    });

    it("rejeita 400 quando role VISTORIADOR sem providerId", async () => {
      await expect(
        service.create(actor, {
          email: "x@x.com",
          name: "X",
          password: "senha-forte",
          roles: [Role.VISTORIADOR],
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it("cria GESTOR sem providerId (ignora se informado)", async () => {
      tx.user.findFirst.mockResolvedValueOnce(null);
      tx.user.create.mockResolvedValueOnce(
        userFixture({ roles: [Role.GESTOR], providerId: null }),
      );
      await service.create(actor, {
        email: "gestor@x.com",
        name: "G",
        password: "senha-forte",
        roles: [Role.GESTOR],
        providerId: "interno",
      });
      expect(tx.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ providerId: null }),
        }),
      );
    });

    it("rejeita com 409 quando o e-mail já existe no tenant", async () => {
      tx.user.findFirst.mockResolvedValueOnce({ id: "existing" });
      await expect(
        service.create(actor, {
          email: "duplicado@example.com",
          name: "X",
          password: "senha-forte",
          roles: [Role.GESTOR],
        }),
      ).rejects.toBeInstanceOf(ConflictException);
    });
  });

  describe("update — providerId invariant", () => {
    it("400 ao tentar mudar para role VISTORIADOR sem providerId atual", async () => {
      const current = userFixture({
        roles: [Role.GESTOR],
        providerId: null,
      });
      tx.user.findFirst.mockResolvedValueOnce(current);

      await expect(
        service.update(actor, current.id, { roles: [Role.VISTORIADOR] }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it("limpa providerId ao remover VISTORIADOR das roles", async () => {
      const current = userFixture({ providerId: "interno" });
      tx.user.findFirst.mockResolvedValueOnce(current);
      tx.user.update.mockResolvedValueOnce({
        ...current,
        roles: [Role.GESTOR],
        providerId: null,
      });

      await service.update(actor, current.id, { roles: [Role.GESTOR] });
      expect(tx.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ providerId: null }),
        }),
      );
      expect(tx.user.create).not.toHaveBeenCalled();
    });
  });

  describe("update", () => {
    it("atualiza roles e grava audit USER.UPDATED", async () => {
      const current = userFixture();
      tx.user.findFirst.mockResolvedValueOnce(current);
      tx.user.update.mockResolvedValueOnce({
        ...current,
        roles: [Role.GESTOR],
      });

      const result = await service.update(actor, current.id, {
        roles: [Role.GESTOR],
      });
      expect(result.roles).toEqual([Role.GESTOR]);
      expect(tx.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ action: "USER.UPDATED" }),
      });
    });

    it("rejeita update sem nenhum campo", async () => {
      await expect(service.update(actor, "any", {})).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it("404 quando o user não existe no tenant", async () => {
      tx.user.findFirst.mockResolvedValueOnce(null);
      await expect(
        service.update(actor, "missing", { name: "Novo" }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe("deactivate", () => {
    it("desativa user e grava USER.DEACTIVATED", async () => {
      const current = userFixture();
      tx.user.findFirst.mockResolvedValueOnce(current);
      tx.user.update.mockResolvedValueOnce({ ...current, active: false });

      const result = await service.deactivate(actor, current.id);
      expect(result.active).toBe(false);
      expect(tx.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ action: "USER.DEACTIVATED" }),
      });
    });

    it("bloqueia auto-desativação", async () => {
      await expect(service.deactivate(actor, actor.id)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });

    it("é idempotente quando o user já está inativo", async () => {
      const current = userFixture({ active: false });
      tx.user.findFirst.mockResolvedValueOnce(current);
      const result = await service.deactivate(actor, current.id);
      expect(result.active).toBe(false);
      expect(tx.user.update).not.toHaveBeenCalled();
    });
  });
});
