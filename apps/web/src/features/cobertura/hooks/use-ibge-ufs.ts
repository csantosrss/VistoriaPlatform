import { useQuery } from "@tanstack/react-query";
import { listUfs, type IbgeUf } from "@/lib/ibge";

export function useIbgeUfs() {
  return useQuery<IbgeUf[]>({
    queryKey: ["ibge", "ufs"],
    queryFn: listUfs,
    staleTime: Infinity,
    retry: 1,
  });
}
