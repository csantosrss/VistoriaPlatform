import { useQuery } from "@tanstack/react-query";
import { getVistoriasStats } from "../services/vistorias.service";

export function useVistoriasStats() {
  return useQuery({
    queryKey: ["vistorias", "stats"],
    queryFn: getVistoriasStats,
    staleTime: 30 * 1000,
  });
}
