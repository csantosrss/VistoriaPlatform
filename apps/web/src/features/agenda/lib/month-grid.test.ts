import { describe, expect, it } from "vitest";
import type { AgendaSlot } from "@vistoria/api-contracts";
import {
  buildMonthGrid,
  computeMonthStats,
  monthGridEndIso,
  monthGridStartIso,
  toIsoDay,
} from "./month-grid";

function slotFixture(overrides: Partial<AgendaSlot> = {}): AgendaSlot {
  return {
    id: "s-1",
    tenantId: "00000000-0000-4000-8000-000000000010",
    vistoriadorId: "00000000-0000-4000-8000-000000000020",
    inicio: "2026-06-15T08:00:00.000Z",
    fim: "2026-06-15T09:00:00.000Z",
    disponivel: true,
    motivo: null,
    createdAt: "2026-06-01T00:00:00.000Z",
    updatedAt: "2026-06-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("month-grid", () => {
  describe("buildMonthGrid", () => {
    it("retorna sempre 42 células (grid 7x6)", () => {
      const cells = buildMonthGrid(2026, 5, []);
      expect(cells).toHaveLength(42);
    });

    it("primeira célula é domingo da semana do dia 1", () => {
      // Junho/2026 começa numa segunda — domingo anterior é 31/maio.
      const cells = buildMonthGrid(2026, 5, []);
      expect(cells[0].date.getDay()).toBe(0);
      expect(cells[0].isCurrentMonth).toBe(false);
    });

    it("marca isCurrentMonth corretamente", () => {
      const cells = buildMonthGrid(2026, 5, []);
      const inMonth = cells.filter((c) => c.isCurrentMonth);
      // Junho tem 30 dias.
      expect(inMonth).toHaveLength(30);
    });

    it("agrupa slots por dia local e ordena por inicio", () => {
      const slots = [
        slotFixture({
          id: "s-1",
          inicio: "2026-06-15T14:00:00.000Z",
          fim: "2026-06-15T15:00:00.000Z",
        }),
        slotFixture({
          id: "s-2",
          inicio: "2026-06-15T08:00:00.000Z",
          fim: "2026-06-15T09:00:00.000Z",
        }),
        slotFixture({
          id: "s-3",
          inicio: "2026-06-16T08:00:00.000Z",
          fim: "2026-06-16T09:00:00.000Z",
          disponivel: false,
        }),
      ];
      const cells = buildMonthGrid(2026, 5, slots);
      const dia15 = cells.find(
        (c) => c.date.getDate() === 15 && c.isCurrentMonth,
      );
      const dia16 = cells.find(
        (c) => c.date.getDate() === 16 && c.isCurrentMonth,
      );
      expect(dia15?.slots.map((s) => s.id)).toEqual(["s-2", "s-1"]);
      expect(dia15?.disponiveis).toBe(2);
      expect(dia15?.bloqueados).toBe(0);
      expect(dia16?.disponiveis).toBe(0);
      expect(dia16?.bloqueados).toBe(1);
    });
  });

  describe("monthGridStartIso / monthGridEndIso", () => {
    it("intervalo cobre os 42 dias do grid (não só o mês)", () => {
      const start = new Date(monthGridStartIso(2026, 5));
      const end = new Date(monthGridEndIso(2026, 5));
      const diff = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
      expect(diff).toBeGreaterThanOrEqual(41);
      expect(diff).toBeLessThan(42);
    });
  });

  describe("computeMonthStats", () => {
    it("KPIs vêm só dos dias dentro do mês corrente", () => {
      const slots = [
        slotFixture({ disponivel: true }),
        slotFixture({ id: "s-2", disponivel: false }),
        slotFixture({ id: "s-3", disponivel: true }),
      ];
      const cells = buildMonthGrid(2026, 5, slots);
      const stats = computeMonthStats(cells);
      expect(stats.total).toBe(3);
      expect(stats.disponiveis).toBe(2);
      expect(stats.bloqueados).toBe(1);
      expect(stats.percentDisponivel).toBe(67);
      expect(stats.diasComSlot).toBe(1);
      expect(stats.slotsPorDiaSemana).toHaveLength(7);
    });

    it("percentDisponivel = 0 quando total = 0", () => {
      const cells = buildMonthGrid(2026, 5, []);
      expect(computeMonthStats(cells).percentDisponivel).toBe(0);
    });
  });

  describe("toIsoDay", () => {
    it("formata YYYY-MM-DD com pad de zeros", () => {
      expect(toIsoDay(new Date(2026, 0, 5))).toBe("2026-01-05");
      expect(toIsoDay(new Date(2026, 11, 31))).toBe("2026-12-31");
    });
  });
});
