import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { User } from "@vistoria/api-contracts";
import { deactivateUser } from "../services/users.service";

export function useDeactivateUser(id: string) {
  const qc = useQueryClient();
  return useMutation<User, Error, void>({
    mutationFn: () => deactivateUser(id),
    onSuccess: (user) => {
      qc.setQueryData(["users", "detail", id], user);
      qc.invalidateQueries({ queryKey: ["users", "list"] });
    },
  });
}
