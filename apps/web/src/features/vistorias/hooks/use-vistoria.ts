import { useQuery } from "@tanstack/react-query";
import { getVistoria } from "../services/vistorias.service";

export function useVistoria(id: string | undefined) {
  return useQuery({
    queryKey: ["vistorias", "detail", id],
    queryFn: () => getVistoria(id as string),
    enabled: !!id,
  });
}
