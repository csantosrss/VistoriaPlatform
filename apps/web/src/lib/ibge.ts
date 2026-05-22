/**
 * Cliente para a API pública do IBGE (`servicodados.ibge.gov.br/api/v1/localidades`).
 * Sem autenticação, sem chave; cache no `localStorage` (UFs) + Tanstack Query (cidades).
 * Documentação em `docs/architecture/ibge-integration.md`.
 */

const BASE = "https://servicodados.ibge.gov.br/api/v1/localidades";

export interface IbgeUf {
  sigla: string;
  nome: string;
}

export interface IbgeMunicipio {
  nome: string;
}

const UFS_CACHE_KEY = "ibge.ufs.v1";

export async function listUfs(): Promise<IbgeUf[]> {
  // localStorage cache primeiro — UFs mudam raramente.
  const cached =
    typeof window !== "undefined" ? localStorage.getItem(UFS_CACHE_KEY) : null;
  if (cached) {
    try {
      const parsed = JSON.parse(cached) as IbgeUf[];
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    } catch {
      // fall-through
    }
  }
  const res = await fetch(`${BASE}/estados?orderBy=nome`);
  if (!res.ok) throw new Error("Falha ao carregar UFs do IBGE.");
  const data = (await res.json()) as IbgeUf[];
  if (typeof window !== "undefined") {
    localStorage.setItem(UFS_CACHE_KEY, JSON.stringify(data));
  }
  return data;
}

export async function listMunicipios(uf: string): Promise<IbgeMunicipio[]> {
  const res = await fetch(`${BASE}/estados/${uf}/municipios?orderBy=nome`);
  if (!res.ok) throw new Error(`Falha ao carregar municípios de ${uf}.`);
  return (await res.json()) as IbgeMunicipio[];
}
