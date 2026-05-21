import { keepPreviousData, useQuery } from "@tanstack/react-query";
import type { ListUsersQuery } from "@vistoria/api-contracts";
import { listUsers } from "../services/users.service";

export function useUsers(query: Partial<ListUsersQuery> = {}) {
  return useQuery({
    queryKey: ["users", "list", query],
    queryFn: () => listUsers(query),
    placeholderData: keepPreviousData,
  });
}
