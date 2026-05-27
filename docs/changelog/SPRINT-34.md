# Sprint 34 — Changelog

**Período**: 2026-05-27
**Agente solo**: QI (abertura do ciclo 8 abreviado)
**Tema**: Autocomplete de bairros via Nominatim — feature request do usuário detectada ao testar cobertura no browser.

## Itens entregues

### 1. Documento de integração Nominatim

[`docs/architecture/nominatim-integration.md`](../architecture/nominatim-integration.md):
endpoint, params, headers (User-Agent obrigatório), rate-limit
(1 req/seg), filtros de resposta, UX (debounce 350ms, cache 1h,
mínimo 2 caracteres), riscos, alternativas descartadas (Overpass,
ViaCEP, Google Places, hard-code), alinhamento com integração IBGE.

### 2. Handoff QI com critérios

[`docs/handoffs/SPRINT-34-QI.md`](../handoffs/SPRINT-34-QI.md):
critérios de aceitação para o FE Sprint 35 + estrutura de arquivos
proposta + declaração formal de **BE e IN no-op** (Nominatim é HTTP
público chamado direto do FE, igual ao IBGE).

### 3. Decisão de fonte de dados

Apresentadas 4 opções ao usuário (Nominatim typeahead, Overpass,
input livre + helper, hard-code). Escolhida: **Nominatim**.

## ADRs criados

Nenhum no QI. ADR-019 sai do DOC Sprint 36.

## Breaking changes

Nenhum.

## Métricas

- 1 doc de arquitetura novo.
- 1 handoff QI.
- 0 mudanças de código.
- Total Playwright: 38 testes em 11 arquivos (sem mudança).

## Próximo sprint

**Sprint 35 — FE**: `lib/nominatim.ts` + hook + datalist no
`AddCoberturaForm`. Sem dep nova.
