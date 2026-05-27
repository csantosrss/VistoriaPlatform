import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { BulkBlockRequest, BulkOpResponse } from "@vistoria/api-contracts";
import { bulkBlockAgenda } from "../services/agenda.service";

export function useBulkBlockAgenda(vistoriadorId: string) {
  const qc = useQueryClient();
  return useMutation<BulkOpResponse, Error, BulkBlockRequest>({
    mutationFn: (input) => bulkBlockAgenda(vistoriadorId, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["agenda", vistoriadorId] });
    },
  });
}
