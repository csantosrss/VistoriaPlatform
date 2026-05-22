# Integração com API do IBGE — `localidades`

**Status**: contrato externo, sem autenticação. Documentado na Sprint 21 (QI) para preparar a Sprint 24 (FE) que vai consumi-lo no autocomplete de cidade da feature de **cobertura geográfica do vistoriador**.

## Por que IBGE

- API pública e estável (`servicodados.ibge.gov.br`).
- Sem autenticação, sem chave, sem rate-limit publicado.
- Source-of-truth para os 27 estados + ~5.570 municípios brasileiros.
- Bairros **não** são cobertos — esses ficam como livre digitação (com normalização no BE, futuro).

Alternativas descartadas:

- **ViaCEP** — cobre CEP→endereço, mas não lista municípios por UF de forma navegável.
- **Lista hard-coded no FE** — desatualiza (novas emancipações de município) e infla o bundle.
- **Tabela `Cidade` no nosso banco** — overkill; IBGE muda raramente e cache de 24h no FE basta.

## Endpoints usados

### Listar estados (UFs)

```
GET https://servicodados.ibge.gov.br/api/v1/localidades/estados?orderBy=nome
```

Resposta (array):

```json
[
  { "id": 11, "sigla": "RO", "nome": "Rondônia", "regiao": {...} },
  { "id": 12, "sigla": "AC", "nome": "Acre", "regiao": {...} },
  ...
]
```

FE usa `sigla` (2 chars) como valor e `nome` como label.

### Listar municípios de uma UF

```
GET https://servicodados.ibge.gov.br/api/v1/localidades/estados/{UF}/municipios?orderBy=nome
```

Exemplo (`UF=SP`):

```json
[
  { "id": 3500105, "nome": "Adamantina", "microrregiao": {...} },
  { "id": 3500204, "nome": "Adolfo", "microrregiao": {...} },
  ...
]
```

FE usa `nome` no input do autocomplete.

## Cache e performance

- Resposta de UFs: ~2 KB. Cachear no `localStorage` por sessão (não precisa de TTL).
- Resposta de municípios por UF: 2-200 KB (depende — SP tem ~645 municípios, RR tem 15).
  - Cachear no Tanstack Query com `staleTime: 24h`.
  - Lazy-load: só fetch quando o select de UF muda.

## Tratamento de erro

- **API fora do ar**: FE faz fallback para input de texto livre (sem autocomplete). Mostra warning discreto. **Importante**: nunca bloquear o cadastro de cobertura por causa do IBGE.
- **CORS**: a API do IBGE expõe `Access-Control-Allow-Origin: *`. Funciona direto do navegador. Confirmado em testes manuais.

## Consistência com o que está no DB

- `VistoriadorCobertura.uf` — 2 chars uppercase (`SP`), igual ao `Vistoria.enderecoUf`.
- `VistoriadorCobertura.cidade` — string livre como o IBGE devolve (com acento, sem normalização no FE).
- `VistoriadorCobertura.bairro` — string livre digitada pelo gestor.

**Risco** (ver Known Issues): `Vistoria.enderecoCidade` é livre digitação no formulário de criação (`"São Paulo"` vs `"Sao Paulo"`). Routing futuro que cruzar cobertura com vistoria precisa normalizar antes do match (BE Sprint 22 — `LOWER(unaccent(...))` no Postgres ou `lib/normalize.ts` no service).

## Como o FE consome (sketch Sprint 24)

```ts
// apps/web/src/lib/ibge.ts
const BASE = "https://servicodados.ibge.gov.br/api/v1/localidades";

export async function listUfs(): Promise<{ sigla: string; nome: string }[]> { ... }
export async function listMunicipios(uf: string): Promise<{ nome: string }[]> { ... }
```

Hooks:

```ts
const ufs = useQuery({
  queryKey: ["ibge", "ufs"],
  queryFn: listUfs,
  staleTime: Infinity,
});
const cidades = useQuery({
  queryKey: ["ibge", "cidades", uf],
  queryFn: () => listMunicipios(uf),
  enabled: !!uf,
  staleTime: 24 * 60 * 60 * 1000,
});
```

UI: `<Select>` de UF + `<Combobox>` de cidade (input com lista filtrada conforme digita).

## Pendências

- Quando rate-limit do IBGE virar dor (improvável), considerar proxy via `apps/api` com cache server-side em Redis.
- Quando bairros forem campo de routing real, avaliar se vale uma fonte (Correios? OpenStreetMap?) ou se a normalização no BE basta.
