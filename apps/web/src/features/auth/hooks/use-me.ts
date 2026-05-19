import { useQuery } from "@tanstack/react-query";
import type { AuthUser } from "@vistoria/api-contracts";
import {
  fetchMe,
  getStoredToken,
  getStoredUser,
} from "../services/auth.service";

export function useMe() {
  return useQuery<AuthUser | null>({
    queryKey: ["auth", "me"],
    queryFn: fetchMe,
    enabled: !!getStoredToken(),
    initialData: () => getStoredUser() ?? undefined,
    staleTime: 5 * 60 * 1000,
    retry: false,
  });
}
