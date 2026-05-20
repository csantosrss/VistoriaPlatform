import { useQuery } from "@tanstack/react-query";
import { getVistoriaTransicoes } from "../services/vistorias.service";

export function useVistoriaTransicoes(id: string | undefined) {
  return useQuery({
    queryKey: ["vistorias", "transicoes", id],
    queryFn: () => getVistoriaTransicoes(id as string),
    enabled: !!id,
  });
}
