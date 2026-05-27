import { Test } from "@nestjs/testing";
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from "@nestjs/common";
import { Role } from "@prisma/client";
import { AgendaService } from "./agenda.service";
import { PrismaService } from "../infrastructure/prisma/prisma.service";
import type { AuthenticatedUser } from "../auth/jwt-payload.interface";

const actor: AuthenticatedUser = {
  id: "00000000-0000-4000-8000-000000000001",
  tenantId: "00000000-0000-4000-8000-000000000010",
  email: "gestor@example.com",
  roles: [Role.GESTOR],
};

const VISTORIADOR_ID = "00000000-0000-4000-8000-000000000099";

function vistoriadorFixture(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: VISTORIADOR_ID,
    roles: [Role.VISTORIADOR],
    active: true,
    providerId: "interno",
    ...overrides,
  };
}

function slotFixture(overrides: Partial<Record<string, unknown>> = {}) {
  const now = new Date("2026-05-21T00:00:00Z");
  return {
    id: "00000000-0000-4000-8000-000000000888",
    tenantId: actor.tenantId,
    vistoriadorId: VISTORIADOR_ID,
    inicio: new Date("2026-06-01T08:00:00Z"),
    fim: new Date("2026-06-01T18:00:00Z"),
    disponivel: true,
    motivo: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

describe("AgendaService", () => {
  let service: AgendaService;
  const tx = {
    user: { findFirst: jest.fn() },
    agendaSlot: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
    },
    auditLog: { create: jest.fn() },
  };
  const prismaMock = {
    $transaction: jest.fn(async (fn: (t: typeof tx) => Promise<unknown>) =>
      fn(tx),
    ),
    user: { findFirst: jest.fn() },
    agendaSlot: { findMany: jest.fn() },
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const ref = await Test.createTestingModule({
      providers: [
        AgendaService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();
    service = ref.get(AgendaService);
  });

  describe("create", () => {
    it("cria slots em lote + audit AGENDA.SLOTS_CREATED", async () => {
      prismaMock.user.findFirst.mockResolvedValueOnce(vistoriadorFixture());
      tx.agendaSlot.create
        .mockResolvedValueOnce(slotFixture({ id: "s-1" }))
        .mockResolvedValueOnce(
          slotFixture({
            id: "s-2",
            inicio: new Date("2026-06-02T08:00:00Z"),
            fim: new Date("2026-06-02T18:00:00Z"),
          }),
        );

      const result = await service.create(actor, VISTORIADOR_ID, {
        slots: [
          {
            inicio: "2026-06-01T08:00:00.000Z",
            fim: "2026-06-01T18:00:00.000Z",
            disponivel: true,
          },
          {
            inicio: "2026-06-02T08:00:00.000Z",
            fim: "2026-06-02T18:00:00.000Z",
            disponivel: false,
            motivo: "Plantão dobrado",
          },
        ],
      });

      expect(result.data).toHaveLength(2);
      expect(tx.agendaSlot.create).toHaveBeenCalledTimes(2);
      expect(tx.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ action: "AGENDA.SLOTS_CREATED" }),
      });
    });

    it("rejeita se fim <= inicio em algum slot", async () => {
      prismaMock.user.findFirst.mockResolvedValueOnce(vistoriadorFixture());
      await expect(
        service.create(actor, VISTORIADOR_ID, {
          slots: [
            {
              inicio: "2026-06-01T18:00:00.000Z",
              fim: "2026-06-01T08:00:00.000Z",
            },
          ],
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it("404 quando vistoriadorId não existe no tenant", async () => {
      prismaMock.user.findFirst.mockResolvedValueOnce(null);
      await expect(
        service.create(actor, VISTORIADOR_ID, {
          slots: [
            {
              inicio: "2026-06-01T08:00:00.000Z",
              fim: "2026-06-01T18:00:00.000Z",
            },
          ],
        }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it("400 quando o usuário não tem role VISTORIADOR", async () => {
      prismaMock.user.findFirst.mockResolvedValueOnce(
        vistoriadorFixture({ roles: [Role.GESTOR] }),
      );
      await expect(
        service.create(actor, VISTORIADOR_ID, {
          slots: [
            {
              inicio: "2026-06-01T08:00:00.000Z",
              fim: "2026-06-01T18:00:00.000Z",
            },
          ],
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe("list", () => {
    it("devolve slots ordem ASC por inicio", async () => {
      prismaMock.user.findFirst.mockResolvedValueOnce(vistoriadorFixture());
      prismaMock.agendaSlot.findMany.mockResolvedValueOnce([slotFixture()]);
      const result = await service.list(actor, VISTORIADOR_ID, {});
      expect(result.data).toHaveLength(1);
      expect(prismaMock.agendaSlot.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ orderBy: { inicio: "asc" } }),
      );
    });
  });

  describe("update", () => {
    it("atualiza slot + audit AGENDA.SLOT_UPDATED", async () => {
      const current = slotFixture();
      tx.agendaSlot.findFirst.mockResolvedValueOnce(current);
      tx.agendaSlot.update.mockResolvedValueOnce({
        ...current,
        disponivel: false,
        motivo: "Bloqueado",
      });

      const result = await service.update(actor, VISTORIADOR_ID, current.id, {
        disponivel: false,
        motivo: "Bloqueado",
      });
      expect(result.disponivel).toBe(false);
      expect(tx.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ action: "AGENDA.SLOT_UPDATED" }),
      });
    });

    it("rejeita update sem campos", async () => {
      await expect(
        service.update(actor, VISTORIADOR_ID, "any", {}),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it("404 quando slot não existe", async () => {
      tx.agendaSlot.findFirst.mockResolvedValueOnce(null);
      await expect(
        service.update(actor, VISTORIADOR_ID, "missing", { disponivel: false }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it("400 quando novo fim <= novo inicio", async () => {
      const current = slotFixture();
      tx.agendaSlot.findFirst.mockResolvedValueOnce(current);
      await expect(
        service.update(actor, VISTORIADOR_ID, current.id, {
          fim: "2026-06-01T07:00:00.000Z",
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe("remove", () => {
    it("deleta slot + audit AGENDA.SLOT_DELETED", async () => {
      const current = slotFixture();
      tx.agendaSlot.findFirst.mockResolvedValueOnce(current);
      await service.remove(actor, VISTORIADOR_ID, current.id);
      expect(tx.agendaSlot.delete).toHaveBeenCalledWith({
        where: { id: current.id },
      });
      expect(tx.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ action: "AGENDA.SLOT_DELETED" }),
      });
    });

    it("404 quando slot não existe", async () => {
      tx.agendaSlot.findFirst.mockResolvedValueOnce(null);
      await expect(
        service.remove(actor, VISTORIADOR_ID, "missing"),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe("RBAC vistoriador (Sprint 27)", () => {
    const vistoriadorActor: AuthenticatedUser = {
      id: VISTORIADOR_ID,
      tenantId: actor.tenantId,
      email: "vistoriador@example.com",
      roles: [Role.VISTORIADOR],
    };

    it("permite VISTORIADOR listar a própria agenda", async () => {
      prismaMock.user.findFirst.mockResolvedValueOnce(vistoriadorFixture());
      prismaMock.agendaSlot.findMany.mockResolvedValueOnce([]);
      await expect(
        service.list(vistoriadorActor, VISTORIADOR_ID, {}),
      ).resolves.toEqual({ data: [] });
    });

    it("bloqueia VISTORIADOR acessando agenda alheia", async () => {
      const outroId = "00000000-0000-4000-8000-0000000000aa";
      await expect(
        service.list(vistoriadorActor, outroId, {}),
      ).rejects.toBeInstanceOf(ForbiddenException);
      // Não deveria tocar Prisma — falha antes.
      expect(prismaMock.user.findFirst).not.toHaveBeenCalled();
    });

    it("ADMIN/GESTOR seguem irrestritos", async () => {
      prismaMock.user.findFirst.mockResolvedValueOnce(vistoriadorFixture());
      prismaMock.agendaSlot.findMany.mockResolvedValueOnce([]);
      await expect(service.list(actor, VISTORIADOR_ID, {})).resolves.toEqual({
        data: [],
      });
    });

    it("VISTORIADOR com role ADMIN extra também é irrestrito", async () => {
      const dual: AuthenticatedUser = {
        ...vistoriadorActor,
        roles: [Role.VISTORIADOR, Role.ADMIN],
      };
      const outroId = "00000000-0000-4000-8000-0000000000bb";
      prismaMock.user.findFirst.mockResolvedValueOnce(vistoriadorFixture());
      prismaMock.agendaSlot.findMany.mockResolvedValueOnce([]);
      await expect(service.list(dual, outroId, {})).resolves.toEqual({
        data: [],
      });
    });
  });

  describe("bulkBlock", () => {
    const input = {
      from: "2026-06-01T00:00:00.000Z",
      to: "2026-06-30T23:59:59.000Z",
      motivo: "Férias",
    };

    it("bloqueia em transação só os slots disponíveis no intervalo", async () => {
      prismaMock.user.findFirst.mockResolvedValueOnce(vistoriadorFixture());
      tx.agendaSlot.findMany.mockResolvedValueOnce([
        { id: "s-1", disponivel: true },
        { id: "s-2", disponivel: true },
        { id: "s-3", disponivel: false },
      ]);
      tx.agendaSlot.updateMany.mockResolvedValueOnce({ count: 2 });

      const result = await service.bulkBlock(actor, VISTORIADOR_ID, input);

      expect(result.affectedCount).toBe(2);
      expect(result.ids).toEqual(["s-1", "s-2"]);
      expect(result.excluded).toEqual([
        { id: "s-3", reason: "already-blocked" },
      ]);
      expect(tx.agendaSlot.updateMany).toHaveBeenCalledWith({
        where: {
          id: { in: ["s-1", "s-2"] },
          tenantId: actor.tenantId,
        },
        data: { disponivel: false, motivo: "Férias" },
      });
      expect(tx.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ action: "AGENDA.BULK_BLOCKED" }),
      });
    });

    it("affectedCount=0 quando nenhum slot livre cai no intervalo", async () => {
      prismaMock.user.findFirst.mockResolvedValueOnce(vistoriadorFixture());
      tx.agendaSlot.findMany.mockResolvedValueOnce([]);
      const result = await service.bulkBlock(actor, VISTORIADOR_ID, input);
      expect(result.affectedCount).toBe(0);
      expect(result.ids).toEqual([]);
      expect(tx.agendaSlot.updateMany).not.toHaveBeenCalled();
    });

    it("rejeita to <= from", async () => {
      prismaMock.user.findFirst.mockResolvedValueOnce(vistoriadorFixture());
      await expect(
        service.bulkBlock(actor, VISTORIADOR_ID, {
          from: "2026-06-30T00:00:00.000Z",
          to: "2026-06-01T00:00:00.000Z",
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it("403 quando VISTORIADOR tenta bloquear agenda alheia", async () => {
      const vistoriadorActor: AuthenticatedUser = {
        id: VISTORIADOR_ID,
        tenantId: actor.tenantId,
        email: "v@example.com",
        roles: [Role.VISTORIADOR],
      };
      const outro = "00000000-0000-4000-8000-0000000000cc";
      await expect(
        service.bulkBlock(vistoriadorActor, outro, input),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });
  });

  describe("bulkUpdate", () => {
    it("aplica patch só nos IDs que pertencem ao tenant+vistoriador", async () => {
      prismaMock.user.findFirst.mockResolvedValueOnce(vistoriadorFixture());
      tx.agendaSlot.findMany.mockResolvedValueOnce([
        { id: "s-1" },
        { id: "s-2" },
      ]);
      tx.agendaSlot.updateMany.mockResolvedValueOnce({ count: 2 });

      const result = await service.bulkUpdate(actor, VISTORIADOR_ID, {
        ids: ["s-1", "s-2", "s-fora"],
        disponivel: true,
        motivo: null,
      });

      expect(result.affectedCount).toBe(2);
      expect(result.ids.sort()).toEqual(["s-1", "s-2"]);
      expect(result.excluded).toEqual([{ id: "s-fora", reason: "not-found" }]);
      expect(tx.agendaSlot.updateMany).toHaveBeenCalledWith({
        where: { id: { in: expect.arrayContaining(["s-1", "s-2"]) } },
        data: { disponivel: true, motivo: null },
      });
      expect(tx.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ action: "AGENDA.BULK_UPDATED" }),
      });
    });

    it("rejeita quando nem disponivel nem motivo são informados", async () => {
      prismaMock.user.findFirst.mockResolvedValueOnce(vistoriadorFixture());
      await expect(
        service.bulkUpdate(actor, VISTORIADOR_ID, { ids: ["s-1"] }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe("bulkDelete", () => {
    it("remove só os IDs que pertencem ao tenant+vistoriador", async () => {
      prismaMock.user.findFirst.mockResolvedValueOnce(vistoriadorFixture());
      tx.agendaSlot.findMany.mockResolvedValueOnce([{ id: "s-1" }]);
      tx.agendaSlot.deleteMany.mockResolvedValueOnce({ count: 1 });

      const result = await service.bulkDelete(actor, VISTORIADOR_ID, {
        ids: ["s-1", "s-fora"],
      });

      expect(result.affectedCount).toBe(1);
      expect(result.ids).toEqual(["s-1"]);
      expect(result.excluded).toEqual([{ id: "s-fora", reason: "not-found" }]);
      expect(tx.agendaSlot.deleteMany).toHaveBeenCalledWith({
        where: { id: { in: ["s-1"] } },
      });
      expect(tx.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ action: "AGENDA.BULK_DELETED" }),
      });
    });

    it("affectedCount=0 quando nenhum ID bate", async () => {
      prismaMock.user.findFirst.mockResolvedValueOnce(vistoriadorFixture());
      tx.agendaSlot.findMany.mockResolvedValueOnce([]);
      const result = await service.bulkDelete(actor, VISTORIADOR_ID, {
        ids: ["s-x"],
      });
      expect(result.affectedCount).toBe(0);
      expect(tx.agendaSlot.deleteMany).not.toHaveBeenCalled();
    });
  });
});
