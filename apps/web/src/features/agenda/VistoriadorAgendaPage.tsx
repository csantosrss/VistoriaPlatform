import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { AlertCircle, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useUser } from "../users/hooks/use-user";
import { AddSlotForm } from "./components/AddSlotForm";
import { SlotRow } from "./components/SlotRow";
import { useAgendaSlots } from "./hooks/use-agenda-slots";

function defaultRange(): { from: string; to: string } {
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth(), 1);
  const to = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
  return {
    from: from.toISOString().slice(0, 10),
    to: to.toISOString().slice(0, 10),
  };
}

export function VistoriadorAgendaPage() {
  const { id } = useParams<{ id: string }>();
  const userQuery = useUser(id);
  const [range, setRange] = useState(defaultRange());

  const slotsQuery = useAgendaSlots(id, {
    from: range.from
      ? new Date(`${range.from}T00:00:00`).toISOString()
      : undefined,
    to: range.to ? new Date(`${range.to}T23:59:59`).toISOString() : undefined,
  });

  const summary = useMemo(() => {
    if (!slotsQuery.data) return null;
    const disponiveis = slotsQuery.data.data.filter((s) => s.disponivel).length;
    const bloqueados = slotsQuery.data.data.length - disponiveis;
    return { disponiveis, bloqueados, total: slotsQuery.data.data.length };
  }, [slotsQuery.data]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="sm">
          <Link to="/users">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Link>
        </Button>
        <h2 className="text-2xl font-bold tracking-tight">Agenda</h2>
        {userQuery.data && (
          <span className="text-sm text-muted-foreground">
            · {userQuery.data.name} ({userQuery.data.email})
          </span>
        )}
      </div>

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

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-3">
              <div>
                <CardTitle>Slots no período</CardTitle>
                <CardDescription>
                  Disponível = livre para agendamento. Bloqueado = indisponível
                  (férias, plantão, etc.). Click em &quot;Bloquear/Liberar&quot;
                  para alternar o estado do slot.
                </CardDescription>
              </div>
              {summary && (
                <div className="text-right text-xs text-muted-foreground">
                  <p>{summary.total} slot(s)</p>
                  <p className="text-emerald-600">
                    {summary.disponiveis} disponível(eis)
                  </p>
                  <p className="text-destructive">
                    {summary.bloqueados} bloqueado(s)
                  </p>
                </div>
              )}
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="from">De</Label>
                <Input
                  id="from"
                  type="date"
                  value={range.from}
                  onChange={(e) =>
                    setRange((r) => ({ ...r, from: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="to">Até</Label>
                <Input
                  id="to"
                  type="date"
                  value={range.to}
                  onChange={(e) =>
                    setRange((r) => ({ ...r, to: e.target.value }))
                  }
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {slotsQuery.isLoading ? (
              <div className="space-y-2 p-4">
                <Skeleton className="h-8" />
                <Skeleton className="h-8" />
                <Skeleton className="h-8" />
              </div>
            ) : slotsQuery.isError ? (
              <p className="p-4 text-sm text-destructive">
                Falha ao carregar slots.
              </p>
            ) : slotsQuery.data?.data.length === 0 ? (
              <p className="p-4 text-sm text-muted-foreground">
                Nenhum slot no período selecionado. Use o painel à direita para
                cadastrar.
              </p>
            ) : (
              <table className="w-full text-sm">
                <thead className="border-b bg-muted/50">
                  <tr>
                    <th className="px-4 py-2 text-left font-medium">Janela</th>
                    <th className="px-4 py-2 text-left font-medium">Status</th>
                    <th className="px-4 py-2 text-left font-medium">Motivo</th>
                    <th className="px-4 py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {slotsQuery.data?.data.map((slot) => (
                    <SlotRow
                      key={slot.id}
                      slot={slot}
                      vistoriadorId={id as string}
                    />
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Novo slot</CardTitle>
            <CardDescription>
              Cadastra um slot por vez. Para janelas recorrentes (ex.: seg-sex
              8h-18h por 4 semanas), use a API direto (bulk até 200 slots).
            </CardDescription>
          </CardHeader>
          <CardContent>{id && <AddSlotForm vistoriadorId={id} />}</CardContent>
        </Card>
      </div>
    </div>
  );
}
