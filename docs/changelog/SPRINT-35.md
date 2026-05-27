# Sprint 35 — Changelog

**Período**: 2026-05-27
**Agente solo**: FE (segunda volta do ciclo 8 abreviado)
**Tema**: Autocomplete de bairros via Nominatim entregue.

## Itens entregues

### 1. Cliente HTTP Nominatim

[`apps/web/src/lib/nominatim.ts`](../../apps/web/src/lib/nominatim.ts):
`searchBairros(prefix, cidade, uf): Promise<string[]>`. Query
`format=jsonv2&addressdetails=1&limit=10&countrycodes=br`,
`User-Agent` identificável. Filtro `extractBairro` na ordem
`address.suburb` → `neighbourhood` → `quarter` → `city_district` →
`name`. Deduplicação case-insensitive.

### 2. Hook com debounce + cache

[`apps/web/src/features/cobertura/hooks/use-nominatim-bairros.ts`](../../apps/web/src/features/cobertura/hooks/use-nominatim-bairros.ts):
`useDebouncedValue` helper local (350ms, sem dep nova). `useQuery`
com `enabled: !!uf && !!cidade && debounced.length >= 2`,
`staleTime: 1h`, `gcTime: 24h`, `retry: false`. Erros engolidos via
`.catch(() => [])` — fallback gracioso para input livre.

### 3. Datalist no `AddCoberturaForm`

[`apps/web/src/features/cobertura/components/AddCoberturaForm.tsx`](../../apps/web/src/features/cobertura/components/AddCoberturaForm.tsx):
campo `bairro` ganha `list="bairros-list"` + `<datalist>` populado
dinamicamente. Helper text novo explicando a fonte. Reset
preservado.

## ADRs criados

Nenhum diretamente no FE; ADR-019 sai do DOC S36.

## Breaking changes

Nenhum. Schema do BE intocado (`bairro` continua `String?` livre).

## Métricas

- 2 arquivos novos (`lib/nominatim.ts`, hook).
- 1 arquivo modificado (`AddCoberturaForm.tsx`).
- 0 dependências novas.
- **27 testes em 7 suites no `@vistoria/web`** (sem regressão).
- Manual: `Invoke-RestMethod` em Nominatim confirmou shape esperado.

## Próximo sprint

**Sprint 36 — DOC**: ADR-019 + C4 + README + 3 changelogs.
