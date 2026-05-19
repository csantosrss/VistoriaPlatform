import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { clearSession } from "../services/auth.service";

export function useLogout() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  return () => {
    clearSession();
    queryClient.clear();
    navigate("/login", { replace: true });
  };
}
