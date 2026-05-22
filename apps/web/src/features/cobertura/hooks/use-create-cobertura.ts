import { useMutation, useQueryClient } from "@tanstack/react-query";
import type {
  CreateCoberturaRequest,
  VistoriadorCobertura,
} from "@vistoria/api-contracts";
import { createCobertura } from "../services/cobertura.service";

export function useCreateCobertura(userId: string) {
  const qc = useQueryClient();
  return useMutation<VistoriadorCobertura, Error, CreateCoberturaRequest>({
    mutationFn: (input) => createCobertura(userId, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["coberturas", userId] });
    },
  });
}
