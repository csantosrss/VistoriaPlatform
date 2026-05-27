import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { DayCell } from "../lib/month-grid";

const MONTH_NAMES = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];
const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

interface MonthCalendarProps {
  year: number;
  month: number;
  cells: DayCell[];
  selectedIso: string | null;
  onSelectDay: (iso: string) => void;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onToday: () => void;
  loading?: boolean;
}

export function MonthCalendar({
  year,
  month,
  cells,
  selectedIso,
  onSelectDay,
  onPrevMonth,
  onNextMonth,
  onToday,
  loading,
}: MonthCalendarProps) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between gap-2 pb-3">
        <h3 className="text-lg font-semibold">
          {MONTH_NAMES[month]} {year}
        </h3>
        <div className="flex items-center gap-1">
          <Button variant="outline" size="sm" onClick={onToday}>
            Hoje
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={onPrevMonth}
            aria-label="Mês anterior"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={onNextMonth}
            aria-label="Próximo mês"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-px rounded-md border bg-border text-xs">
        {WEEKDAYS.map((d) => (
          <div
            key={d}
            className="bg-muted/50 px-2 py-1.5 text-center font-medium text-muted-foreground"
          >
            {d}
          </div>
        ))}
        {cells.map((cell) => (
          <DayButton
            key={cell.iso}
            cell={cell}
            selected={cell.iso === selectedIso}
            onClick={() => onSelectDay(cell.iso)}
          />
        ))}
      </div>
      {loading && (
        <p className="pt-3 text-xs text-muted-foreground">Carregando slots…</p>
      )}
    </div>
  );
}

function DayButton({
  cell,
  selected,
  onClick,
}: {
  cell: DayCell;
  selected: boolean;
  onClick: () => void;
}) {
  const hasSlots = cell.slots.length > 0;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`${cell.date.toLocaleDateString("pt-BR")} — ${cell.slots.length} slot(s)`}
      className={cn(
        "group flex min-h-[88px] flex-col items-start gap-1 bg-card px-2 py-1.5 text-left transition-colors hover:bg-accent",
        !cell.isCurrentMonth && "bg-muted/30 text-muted-foreground",
        selected && "ring-2 ring-primary ring-inset",
      )}
    >
      <span
        className={cn(
          "flex h-6 w-6 items-center justify-center rounded-full text-sm font-medium",
          cell.isToday && "bg-primary text-primary-foreground font-semibold",
        )}
      >
        {cell.date.getDate()}
      </span>
      {hasSlots && (
        <div className="flex flex-wrap items-center gap-1">
          {cell.disponiveis > 0 && (
            <span className="inline-flex items-center rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
              {cell.disponiveis} livre{cell.disponiveis > 1 ? "s" : ""}
            </span>
          )}
          {cell.bloqueados > 0 && (
            <span className="inline-flex items-center rounded bg-rose-100 px-1.5 py-0.5 text-[10px] font-medium text-rose-700 dark:bg-rose-900/40 dark:text-rose-300">
              {cell.bloqueados} bloq.
            </span>
          )}
        </div>
      )}
    </button>
  );
}
