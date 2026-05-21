import { useMutation, useQueryClient } from "@tanstack/react-query";
import type {
  AgendaSlot,
  UpdateAgendaSlotRequest,
} from "@vistoria/api-contracts";
import { updateAgendaSlot } from "../services/agenda.service";

export function useUpdateAgendaSlot(vistoriadorId: string) {
  const qc = useQueryClient();
  return useMutation<
    AgendaSlot,
    Error,
    { slotId: string; input: UpdateAgendaSlotRequest }
  >({
    mutationFn: ({ slotId, input }) =>
      updateAgendaSlot(vistoriadorId, slotId, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["agenda", vistoriadorId] });
    },
  });
}
