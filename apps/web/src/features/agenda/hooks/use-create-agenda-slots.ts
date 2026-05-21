import { useMutation, useQueryClient } from "@tanstack/react-query";
import type {
  CreateAgendaSlotsRequest,
  ListAgendaSlotsResponse,
} from "@vistoria/api-contracts";
import { createAgendaSlots } from "../services/agenda.service";

export function useCreateAgendaSlots(vistoriadorId: string) {
  const qc = useQueryClient();
  return useMutation<ListAgendaSlotsResponse, Error, CreateAgendaSlotsRequest>({
    mutationFn: (input) => createAgendaSlots(vistoriadorId, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["agenda", vistoriadorId] });
    },
  });
}
