import { useState } from "react";
import { Loader2, Trash2 } from "lucide-react";
import type { AgendaSlot } from "@vistoria/api-contracts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useDeleteAgendaSlot } from "../hooks/use-delete-agenda-slot";
import { useUpdateAgendaSlot } from "../hooks/use-update-agenda-slot";

function fmtRange(slot: AgendaSlot): string {
  const start = new Date(slot.inicio);
  const end = new Date(slot.fim);
  const sameDay = start.toDateString() === end.toDateString();
  const startStr = start.toLocaleString("pt-BR");
  const endStr = sameDay
    ? end.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
    : end.toLocaleString("pt-BR");
  return `${startStr} → ${endStr}`;
}

export function SlotRow({
  slot,
  vistoriadorId,
}: {
  slot: AgendaSlot;
  vistoriadorId: string;
}) {
  const delMut = useDeleteAgendaSlot(vistoriadorId);
  const updateMut = useUpdateAgendaSlot(vistoriadorId);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const toggleDisponivel = () => {
    updateMut.mutate({
      slotId: slot.id,
      input: { disponivel: !slot.disponivel },
    });
  };

  return (
    <tr className="border-b last:border-b-0">
      <td className="px-4 py-2 text-sm">{fmtRange(slot)}</td>
      <td className="px-4 py-2">
        <Badge variant={slot.disponivel ? "success" : "destructive"}>
          {slot.disponivel ? "Disponível" : "Bloqueado"}
        </Badge>
      </td>
      <td className="px-4 py-2 text-sm text-muted-foreground">
        {slot.motivo || "—"}
      </td>
      <td className="px-4 py-2 text-right">
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleDisponivel}
          disabled={updateMut.isPending}
        >
          {updateMut.isPending && (
            <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
          )}
          {slot.disponivel ? "Bloquear" : "Liberar"}
        </Button>
        {confirmDelete ? (
          <>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => delMut.mutate(slot.id)}
              disabled={delMut.isPending}
            >
              {delMut.isPending ? (
                <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
              ) : (
                <Trash2 className="mr-2 h-3.5 w-3.5" />
              )}
              Confirmar
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setConfirmDelete(false)}
            >
              Cancelar
            </Button>
          </>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setConfirmDelete(true)}
          >
            <Trash2 className="mr-2 h-3.5 w-3.5" />
            Remover
          </Button>
        )}
      </td>
    </tr>
  );
}
