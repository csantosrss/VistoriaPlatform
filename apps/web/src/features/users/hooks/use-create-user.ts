import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import type { CreateUserRequest, User } from "@vistoria/api-contracts";
import { createUser } from "../services/users.service";

export function useCreateUser() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  return useMutation<User, Error, CreateUserRequest>({
    mutationFn: createUser,
    onSuccess: (user) => {
      qc.invalidateQueries({ queryKey: ["users", "list"] });
      navigate(`/users/${user.id}`, { replace: true });
    },
  });
}
