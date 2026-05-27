import { useMutation, useQueryClient } from "@tanstack/react-query";
import type {
  BulkDeleteRequest,
  BulkOpResponse,
} from "@vistoria/api-contracts";
import { bulkDeleteAgenda } from "../services/agenda.service";

export function useBulkDeleteAgenda(vistoriadorId: string) {
  const qc = useQueryClient();
  return useMutation<BulkOpResponse, Error, BulkDeleteRequest>({
    mutationFn: (input) => bulkDeleteAgenda(vistoriadorId, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["agenda", vistoriadorId] });
    },
  });
}
