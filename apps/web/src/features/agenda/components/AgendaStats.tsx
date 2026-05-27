import { CalendarDays, Lock, Unlock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { MonthStats } from "../lib/month-grid";

export function AgendaStats({ stats }: { stats: MonthStats }) {
  const max = Math.max(...stats.slotsPorDiaSemana.map((d) => d.total), 1);
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <Kpi
        icon={<CalendarDays className="h-4 w-4" />}
        label="Slots no mês"
        value={stats.total.toString()}
        hint={`${stats.diasComSlot} dia(s) com agenda`}
      />
      <Kpi
        icon={<Unlock className="h-4 w-4 text-emerald-600" />}
        label="Disponíveis"
        value={stats.disponiveis.toString()}
        hint={`${stats.percentDisponivel}% do total`}
      />
      <Kpi
        icon={<Lock className="h-4 w-4 text-rose-600" />}
        label="Bloqueados"
        value={stats.bloqueados.toString()}
        hint="Férias / plantão / indisp."
      />
      <Card>
        <CardContent className="space-y-1.5 p-4">
          <p className="text-xs font-medium text-muted-foreground">
            Por dia da semana
          </p>
          <div className="flex h-12 items-end gap-1">
            {stats.slotsPorDiaSemana.map((d) => {
              const ratio = d.total / max;
              const isWeekend = d.dia === "Sáb" || d.dia === "Dom";
              return (
                <div
                  key={d.dia}
                  className="flex flex-1 flex-col items-center gap-0.5"
                >
                  <div
                    className={cn(
                      "w-full rounded-sm",
                      d.total === 0
                        ? "bg-muted"
                        : isWeekend
                          ? "bg-muted-foreground/30"
                          : "bg-primary/80",
                    )}
                    style={{
                      height: `${Math.max(ratio * 100, d.total === 0 ? 4 : 12)}%`,
                    }}
                    title={`${d.dia}: ${d.total} slot(s)`}
                  />
                  <span className="text-[9px] text-muted-foreground">
                    {d.dia.slice(0, 1)}
                  </span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Kpi({
  icon,
  label,
  value,
  hint,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <Card>
      <CardContent className="space-y-1 p-4">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium text-muted-foreground">{label}</p>
          {icon}
        </div>
        <p className="text-2xl font-bold">{value}</p>
        <p className="text-[11px] text-muted-foreground">{hint}</p>
      </CardContent>
    </Card>
  );
}
