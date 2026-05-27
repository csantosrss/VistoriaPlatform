---
agent: FE
sprint: "35"
date: 2026-05-27
---

# Handoff — Sprint 35 (FE) → Sprint 36 (DOC)

## Resumo

Entrega a feature pedida pelo usuário: **autocomplete de bairros**
no `AddCoberturaForm`, usando Nominatim (OSM) conforme contrato do
QI Sprint 34.

Ciclo abreviado QI34 → FE35 → DOC36 (BE e IN no-op declarados).

## Entregas

### 1. Cliente HTTP Nominatim

[`apps/web/src/lib/nominatim.ts`](../../apps/web/src/lib/nominatim.ts):

- `searchBairros(prefix, cidade, uf): Promise<string[]>` — query
  `q=<prefix>, <cidade>, <uf>, Brazil&format=jsonv2&addressdetails=1&limit=10&countrycodes=br`.
- `User-Agent: vistoria-platform/0.1 (admin@auxiliadorapredial.com.br)`.
- Filtro `extractBairro` na ordem `address.suburb` → `neighbourhood`
  → `quarter` → `city_district` → `name`. Resultados sem nenhum desses
  caem fora.
- Deduplicação case-insensitive; primeira ocorrência vence.
- Curto-circuita (retorna `[]`) se `prefix < 2`, `!cidade` ou `!uf` —
  blindagem mesmo se o caller esquecer.

### 2. Hook com debounce + cache

[`apps/web/src/features/cobertura/hooks/use-nominatim-bairros.ts`](../../apps/web/src/features/cobertura/hooks/use-nominatim-bairros.ts):

- `useDebouncedValue` helper local (sem dep nova; `useEffect` +
  `setTimeout` cancelado no cleanup).
- `useQuery` com `enabled: !!uf && !!cidade && debounced >= 2`.
- `staleTime: 1h`, `gcTime: 24h`, `retry: false`.
- `queryFn` engole erro via `.catch(() => [])` — falha de rede vira
  "sem sugestões" silenciosamente. UI nunca quebra.

### 3. Datalist no `AddCoberturaForm`

[`apps/web/src/features/cobertura/components/AddCoberturaForm.tsx`](../../apps/web/src/features/cobertura/components/AddCoberturaForm.tsx):

- Campo `bairro` ganha `list="bairros-list"`.
- `<datalist id="bairros-list">` populado dinamicamente via
  `bairrosQuery.data`.
- Helper text novo: "Sugestões via OpenStreetMap (Nominatim). Pode
  digitar livre se o bairro não aparecer."
- Reset do bairro quando UF/cidade muda — comportamento já existente,
  mantido.

### 4. Validações

| Comando                                  | Resultado                                                                   |
| ---------------------------------------- | --------------------------------------------------------------------------- |
| `pnpm --filter @vistoria/web typecheck`  | ✅                                                                          |
| `pnpm --filter @vistoria/web lint`       | ✅ (1 warning preexistente em `button.tsx`)                                 |
| `pnpm --filter @vistoria/web test`       | ✅ 27 testes em 7 suites (sem regressão)                                    |
| Manual: `Invoke-RestMethod` em Nominatim | ✅ shape confirmado: `address.suburb` para Centro Histórico de Porto Alegre |

### 5. Sem testes unitários FE específicos do hook

Justificativa: o hook é fino (wrapper sobre `useQuery` + debounce
puro). Risco principal é a integração com Nominatim — não testável
em unit sem mock pesado. Cobertura do hook fica em E2E manual (user
abrindo `/users/:id` no browser). Se quebrar, o pendente "testes
unitários para Cobertura" do ciclo regular cobrirá.

## Mudanças que tocam o usuário

- Cadastro de cobertura agora **sugere bairros** enquanto o usuário
  digita (cidade já preenchida).
- Sugestões vêm do OpenStreetMap — algumas cidades pequenas podem
  não ter bairros mapeados; nesse caso o user digita livre (mesma
  UX de antes).

## Sem dep nova

Tudo via `fetch` nativo + Tanstack Query (já presente). `lib/nominatim.ts`
fica ao lado de `lib/ibge.ts`, mesmo padrão.

## Próximo Sprint

**Sprint 36 — DOC**: ADR-019 + atualizar C4 (`apps/web → Nominatim`) +
README + 3 changelogs (S34 QI, S35 FE, S36 DOC).
