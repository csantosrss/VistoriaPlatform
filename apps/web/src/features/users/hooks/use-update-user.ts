import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { UpdateUserRequest, User } from "@vistoria/api-contracts";
import { updateUser } from "../services/users.service";

export function useUpdateUser(id: string) {
  const qc = useQueryClient();
  return useMutation<User, Error, UpdateUserRequest>({
    mutationFn: (input) => updateUser(id, input),
    onSuccess: (user) => {
      qc.setQueryData(["users", "detail", id], user);
      qc.invalidateQueries({ queryKey: ["users", "list"] });
    },
  });
}
