/**
 * Cliente para a API pública do Nominatim (OpenStreetMap).
 * Documentação: <https://nominatim.org/release-docs/develop/api/Search/>.
 * Sem auth; exige User-Agent identificável (fair-use). Rate-limit 1 req/seg
 * — sempre chamar via hook com debounce.
 * Detalhes completos da integração: `docs/architecture/nominatim-integration.md`.
 */

const BASE = "https://nominatim.openstreetmap.org/search";
const UA = "vistoria-platform/0.1 (admin@auxiliadorapredial.com.br)";

interface NominatimAddress {
  suburb?: string;
  neighbourhood?: string;
  quarter?: string;
  city_district?: string;
  city?: string;
  town?: string;
  village?: string;
  state?: string;
}

interface NominatimPlace {
  class?: string;
  type?: string;
  display_name?: string;
  name?: string;
  address?: NominatimAddress;
}

/** Extrai o nome do bairro de um resultado Nominatim, em ordem de
 * preferência. Retorna `null` se não houver candidato. */
function extractBairro(place: NominatimPlace): string | null {
  const a = place.address ?? {};
  return (
    a.suburb ??
    a.neighbourhood ??
    a.quarter ??
    a.city_district ??
    place.name ??
    null
  );
}

/** Busca sugestões de bairros para `<prefix>` na cidade/UF informada.
 * Retorna nomes únicos (deduplicação case-insensitive, primeira ocorrência
 * vence). Vazio quando nada bate ou Nominatim falha (decisão do caller). */
export async function searchBairros(
  prefix: string,
  cidade: string,
  uf: string,
): Promise<string[]> {
  if (prefix.trim().length < 2 || !cidade || !uf) return [];
  const q = `${prefix}, ${cidade}, ${uf}, Brazil`;
  const url = new URL(BASE);
  url.searchParams.set("q", q);
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("limit", "10");
  url.searchParams.set("countrycodes", "br");
  url.searchParams.set("accept-language", "pt-BR");

  const res = await fetch(url.toString(), {
    headers: { "User-Agent": UA },
  });
  if (!res.ok) {
    throw new Error(`Nominatim falhou (${res.status}).`);
  }
  const data = (await res.json()) as NominatimPlace[];

  const seen = new Set<string>();
  const result: string[] = [];
  for (const place of data) {
    const bairro = extractBairro(place);
    if (!bairro) continue;
    const key = bairro.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(bairro);
  }
  return result;
}
