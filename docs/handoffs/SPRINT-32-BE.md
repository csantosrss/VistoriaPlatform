---
agent: BE
sprint: "32"
date: 2026-05-27
---

# Handoff — Sprint 32 (BE) → Sprint 33 (DOC)

## Resumo

Correção cirúrgica do bug do `/metrics` reportado no QI Sprint 31.

- **1 arquivo modificado** (`apps/api/src/metrics/metrics.controller.ts`).
- **1 troca**: `version: undefined` → `version: VERSION_NEUTRAL`.
- `/metrics` agora responde no path correto sem versionamento.
- `/v1/health` segue intacto (não tocado).

Spec E2E `metrics-endpoint.spec.ts` (criada pelo QI) passa: **2/2**.

Próximo agente é o **DOC** (Sprint 33). IN e FE pulados (no-op
declarado no SPRINT-31-QI.md).

## Entregas

### 1. `VERSION_NEUTRAL` no MetricsController

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

Comentário do controller atualizado com explicação do bug e da
correção, referenciando S27 BE (origem), S31 QI (detecção) e S32 BE
(fix).

### 2. `HealthController` deixado intacto — decisão

QI sinalizou aplicar a mesma correção no `HealthController` por
coerência. **Decisão BE: não aplicar agora**. Motivos:

1. `/v1/health` está em produção desde **Sprint 02**.
2. Todo consumidor existente (README, `e2e/health.spec.ts`,
   provavelmente o `apps/web` health page) referencia `/v1/health`.
3. Trocar para `/health` seria **breaking change** sem ganho funcional
   — não tem scraper externo apontando para `/health` puro como o
   Prometheus apontava para `/metrics`.

Se o produto pedir alinhamento (ex.: Kubernetes liveness/readiness
probe esperando `/healthz` ou `/health`), reabrir em sprint dedicado
com migração coordenada (FE + spec + docs).

## Validação executada

| Comando                                             | Resultado                                                                  |
| --------------------------------------------------- | -------------------------------------------------------------------------- |
| `pnpm --filter @vistoria/api typecheck`             | ✅                                                                         |
| `pnpm --filter @vistoria/api test`                  | ✅ **80 testes em 10 suites** (sem regressão).                             |
| Manual: `GET /metrics`                              | ✅ 200, 11.2 KB, `Content-Type: text/plain; charset=utf-8; version=0.0.4`. |
| Manual: `GET /v1/health`                            | ✅ 200, status `ok` (regressão zero).                                      |
| `pnpm playwright test e2e/metrics-endpoint.spec.ts` | ✅ **2/2** passam contra stack do `pnpm dev:all`.                          |

## Próximo Sprint

**Sprint 33 — DOC**: consolidar a correção. Atualizar `README.md`
(já estava com `/metrics` correto na documentação — só validar),
`ADR-016` (nota técnica sobre `VERSION_NEUTRAL`), `SPRINT-30.md`
(marcar bug `/metrics path` como resolvido), índice de changelog +
3 changelogs novos (S31 QI, S32 BE, S33 DOC).

DOC também pode propor:

- Adendo ao `CLAUDE.md` do DOC: incluir `pnpm dev:all` + smoke HTTP
  como gate de fechamento de ciclos que tocam infra/observabilidade.
- ADR (opcional) sobre o padrão "ciclo corretivo abreviado QI→BE→DOC"
  formalizando quando IN e FE podem ser no-op.
