---
agent: QI
sprint: "31"
date: 2026-05-27
---

# Handoff — Sprint 31 (QI) → Sprint 32 (BE)

## Resumo

Ciclo 7 começa com um **ciclo corretivo abreviado** para um bug latente
do ciclo 6 que escapou de todos os 5 agentes (não foi pego porque
ninguém rodou a stack no browser entre BE/DOC do ciclo 6 — DOC fechou
ciclo só com typecheck/lint/test estático):

- **Endpoint `/metrics`** foi entregue como `@Controller({ path:
"metrics", version: undefined })` no S27 BE, mas o `defaultVersion:
"1"` global do `main.ts` aplicou versionamento mesmo assim. Resultado:
  endpoint ficou em `/v1/metrics` em vez de `/metrics`.
- O scraper do **Prometheus** (subido no S26 QI) aponta para
  `host.docker.internal:3000/metrics` — o target `vistoria-api` aparece
  como **DOWN** no Prometheus UI, apesar das métricas estarem
  funcionalmente disponíveis em `/v1/metrics`.
- Reflete em **3 docs do ciclo 6** que ficaram desalinhados com a
  realidade: `README.md`, `ADR-016`, `SPRINT-30.md`.
- O bug afeta também `/v1/health` (idem path), mas esse caso é
  histórico desde S02 e a documentação sempre referenciou `/v1/health`,
  então é menos crítico — vale corrigir para coerência.

## Escopo abreviado do ciclo corretivo

Nem IN nem FE têm trabalho aqui. **Esta sprint declara formalmente que
IN (Sprint 33 no-op) e FE (Sprint 34 no-op) não aplicam**; o ciclo
roda como **QI31 → BE32 → DOC33** (em vez do clássico
QI→BE→IN→FE→DOC). Padrão usado quando todo o trabalho corretivo se
contém em BE+infra+docs.

Caso o usuário prefira o ciclo cheio (com IN e FE formalizando
no-ops em sprints próprios), reabrir.

## Entregas deste sprint (QI)

### 1. Spec E2E novo

[`e2e/metrics-endpoint.spec.ts`](../../e2e/metrics-endpoint.spec.ts):

- `GET /metrics` → 200 + `Content-Type: text/plain; version=0.0.4`.
- `GET /metrics` expõe `http_requests_total`,
  `http_request_duration_seconds_bucket`, `nodejs_version_info`,
  `service="vistoria-api"`.

Roda contra a stack do `pnpm dev:all`. Falha hoje (404), passa quando
o BE entrega o S32.

Total Playwright: **38 testes em 11 arquivos** (era 36, +2 deste spec).

### 2. Validação manual do achado

Comando que reproduziu o bug:

```powershell
Invoke-WebRequest -Uri "http://localhost:3000/metrics" -UseBasicParsing
# → 404 NotFoundException

Invoke-WebRequest -Uri "http://localhost:3000/v1/metrics" -UseBasicParsing
# → 200, 12841 bytes, contém http_requests_total e nodejs_version_info
```

E o `prometheus.yml` aponta para `/metrics` (path default do scrape job),
então o Prometheus marca `vistoria-api` como DOWN até o BE entregar.

## Critérios de aceitação para o BE (Sprint 32)

| Critério                                                     | Aceite                                                                                                                                                                                            |
| ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET /metrics` responde 200 com content-type Prometheus      | Spec `metrics-endpoint.spec.ts` passa.                                                                                                                                                            |
| Resposta continua expondo as métricas custom + defaults Node | `http_requests_total`, `http_request_duration_seconds`, `nodejs_*`.                                                                                                                               |
| `/v1/health` segue intacto (regressão zero)                  | Spec `health.spec.ts` continua passando.                                                                                                                                                          |
| Decisão: usar `VERSION_NEUTRAL` no `MetricsController`       | Trocar `version: undefined` por `version: VersioningType.URI.NEUTRAL` ou equivalente; ou usar opção `{ ignoreVersioning: true }` se o `enableVersioning` aceitar. Detalhe técnico fica no S32 BE. |
| `/metrics` aparece sem versão no log de startup do Nest      | Linha `Mapped {/metrics, GET}` sem "(version: 1)".                                                                                                                                                |
| Aplicar a mesma correção no `HealthController` por coerência | `/health` (sem `/v1`) também responde — fallback do path antigo + path versionado. Decidir no S32.                                                                                                |

Implementação típica:

```ts
import { VERSION_NEUTRAL } from "@nestjs/common";

@Controller({ path: "metrics", version: VERSION_NEUTRAL })
export class MetricsController { ... }
```

`VERSION_NEUTRAL` instrui o Nest a ignorar o `defaultVersion`. O mesmo
para `HealthController`. Sem mudança no `main.ts`.

## Para outros agentes

### BE (Sprint 32)

Implementar correção acima. Atualizar `metrics.service.spec.ts` se a
mudança refletir em label/path em algum ponto. Validar via `pnpm dev:all`

- `Invoke-WebRequest /metrics`.

### IN (Sprint 33) — **NO-OP DECLARADO**

Nada da correção toca `packages/integrations`. Sprint 33 IN é apenas
um handoff formal que registra a passagem. Bug e correção são de
escopo BE+infra+docs.

### FE (Sprint 34) — **NO-OP DECLARADO**

Nada da correção toca `apps/web`. Sprint 34 FE é apenas handoff formal.

### DOC (Sprint 35 — ou consolidação imediata)

Para evitar 2 sprints DOC seguidas, **vou propor consolidar como
Sprint 33 DOC** após BE 32, pulando IN/FE no-op (que ficam só
declarados aqui). Atualizar:

- `README.md`: trocar `http://localhost:3000/metrics` (já está correto
  no doc; o bug era o BE) — confirmar.
- `ADR-016-metrics-endpoint-no-auth.md`: nota de implementação sobre
  `VERSION_NEUTRAL` (a decisão arquitetural não muda).
- `SPRINT-30.md`: marcar bug como resolvido na próxima consolidação.
- `c4-container.md`: anotar `/metrics` real (sem `/v1`).
- 3 changelogs novos (S31 QI, S32 BE, S33 DOC).
- 1 ADR novo opcional: padrão de "ciclos corretivos abreviados
  QI→BE→DOC quando IN/FE são no-op" — depende de o usuário aceitar
  o padrão.

## Validação executada

| Comando                       | Resultado                                                    |
| ----------------------------- | ------------------------------------------------------------ |
| `pnpm playwright test --list` | 38 testes em 11 arquivos (era 36; +2 do `metrics-endpoint`). |
| `pnpm dev:all`                | Stack subiu; bug reproduzido manualmente.                    |

## Nota de processo

O bug escapou porque **o DOC do S30 fechou o ciclo com validação só
estática** (typecheck/lint/test). Recomendação para os DOCs futuros:
quando o ciclo inclui infra nova (Prometheus, novos services em
docker-compose), o DOC deve incluir um `pnpm dev:all` + smoke test
HTTP nos endpoints novos antes de fechar o ciclo. Vou propor essa
adição ao `CLAUDE.md` do DOC se essa correção rodar limpa.

## Próximo Sprint

**Sprint 32 — BE**: 1 linha de código (`VERSION_NEUTRAL`) + spec do
metrics passa.
