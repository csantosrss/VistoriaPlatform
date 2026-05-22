# Sprint 24 — Changelog

**Período**: 2026-05-21
**Agente solo**: FE
**Tema**: Consumir tudo que o BE22 expôs — card de cobertura + providerId em users + codigoImovelExterno em vistorias + filtro na lista.

## Itens entregues

### 1. Feature `cobertura/` (apps/web)

- Service + 5 hooks (`use-coberturas`, `use-create-cobertura`, `use-delete-cobertura`, `use-ibge-ufs`, `use-ibge-municipios`).
- `AddCoberturaForm.tsx`: UF Select (IBGE), Cidade combobox via `<datalist>` nativo, Bairro livre. Hierarquia (cidade → bairro). Fallback livre se IBGE fora do ar.
- `CoberturaCard.tsx`: lista coberturas com badge de escopo (`UF inteira` / `Cidade` / `Bairro`) + delete inline + form embed.

### 2. `lib/ibge.ts`

- `listUfs()`: cache `localStorage` + fetch fallback.
- `listMunicipios(uf)`: fetch puro; cache via Tanstack Query.

### 3. providerId no User

- `UserForm.tsx`: `useWatch` em `roles` para mostrar/esconder select de `providerId`. Default `interno`. Submit força null se role final não inclui VISTORIADOR.
- `UserDetailPage.tsx`: badge do providerId na header + select no form de edit + embed do `CoberturaCard` (só para VISTORIADOR).

### 4. codigoImovelExterno em Vistoria

- `VistoriaForm.tsx`: nova seção "Identificação" no topo do form. Required (Zod via schema).
- `VistoriasFilters.tsx`: input de busca `Código do imóvel` ao lado de status/tipo. Query `?codigoImovelExterno=` exato.

## Endpoints consumidos

Sem novos — BE22 + IBGE público.

## Métricas

- 9 arquivos novos em `features/cobertura/`.
- 1 arquivo novo em `lib/ibge.ts`.
- 4 arquivos alterados (`UserForm`, `UserDetailPage`, `VistoriaForm`, `VistoriasFilters`).
- 0 dependências novas.
- 19 unit (mantém).

## Breaking changes

- `VistoriaForm` rejeita submit sem `codigoImovelExterno`.
- `UserForm` força `providerId: null` quando role final não tem VISTORIADOR.

## Decisões táticas

- `<input list="datalist">` nativo em vez de combobox custom — zero dep, UX bom.
- IBGE chamado direto do navegador (CORS aberto). Mitigação futura via Redis no BE se virar dor.
- Cobertura embed em `/users/:id` (escolha do produto via AskUserQuestion S21).

## ADRs

Nenhum. Candidato: IBGE como source-of-truth para municípios.

## Próximo sprint

**Sprint 25 — DOC**: consolidação do ciclo 5.
