import { useQuery } from "@tanstack/react-query";
import { getUser } from "../services/users.service";

export function useUser(id: string | undefined) {
  return useQuery({
    queryKey: ["users", "detail", id],
    queryFn: () => getUser(id as string),
    enabled: !!id,
  });
}
