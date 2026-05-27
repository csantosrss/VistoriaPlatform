import { useMutation, useQueryClient } from "@tanstack/react-query";
import type {
  BulkOpResponse,
  BulkUpdateRequest,
} from "@vistoria/api-contracts";
import { bulkUpdateAgenda } from "../services/agenda.service";

export function useBulkUpdateAgenda(vistoriadorId: string) {
  const qc = useQueryClient();
  return useMutation<BulkOpResponse, Error, BulkUpdateRequest>({
    mutationFn: (input) => bulkUpdateAgenda(vistoriadorId, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["agenda", vistoriadorId] });
    },
  });
}
