import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import type { CreateVistoriaRequest, Vistoria } from "@vistoria/api-contracts";
import { createVistoria } from "../services/vistorias.service";

export function useCreateVistoria() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  return useMutation<Vistoria, Error, CreateVistoriaRequest>({
    mutationFn: createVistoria,
    onSuccess: (vistoria) => {
      queryClient.invalidateQueries({ queryKey: ["vistorias", "list"] });
      navigate(`/vistorias/${vistoria.id}`, { replace: true });
    },
  });
}
