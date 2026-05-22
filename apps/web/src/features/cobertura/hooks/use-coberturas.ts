import { useQuery } from "@tanstack/react-query";
import { listCoberturas } from "../services/cobertura.service";

export function useCoberturas(userId: string | undefined) {
  return useQuery({
    queryKey: ["coberturas", userId],
    queryFn: () => listCoberturas(userId as string),
    enabled: !!userId,
  });
}
