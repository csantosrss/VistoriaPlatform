import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { searchBairros } from "@/lib/nominatim";

/** Debounce simples em valor de string (350ms). */
function useDebouncedValue(value: string, delayMs: number): string {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(t);
  }, [value, delayMs]);
  return debounced;
}

/** Sugere bairros para o `prefix` na `cidade`/`uf` informados.
 * Só dispara com `prefix.length >= 2` (poupa rate-limit Nominatim).
 * Cache Tanstack por (uf, cidade, prefix) com staleTime 1h.
 * Erros são engolidos via `retry: false` + `throwOnError: false` — caller
 * trata como "sem sugestões" (fallback gracioso para input livre). */
export function useNominatimBairros(
  prefix: string,
  cidade: string | undefined,
  uf: string | undefined,
) {
  const debounced = useDebouncedValue(prefix, 350);
  const enabled = !!uf && !!cidade && debounced.trim().length >= 2;
  return useQuery<string[]>({
    queryKey: ["nominatim", "bairros", uf, cidade, debounced.toLowerCase()],
    queryFn: () =>
      searchBairros(debounced, cidade as string, uf as string).catch(() => []),
    enabled,
    staleTime: 60 * 60 * 1000,
    gcTime: 24 * 60 * 60 * 1000,
    retry: false,
  });
}
