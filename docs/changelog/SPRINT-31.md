# Sprint 31 — Changelog

**Período**: 2026-05-27
**Agente solo**: QI (abertura do ciclo 7 — corretivo)
**Tema**: Bug do path `/metrics` (era `/v1/metrics`) detectado ao subir `pnpm dev:all` pela primeira vez pós-S30.

## Itens entregues

### 1. Bug identificado e isolado

- **Causa raiz**: `MetricsController` foi entregue na S27 BE com
  `@Controller({ path: "metrics", version: undefined })`. O
  `defaultVersion: "1"` global do `main.ts` aplica versionamento mesmo
  quando `version` é `undefined` — só `VERSION_NEUTRAL` desliga.
- **Sintoma**: `/metrics` → 404; `/v1/metrics` → 200. Prometheus
  scraper aponta para `/metrics`, target `vistoria-api` aparece DOWN.
- **Detectado por**: smoke test HTTP manual após `pnpm dev:all` (não
  foi pego pelos testes do S26-S30 que rodaram só typecheck/lint/test
  estático).

### 2. Spec E2E novo

[`e2e/metrics-endpoint.spec.ts`](../../e2e/metrics-endpoint.spec.ts):
2 cases — GET /metrics 200 com content-type Prometheus, exposição de
`http_requests_total` + Node defaults. Falha hoje (404), passa após o
S32 BE.

Total Playwright: **38 testes em 11 arquivos** (era 36, +2).

### 3. Decisão de ciclo abreviado

`SPRINT-31-QI.md` declara **IN (Sprint 33) e FE (Sprint 34) como
no-op formal** — a correção se contém em BE+infra+docs. Ciclo
roda como QI31 → BE32 → DOC33 em vez do clássico
QI→BE→IN→FE→DOC. Padrão proposto: "ciclo corretivo abreviado quando
nada toca IN/FE, com no-op declarado no handoff QI".

## ADRs criados

Nenhum no QI. Candidato (a critério do DOC S33):

- ADR sobre o padrão "ciclo corretivo abreviado QI→BE→DOC".

## Breaking changes

Nenhum — só specs + handoff.

## Métricas

- 1 spec Playwright novo (+2 testes).
- 0 mudanças de código de aplicação.

## Próximo sprint

**Sprint 32 — BE**: 1 linha de código (`VERSION_NEUTRAL`).
