import { useMutation, useQueryClient } from "@tanstack/react-query";
import { deleteCobertura } from "../services/cobertura.service";

export function useDeleteCobertura(userId: string) {
  const qc = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: (coberturaId) => deleteCobertura(userId, coberturaId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["coberturas", userId] });
    },
  });
}
