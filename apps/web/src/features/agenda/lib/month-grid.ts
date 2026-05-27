import type { AgendaSlot } from "@vistoria/api-contracts";

export interface DayCell {
  date: Date;
  iso: string;
  isCurrentMonth: boolean;
  isToday: boolean;
  slots: AgendaSlot[];
  disponiveis: number;
  bloqueados: number;
}

const DAY_MS = 24 * 60 * 60 * 1000;

export function toIsoDay(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/** Grid 7x6 (42 dias) começando no domingo da semana do dia 1 do mês. */
export function buildMonthGrid(
  year: number,
  month: number,
  slots: AgendaSlot[],
): DayCell[] {
  const first = new Date(year, month, 1);
  const startOffset = first.getDay();
  const gridStart = new Date(first.getTime() - startOffset * DAY_MS);
  const today = new Date();

  const byDay = new Map<string, AgendaSlot[]>();
  for (const slot of slots) {
    const key = toIsoDay(new Date(slot.inicio));
    const arr = byDay.get(key) ?? [];
    arr.push(slot);
    byDay.set(key, arr);
  }

  const cells: DayCell[] = [];
  for (let i = 0; i < 42; i++) {
    const date = new Date(gridStart.getTime() + i * DAY_MS);
    const iso = toIsoDay(date);
    const daySlots = (byDay.get(iso) ?? [])
      .slice()
      .sort(
        (a, b) => new Date(a.inicio).getTime() - new Date(b.inicio).getTime(),
      );
    const disponiveis = daySlots.filter((s) => s.disponivel).length;
    cells.push({
      date,
      iso,
      isCurrentMonth: date.getMonth() === month,
      isToday: sameDay(date, today),
      slots: daySlots,
      disponiveis,
      bloqueados: daySlots.length - disponiveis,
    });
  }
  return cells;
}

export function monthGridStartIso(year: number, month: number): string {
  const first = new Date(year, month, 1);
  const startOffset = first.getDay();
  const gridStart = new Date(first.getTime() - startOffset * DAY_MS);
  gridStart.setHours(0, 0, 0, 0);
  return gridStart.toISOString();
}

export function monthGridEndIso(year: number, month: number): string {
  const first = new Date(year, month, 1);
  const startOffset = first.getDay();
  const gridStart = new Date(first.getTime() - startOffset * DAY_MS);
  const end = new Date(gridStart.getTime() + 42 * DAY_MS - 1);
  return end.toISOString();
}

export interface MonthStats {
  total: number;
  disponiveis: number;
  bloqueados: number;
  percentDisponivel: number;
  slotsPorDiaSemana: { dia: string; total: number }[];
  diasComSlot: number;
}

const SEMANA = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

export function computeMonthStats(cells: DayCell[]): MonthStats {
  const currentMonth = cells.filter((c) => c.isCurrentMonth);
  const total = currentMonth.reduce((acc, c) => acc + c.slots.length, 0);
  const disponiveis = currentMonth.reduce((acc, c) => acc + c.disponiveis, 0);
  const bloqueados = total - disponiveis;
  const porDia: Record<number, number> = {};
  for (const c of currentMonth) {
    porDia[c.date.getDay()] = (porDia[c.date.getDay()] ?? 0) + c.slots.length;
  }
  const slotsPorDiaSemana = SEMANA.map((dia, idx) => ({
    dia,
    total: porDia[idx] ?? 0,
  }));
  const diasComSlot = currentMonth.filter((c) => c.slots.length > 0).length;
  return {
    total,
    disponiveis,
    bloqueados,
    percentDisponivel:
      total === 0 ? 0 : Math.round((disponiveis / total) * 100),
    slotsPorDiaSemana,
    diasComSlot,
  };
}
