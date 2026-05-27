# ADR-019: Nominatim (OSM) como source-of-truth para autocomplete de bairros

## Status

Aceita

## Contexto

A Sprint 22 BE entregou o campo `VistoriadorCobertura.bairro String?`.
A Sprint 24 FE entregou o `AddCoberturaForm` com `bairro` como **input
livre**, justificando que IBGE (a fonte usada para UFs e cidades) **não
cobre bairros**.

Ao testar a cobertura no browser pela primeira vez (depois do ciclo
corretivo S31-S33), o usuário sinalizou que esperava autocomplete de
bairros — mesma experiência da cidade. Sem fonte, o input livre virou
ponto de atrito (e gera dados ruidosos: o registro existente no DB
tinha `bairro = "centr"`, claramente o usuário começou a digitar e
submeteu).

A pergunta: qual fonte adotar para typeahead de bairros?

## Decisão

**Nominatim (OpenStreetMap)** em modo typeahead, chamado direto do
`apps/web` (sem proxy no BE — mesmo padrão da integração IBGE).

Detalhes técnicos completos em
[`docs/architecture/nominatim-integration.md`](../architecture/nominatim-integration.md):

- Endpoint: `https://nominatim.openstreetmap.org/search?q=<bairro>,
<cidade>, <uf>, Brazil&format=jsonv2&addressdetails=1&limit=10&countrycodes=br`.
- `User-Agent: vistoria-platform/0.1 (admin@auxiliadorapredial.com.br)`
  (obrigatório por fair-use).
- Filtro do resultado: prefere `address.suburb`, `address.neighbourhood`,
  `address.quarter`, `address.city_district`, `name` (nessa ordem).
  Deduplicação case-insensitive.
- Debounce 350ms + cache Tanstack 1h por `(uf, cidade, prefix)`.
- Disparo só com `prefix.length >= 2` (poupa rate-limit 1 req/seg).
- Fallback gracioso: erro → datalist vazia, user segue digitando livre.

## Alternativas Consideradas

- **OSM Overpass API** — lista exaustiva de bairros de uma cidade via
  query Overpass. Vantagem: autocomplete instantâneo no FE depois do
  load inicial. Desvantagem: latência alta (3–10s) e sintaxe complexa.
  Reaberta se o typeahead via Nominatim mostrar lacunas.
- **ViaCEP** — retorna o bairro de **um CEP específico**, não lista.
  Não serve para typeahead "comece a digitar e veja sugestões".
- **Google Places API** — qualidade alta, mas pago. Fora do escopo
  do projeto atualmente.
- **Hard-code dos bairros das cidades-alvo** (Porto Alegre, São Paulo,
  Rio etc.) — requer manutenção contínua e não escala para cidades
  pequenas. Aceitável só como fallback de última instância.
- **Não implementar** (manter input livre + helper text) — opção
  rejeitada porque o usuário sinalizou expectativa específica de
  autocomplete; manter sem é confirmar a expectativa quebrada.

## Consequências

### Positivas

- **Sem dep nova** no `apps/web` (cliente HTTP via `fetch` direto).
- **Sem mudança de schema** no BE — `bairro` continua `String?` livre.
- **Sem trabalho no BE/IN** — ciclo abreviado QI→FE→DOC, igual ao
  padrão estabelecido na correção do `/metrics` (S31–S33).
- Padrão coerente com integração IBGE existente (cliente HTTP simples
  - hook Tanstack Query + fallback gracioso).
- Cobre qualquer cidade do Brasil sem manutenção manual.

### Negativas / Riscos

- **Rate-limit 1 req/seg** — mitigado por debounce 350ms + cache 1h.
  Se a base de usuários crescer, considerar proxy/cache no BE (mesma
  decisão pendente do IBGE).
- **Latência variável** — Nominatim hospedado pela OSM Foundation
  pode ser lento em horários de pico. Fallback gracioso impede
  bloquear o usuário.
- **Cobertura desigual** — cidades pequenas têm poucos bairros
  mapeados. Aceitável: user digita livre quando não acha sugestão.
- **Dependência externa** — se a OSM banir nossa origem ou trocar a
  API, perde-se autocomplete (mas não a feature, que volta a ser
  input livre). Migrar para Overpass ou self-host seria o plano B.
- **`User-Agent` exposto no header pode ser spoofado** — não é
  problema de segurança (endpoint público), mas é boa cidadania OSM
  identificar a aplicação. Se hostname mudar, atualizar o User-Agent.

### Pendências forward-compat

- Quando o **routing futuro** cruzar `Vistoria.enderecoBairro` (livre)
  com `VistoriadorCobertura.bairro` (livre + sugestão Nominatim),
  aplicar `LOWER + unaccent` em ambos antes do `WHERE`. Mesma decisão
  herdada do IBGE para `cidade` (registrada nos pedidos abertos
  desde o S25).
- Se Nominatim ficar indisponível em produção (Brasil bloqueia OSM,
  ex.), considerar self-host (Docker imagem oficial nominatim) ou
  proxy via BE com cache Redis. Custo: alto. Adiar até a dor aparecer.

## Agente Autor

DOC (consolida decisão tática do FE Sprint 35, motivada pelo QI
Sprint 34)

## Data

2026-05-27

## Sprint

S36

## Referências

- Documento da integração: [`docs/architecture/nominatim-integration.md`](../architecture/nominatim-integration.md)
- Implementação:
  - [`apps/web/src/lib/nominatim.ts`](../../apps/web/src/lib/nominatim.ts)
  - [`apps/web/src/features/cobertura/hooks/use-nominatim-bairros.ts`](../../apps/web/src/features/cobertura/hooks/use-nominatim-bairros.ts)
  - [`apps/web/src/features/cobertura/components/AddCoberturaForm.tsx`](../../apps/web/src/features/cobertura/components/AddCoberturaForm.tsx)
- Handoffs: [SPRINT-34-QI.md](../handoffs/SPRINT-34-QI.md), [SPRINT-35-FE.md](../handoffs/SPRINT-35-FE.md), [SPRINT-36-DOC.md](../handoffs/SPRINT-36-DOC.md)
- Integração análoga: [`docs/architecture/ibge-integration.md`](../architecture/ibge-integration.md)
