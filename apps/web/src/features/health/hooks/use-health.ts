import { useQuery } from "@tanstack/react-query";
import { fetchHealth } from "../services/health.service";

export function useHealth() {
  return useQuery({
    queryKey: ["health"],
    queryFn: fetchHealth,
    refetchInterval: 15_000,
  });
}
