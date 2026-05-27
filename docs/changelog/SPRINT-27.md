# Sprint 27 — Changelog

**Período**: 2026-05-26
**Agente solo**: BE (segunda volta do ciclo 6)
**Tema**: Bulk endpoints da agenda + RBAC fino para vistoriador + `/metrics` Prometheus.

## Itens entregues

### 1. 3 bulk endpoints novos na agenda

Todos atómicos em `prisma.$transaction`, com audit log e resposta
padrão `{ affectedCount, ids, excluded? }` (excluded tem
`{id, reason}` para slots fora do tenant, já bloqueados, etc.):

| Método | Rota                                           | Body                                    | Audit                 |
| ------ | ---------------------------------------------- | --------------------------------------- | --------------------- |
| POST   | `/api/v1/vistoriadores/:id/agenda:bulk-block`  | `{ from, to, motivo? }`                 | `AGENDA.BULK_BLOCKED` |
| POST   | `/api/v1/vistoriadores/:id/agenda:bulk-update` | `{ ids[1..200], disponivel?, motivo? }` | `AGENDA.BULK_UPDATED` |
| DELETE | `/api/v1/vistoriadores/:id/agenda:bulk-delete` | `{ ids[1..200] }`                       | `AGENDA.BULK_DELETED` |

Detalhes em [SPRINT-27-BE.md](../handoffs/SPRINT-27-BE.md).

### 2. RBAC fino na agenda

`@Controller("vistoriadores/:vistoriadorId/agenda")` agora aceita
`@Roles(ADMIN, GESTOR, VISTORIADOR)`. Validação fina vive em
`AgendaService.assertCanAccessAgendaOf(actor, vistoriadorId)`, chamada
em **todos** os métodos públicos (list/create/update/remove/bulk-\*).
Vistoriador puro só acessa `actor.id === vistoriadorId`. ADMIN/GESTOR
seguem irrestritos no tenant.

### 3. Endpoint `/metrics` Prometheus

Módulo novo `apps/api/src/metrics/`:

- `MetricsService` — `prom-client` com `Registry` isolado, default
  metrics do Node + `http_requests_total` (Counter) +
  `http_request_duration_seconds` (Histogram, buckets `[5ms..5s]`),
  `defaultLabels: { service: "vistoria-api" }`.
- `MetricsInterceptor` — `APP_INTERCEPTOR` global, mede latência via
  `process.hrtime.bigint()`, usa `req.route.path` (preserva
  placeholders `/users/:id`), ignora `/metrics` para evitar feedback loop.
- `MetricsController` — `@Public()` + `@ApiExcludeController()`, fora
  do prefix `/api`.

`main.ts`: `setGlobalPrefix("api", { exclude: ["health", "metrics"] })`.

Dependência nova: `prom-client@15.1.3` em `apps/api`.

### 4. Schemas Zod novos em `@vistoria/api-contracts/agenda`

`BulkBlockRequestSchema`, `BulkUpdateRequestSchema`,
`BulkDeleteRequestSchema`, `BulkOpResponseSchema` (+ types). Sem
breaking change — apenas adição. Build verde.

### 5. Unit tests

`agenda.service.spec.ts` ganha 3 blocos:

- **RBAC vistoriador (4 cases)** — listar a própria OK; alheia → 403
  sem tocar Prisma; ADMIN/GESTOR irrestritos; vistoriador-com-ADMIN
  bypass.
- **bulkBlock (4 cases)** — bloqueia só disponíveis; affectedCount=0
  quando nada cabe; rejeita `to<=from`; 403 alheia.
- **bulkUpdate (2 cases)** + **bulkDelete (2 cases)**.

`metrics.service.spec.ts` (novo): observa requests fake, valida texto
Prometheus contém métricas custom + defaults do Node.

## ADRs criados

Nenhum diretamente no S27; candidatos consolidados no SPRINT-30 DOC:

- Exposição do `/metrics` sem auth (network policy vs basic-auth).

## Breaking changes

Nenhum — endpoints aditivos; `/metrics` é ferramenta interna; RBAC
fica mais permissivo (vistoriador ganha, não tira).

## Métricas

- 3 endpoints novos.
- 1 dependência nova (`prom-client@15.1.3`).
- **78 testes em 9 suites** (era 64 em 8) — **+14 testes**.
- 3 DTOs novos no BE; 4 schemas Zod novos no contracts.
- 4 audit actions novas.

## Próximo sprint

**Sprint 28 — IN**: backlog herdado (port BE→IN para `consultar()`).
