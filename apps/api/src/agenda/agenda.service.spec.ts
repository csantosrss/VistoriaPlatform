import { Test } from "@nestjs/testing";
import { BadRequestException, NotFoundException } from "@nestjs/common";
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
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
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
});
