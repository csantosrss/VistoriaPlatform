import { useEffect, useMemo, useState } from "react";
import { Loader2, Lock, Plus, Trash2, Unlock, X } from "lucide-react";
import { isAxiosError } from "axios";
import type { AgendaSlot, BulkOpResponse } from "@vistoria/api-contracts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { useCreateAgendaSlots } from "../hooks/use-create-agenda-slots";
import { useBulkUpdateAgenda } from "../hooks/use-bulk-update-agenda";
import { useBulkDeleteAgenda } from "../hooks/use-bulk-delete-agenda";

interface DayDrawerProps {
  vistoriadorId: string;
  dayIso: string;
  slots: AgendaSlot[];
  onClose: () => void;
}

function formatHora(iso: string): string {
  return new Date(iso).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDayTitle(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  return d.toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function defaultSlotTimes(dayIso: string): { inicio: string; fim: string } {
  return { inicio: `${dayIso}T08:00`, fim: `${dayIso}T09:00` };
}

function describeError(err: unknown): string {
  if (isAxiosError(err)) {
    const msg = err.response?.data?.message;
    if (typeof msg === "string") return msg;
    if (Array.isArray(msg)) return msg.join("; ");
    return err.message;
  }
  if (err instanceof Error) return err.message;
  return "Falha desconhecida";
}

export function DayDrawer({
  vistoriadorId,
  dayIso,
  slots,
  onClose,
}: DayDrawerProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [adding, setAdding] = useState(false);
  const [lastResult, setLastResult] = useState<BulkOpResponse | null>(null);
  const [opError, setOpError] = useState<string | null>(null);

  const updateMut = useBulkUpdateAgenda(vistoriadorId);
  const deleteMut = useBulkDeleteAgenda(vistoriadorId);

  useEffect(() => {
    setSelected(new Set());
    setAdding(false);
    setLastResult(null);
    setOpError(null);
  }, [dayIso, vistoriadorId]);

  const allSelected = slots.length > 0 && selected.size === slots.length;
  const toggleAll = () => {
    if (allSelected) setSelected(new Set());
    else setSelected(new Set(slots.map((s) => s.id)));
  };
  const toggleOne = (id: string) =>
    setSelected((curr) => {
      const next = new Set(curr);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const ids = useMemo(() => Array.from(selected), [selected]);

  const runBulkUpdate = async (disponivel: boolean) => {
    if (ids.length === 0) return;
    setOpError(null);
    try {
      const result = await updateMut.mutateAsync({
        ids,
        disponivel,
        motivo: disponivel ? null : undefined,
      });
      setLastResult(result);
      setSelected(new Set());
    } catch (err) {
      setOpError(describeError(err));
    }
  };

  const runBulkDelete = async () => {
    if (ids.length === 0) return;
    setOpError(null);
    try {
      const result = await deleteMut.mutateAsync({ ids });
      setLastResult(result);
      setSelected(new Set());
    } catch (err) {
      setOpError(describeError(err));
    }
  };

  const busy = updateMut.isPending || deleteMut.isPending;

  return (
    <aside
      className="flex h-full flex-col rounded-lg border bg-card"
      aria-label="Slots do dia selecionado"
    >
      <header className="flex items-start justify-between gap-2 border-b px-4 py-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            Dia selecionado
          </p>
          <h3 className="text-sm font-semibold capitalize">
            {formatDayTitle(dayIso)}
          </h3>
          <p className="text-xs text-muted-foreground">
            {slots.length} slot(s) ·{" "}
            <span className="text-emerald-600">
              {slots.filter((s) => s.disponivel).length} livre(s)
            </span>{" "}
            ·{" "}
            <span className="text-rose-600">
              {slots.filter((s) => !s.disponivel).length} bloq.
            </span>
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          aria-label="Fechar"
        >
          <X className="h-4 w-4" />
        </Button>
      </header>

      <div className="flex-1 overflow-y-auto">
        {slots.length === 0 ? (
          <p className="p-4 text-sm text-muted-foreground">
            Nenhum slot neste dia. Use &quot;+ Novo slot&quot; abaixo para
            cadastrar.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead className="sticky top-0 border-b bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-3 py-2">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleAll}
                    aria-label="Selecionar todos"
                  />
                </th>
                <th className="px-2 py-2 text-left font-medium">Horário</th>
                <th className="px-2 py-2 text-left font-medium">Status</th>
                <th className="px-2 py-2 text-left font-medium">Motivo</th>
              </tr>
            </thead>
            <tbody>
              {slots.map((slot) => (
                <tr
                  key={slot.id}
                  className={cn(
                    "border-b last:border-b-0",
                    selected.has(slot.id) && "bg-accent/40",
                  )}
                >
                  <td className="px-3 py-2">
                    <input
                      type="checkbox"
                      checked={selected.has(slot.id)}
                      onChange={() => toggleOne(slot.id)}
                      aria-label={`Selecionar slot ${formatHora(slot.inicio)}`}
                    />
                  </td>
                  <td className="px-2 py-2 font-mono text-xs">
                    {formatHora(slot.inicio)} → {formatHora(slot.fim)}
                  </td>
                  <td className="px-2 py-2">
                    <Badge
                      variant={slot.disponivel ? "success" : "destructive"}
                    >
                      {slot.disponivel ? "Livre" : "Bloqueado"}
                    </Badge>
                  </td>
                  <td className="px-2 py-2 text-xs text-muted-foreground">
                    {slot.motivo || "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {adding ? (
          <NewSlotInline
            vistoriadorId={vistoriadorId}
            dayIso={dayIso}
            onDone={() => setAdding(false)}
          />
        ) : (
          <div className="border-t p-3">
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => setAdding(true)}
            >
              <Plus className="mr-2 h-4 w-4" />
              Novo slot neste dia
            </Button>
          </div>
        )}
      </div>

      {selected.size > 0 && (
        <div className="border-t bg-muted/40 p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-medium">
              {selected.size} selecionado(s){" "}
              {busy && <Loader2 className="ml-1 inline h-3 w-3 animate-spin" />}
            </p>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setSelected(new Set())}
              disabled={busy}
            >
              Limpar
            </Button>
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => runBulkUpdate(false)}
              disabled={busy}
            >
              <Lock className="mr-2 h-3.5 w-3.5" />
              Bloquear
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => runBulkUpdate(true)}
              disabled={busy}
            >
              <Unlock className="mr-2 h-3.5 w-3.5" />
              Liberar
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={runBulkDelete}
              disabled={busy}
            >
              <Trash2 className="mr-2 h-3.5 w-3.5" />
              Remover
            </Button>
          </div>
        </div>
      )}

      {lastResult && (
        <div className="border-t px-3 py-2 text-xs text-muted-foreground">
          {lastResult.affectedCount} slot(s) afetado(s).
          {lastResult.excluded && lastResult.excluded.length > 0 && (
            <span className="ml-1 text-destructive">
              {lastResult.excluded.length} ignorado(s) (
              {lastResult.excluded[0].reason}).
            </span>
          )}
        </div>
      )}
      {opError && (
        <p className="border-t p-2 text-xs text-destructive">{opError}</p>
      )}
    </aside>
  );
}

function NewSlotInline({
  vistoriadorId,
  dayIso,
  onDone,
}: {
  vistoriadorId: string;
  dayIso: string;
  onDone: () => void;
}) {
  const defaults = defaultSlotTimes(dayIso);
  const [inicio, setInicio] = useState(defaults.inicio);
  const [fim, setFim] = useState(defaults.fim);
  const [disponivel, setDisponivel] = useState(true);
  const [motivo, setMotivo] = useState("");
  const mut = useCreateAgendaSlots(vistoriadorId);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inicio || !fim) return;
    mut.mutate(
      {
        slots: [
          {
            inicio: new Date(inicio).toISOString(),
            fim: new Date(fim).toISOString(),
            disponivel,
            motivo: motivo || undefined,
          },
        ],
      },
      { onSuccess: onDone },
    );
  };

  const errorMessage = mut.error ? describeError(mut.error) : null;

  return (
    <form onSubmit={onSubmit} className="space-y-3 border-t p-3" noValidate>
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Novo slot
      </p>
      <div className="grid gap-2 sm:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor="d-inicio" className="text-xs">
            Início
          </Label>
          <Input
            id="d-inicio"
            type="datetime-local"
            value={inicio}
            onChange={(e) => setInicio(e.target.value)}
            required
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="d-fim" className="text-xs">
            Fim
          </Label>
          <Input
            id="d-fim"
            type="datetime-local"
            value={fim}
            onChange={(e) => setFim(e.target.value)}
            required
          />
        </div>
      </div>
      <label className="flex items-center gap-2 text-xs">
        <input
          type="checkbox"
          checked={disponivel}
          onChange={(e) => setDisponivel(e.target.checked)}
        />
        Disponível (desmarque para já criar bloqueado)
      </label>
      <Input
        placeholder="Motivo (opcional)"
        value={motivo}
        onChange={(e) => setMotivo(e.target.value)}
        maxLength={500}
      />
      {errorMessage && (
        <p className="text-xs text-destructive">{errorMessage}</p>
      )}
      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onDone}
          disabled={mut.isPending}
        >
          Cancelar
        </Button>
        <Button type="submit" size="sm" disabled={mut.isPending}>
          {mut.isPending ? (
            <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
          ) : (
            <Plus className="mr-2 h-3.5 w-3.5" />
          )}
          Adicionar
        </Button>
      </div>
    </form>
  );
}
