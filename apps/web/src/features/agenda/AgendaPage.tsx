import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { AlertCircle, ArrowLeft, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useMe } from "../auth/hooks/use-me";
import { useUser } from "../users/hooks/use-user";
import { AgendaStats } from "./components/AgendaStats";
import { BulkBlockDialog } from "./components/BulkBlockDialog";
import { DayDrawer } from "./components/DayDrawer";
import { MonthCalendar } from "./components/MonthCalendar";
import { VistoriadorPicker } from "./components/VistoriadorPicker";
import { useAgendaSlots } from "./hooks/use-agenda-slots";
import {
  buildMonthGrid,
  computeMonthStats,
  monthGridEndIso,
  monthGridStartIso,
} from "./lib/month-grid";

/**
 * Página única da agenda. Acessível como:
 *  - `/agenda` (sem param) → ADMIN/GESTOR escolhe vistoriador via dropdown;
 *    VISTORIADOR (sem ADMIN/GESTOR) cai direto na própria agenda.
 *  - `/vistoriadores/:id/agenda` → deep-link da lista de usuários.
 *
 * RBAC fino do BE (Sprint 27) já cobre o servidor; o FE só evita pedir
 * dropdown quando o user logado é vistoriador puro.
 */
export function AgendaPage() {
  const { id: routeId } = useParams<{ id?: string }>();
  const { data: me } = useMe();

  const isVistoriadorPuro =
    !!me &&
    me.roles.includes("VISTORIADOR") &&
    !me.roles.some((r) => r === "ADMIN" || r === "GESTOR");

  const [pickedId, setPickedId] = useState<string | null>(null);
  const vistoriadorId =
    routeId ?? (isVistoriadorPuro ? (me?.id ?? null) : pickedId);

  const today = new Date();
  const [cursor, setCursor] = useState<{ year: number; month: number }>({
    year: today.getFullYear(),
    month: today.getMonth(),
  });
  const [selectedIso, setSelectedIso] = useState<string | null>(null);
  const [bulkOpen, setBulkOpen] = useState(false);

  const userQuery = useUser(vistoriadorId ?? undefined);
  const slotsQuery = useAgendaSlots(vistoriadorId ?? undefined, {
    from: monthGridStartIso(cursor.year, cursor.month),
    to: monthGridEndIso(cursor.year, cursor.month),
  });

  const cells = useMemo(
    () =>
      buildMonthGrid(cursor.year, cursor.month, slotsQuery.data?.data ?? []),
    [cursor, slotsQuery.data],
  );
  const stats = useMemo(() => computeMonthStats(cells), [cells]);

  const selectedSlots = useMemo(() => {
    if (!selectedIso) return [];
    return cells.find((c) => c.iso === selectedIso)?.slots ?? [];
  }, [cells, selectedIso]);

  const prevMonth = () =>
    setCursor((c) =>
      c.month === 0
        ? { year: c.year - 1, month: 11 }
        : { ...c, month: c.month - 1 },
    );
  const nextMonth = () =>
    setCursor((c) =>
      c.month === 11
        ? { year: c.year + 1, month: 0 }
        : { ...c, month: c.month + 1 },
    );
  const goToToday = () => {
    const n = new Date();
    setCursor({ year: n.getFullYear(), month: n.getMonth() });
  };

  const showPicker = !routeId && !isVistoriadorPuro;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center gap-3">
        {routeId && (
          <Button asChild variant="ghost" size="sm">
            <Link to="/users">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar
            </Link>
          </Button>
        )}
        <h2 className="text-2xl font-bold tracking-tight">Agenda</h2>
        {vistoriadorId && userQuery.data && (
          <span className="text-sm text-muted-foreground">
            · {userQuery.data.name}
          </span>
        )}
        <div className="ml-auto flex items-center gap-2">
          {vistoriadorId && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setBulkOpen(true)}
            >
              <Lock className="mr-2 h-4 w-4" />
              Bloquear período
            </Button>
          )}
        </div>
      </header>

      {showPicker && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Vistoriador</CardTitle>
          </CardHeader>
          <CardContent>
            <VistoriadorPicker value={pickedId} onChange={setPickedId} />
          </CardContent>
        </Card>
      )}

      {!vistoriadorId ? (
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">
            Selecione um vistoriador acima para visualizar a agenda.
          </CardContent>
        </Card>
      ) : (
        <>
          {userQuery.isError && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-destructive">
                  <AlertCircle className="h-5 w-5" />
                  Falha ao carregar vistoriador
                </CardTitle>
              </CardHeader>
            </Card>
          )}

          {slotsQuery.isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-24" />
              <Skeleton className="h-[480px]" />
            </div>
          ) : slotsQuery.isError ? (
            <Card>
              <CardContent className="p-6 text-sm text-destructive">
                Falha ao carregar slots. Verifique sua conexão e tente
                novamente.
              </CardContent>
            </Card>
          ) : (
            <>
              <AgendaStats stats={stats} />
              <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
                <Card>
                  <CardContent className="p-4">
                    <MonthCalendar
                      year={cursor.year}
                      month={cursor.month}
                      cells={cells}
                      selectedIso={selectedIso}
                      onSelectDay={setSelectedIso}
                      onPrevMonth={prevMonth}
                      onNextMonth={nextMonth}
                      onToday={goToToday}
                      loading={slotsQuery.isFetching}
                    />
                  </CardContent>
                </Card>
                {selectedIso ? (
                  <DayDrawer
                    vistoriadorId={vistoriadorId}
                    dayIso={selectedIso}
                    slots={selectedSlots}
                    onClose={() => setSelectedIso(null)}
                  />
                ) : (
                  <Card>
                    <CardContent className="p-6 text-sm text-muted-foreground">
                      Clique em um dia para ver, editar e adicionar slots.
                    </CardContent>
                  </Card>
                )}
              </div>
            </>
          )}
        </>
      )}

      {bulkOpen && vistoriadorId && (
        <BulkBlockDialog
          vistoriadorId={vistoriadorId}
          defaultFromIso={monthGridStartIso(cursor.year, cursor.month)}
          defaultToIso={monthGridEndIso(cursor.year, cursor.month)}
          onClose={() => setBulkOpen(false)}
        />
      )}
    </div>
  );
}
