import { useQuery } from "@tanstack/react-query";
import { listMunicipios, type IbgeMunicipio } from "@/lib/ibge";

export function useIbgeMunicipios(uf: string | undefined) {
  return useQuery<IbgeMunicipio[]>({
    queryKey: ["ibge", "municipios", uf],
    queryFn: () => listMunicipios(uf as string),
    enabled: !!uf,
    staleTime: 24 * 60 * 60 * 1000,
    retry: 1,
  });
}
