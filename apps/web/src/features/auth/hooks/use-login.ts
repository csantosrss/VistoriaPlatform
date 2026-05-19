import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import type { LoginRequest, LoginResponse } from "@vistoria/api-contracts";
import { login, persistSession } from "../services/auth.service";

export function useLogin(redirectTo?: string) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  return useMutation<LoginResponse, Error, LoginRequest>({
    mutationFn: login,
    onSuccess: (response) => {
      persistSession(response);
      // Pré-popula o cache do /me com o user já recebido no login,
      // evitando uma segunda chamada redundante na primeira renderização.
      queryClient.setQueryData(["auth", "me"], response.user);
      navigate(redirectTo ?? "/", { replace: true });
    },
  });
}
