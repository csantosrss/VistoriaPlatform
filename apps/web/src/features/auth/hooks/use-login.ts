import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
  login,
  persistTokens,
  type AuthTokens,
} from "../services/auth.service";
import type { LoginInput } from "../schemas/login.schema";

export function useLogin() {
  const navigate = useNavigate();
  return useMutation<AuthTokens, Error, LoginInput>({
    mutationFn: login,
    onSuccess: (tokens) => {
      persistTokens(tokens);
      navigate("/");
    },
  });
}
