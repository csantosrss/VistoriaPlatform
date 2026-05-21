import { keepPreviousData, useQuery } from "@tanstack/react-query";
import type { ListAgendaSlotsQuery } from "@vistoria/api-contracts";
import { listAgendaSlots } from "../services/agenda.service";

export function useAgendaSlots(
  vistoriadorId: string | undefined,
  query: Partial<ListAgendaSlotsQuery> = {},
) {
  return useQuery({
    queryKey: ["agenda", vistoriadorId, query],
    queryFn: () => listAgendaSlots(vistoriadorId as string, query),
    enabled: !!vistoriadorId,
    placeholderData: keepPreviousData,
  });
}
