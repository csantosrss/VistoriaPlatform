import { useMutation, useQueryClient } from "@tanstack/react-query";
import { deleteAgendaSlot } from "../services/agenda.service";

export function useDeleteAgendaSlot(vistoriadorId: string) {
  const qc = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: (slotId) => deleteAgendaSlot(vistoriadorId, slotId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["agenda", vistoriadorId] });
    },
  });
}
