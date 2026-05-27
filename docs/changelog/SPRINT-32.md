# Sprint 32 — Changelog

**Período**: 2026-05-27
**Agente solo**: BE (segunda volta do ciclo 7 — corretivo)
**Tema**: `VERSION_NEUTRAL` no `MetricsController` — `/metrics` no path correto.

## Itens entregues

### 1. Correção de 1 linha

[`apps/api/src/metrics/metrics.controller.ts`](../../apps/api/src/metrics/metrics.controller.ts):

```diff
- import { Controller, Get, Header, HttpCode, HttpStatus } from "@nestjs/common";
+ import {
+   Controller, Get, Header, HttpCode, HttpStatus,
+   VERSION_NEUTRAL,
+ } from "@nestjs/common";
  ...
- @Controller({ path: "metrics", version: undefined })
+ @Controller({ path: "metrics", version: VERSION_NEUTRAL })
```

Comentário expandido com o histórico do bug (S27 origem → S31 detecção
→ S32 fix) e a justificativa técnica do `VERSION_NEUTRAL`.

### 2. `HealthController` deixado intacto — decisão

Apesar do bug afetar `/health` da mesma forma, manter o path como
`/v1/health` por compatibilidade com README, spec E2E
(`e2e/health.spec.ts`) e tudo o que já consome desde a Sprint 02.
Trocar agora seria breaking change sem ganho funcional (não há
scraper apontando para `/health` puro como o Prometheus apontava
para `/metrics`).

## ADRs criados

Nenhum diretamente. DOC S33 pode opcionalmente registrar
`VERSION_NEUTRAL` como padrão para endpoints "infra-externos"
(metrics, futuras integrações de scraper) que não devem cair no
versionamento da API REST.

## Breaking changes

- **Apenas para clientes que tenham (incorretamente) consumido
  `/v1/metrics`**. O endpoint não tinha consumidor real — só o
  Prometheus configurado pelo QI S26 esperando `/metrics`, que agora
  funciona. Sem impacto externo.

## Métricas

- 1 arquivo modificado.
- 1 dependência adicionada (`VERSION_NEUTRAL` do `@nestjs/common` já
  estava disponível, apenas import novo).
- **80 testes em 10 suites no `apps/api`** (sem regressão).
- Spec novo `metrics-endpoint.spec.ts` agora **2/2 passa** contra a
  stack do `pnpm dev:all`.
- Manual: `GET /metrics` → 200, 11.2 KB, `Content-Type: text/plain;
charset=utf-8; version=0.0.4`.

## Próximo sprint

**Sprint 33 — DOC**: consolidação (3 changelogs + atualizar ADR-016 +
SPRINT-30 + índice + handoff). IN e FE pulados (no-op).
