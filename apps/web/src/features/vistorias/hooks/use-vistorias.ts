import { keepPreviousData, useQuery } from "@tanstack/react-query";
import type { ListVistoriasQuery } from "@vistoria/api-contracts";
import { listVistorias } from "../services/vistorias.service";

export function useVistorias(query: Partial<ListVistoriasQuery> = {}) {
  return useQuery({
    queryKey: ["vistorias", "list", query],
    queryFn: () => listVistorias(query),
    placeholderData: keepPreviousData,
  });
}
