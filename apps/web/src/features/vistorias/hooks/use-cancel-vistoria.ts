import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { CancelVistoriaRequest, Vistoria } from "@vistoria/api-contracts";
import { cancelVistoria } from "../services/vistorias.service";

interface Variables {
  id: string;
  input: CancelVistoriaRequest;
}

export function useCancelVistoria() {
  const queryClient = useQueryClient();
  return useMutation<Vistoria, Error, Variables>({
    mutationFn: ({ id, input }) => cancelVistoria(id, input),
    onSuccess: (vistoria) => {
      queryClient.setQueryData(["vistorias", "detail", vistoria.id], vistoria);
      queryClient.invalidateQueries({ queryKey: ["vistorias", "list"] });
    },
  });
}
