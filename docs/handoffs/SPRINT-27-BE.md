---
agent: BE
sprint: "27"
date: 2026-05-26
---

# Handoff — Sprint 27 (BE) → Sprint 28 (IN)

## Resumo

BE entregou tudo que o QI Sprint 26 pediu para destravar a agenda nova do FE
(Sprint 29) e iniciar a esteira de observabilidade.

1. **3 bulk endpoints da agenda** — `bulk-block`, `bulk-update`, `bulk-delete`,
   todos atómicos em `$transaction`, com audit log, respondendo
   `{affectedCount, ids, excluded?}`.
2. **RBAC fino na agenda** — `VISTORIADOR` agora pode listar/criar/atualizar/
   remover/operar em massa **a própria** agenda. ADMIN/GESTOR seguem
   irrestritos. Defesa em profundidade em todos os métodos do service.
3. **Endpoint `/metrics`** Prometheus exposto sem prefixo `/api`, com default
   metrics do Node + `http_requests_total` + `http_request_duration_seconds`
   (interceptor global).

Próximo agente é o **IN** (Sprint 28).

## Entregas

### 1. Schemas Zod novos em `@vistoria/api-contracts`

[`packages/api-contracts/src/agenda/dto.ts`](../../packages/api-contracts/src/agenda/dto.ts):

- `BulkBlockRequestSchema` `{ from, to, motivo? }` + refine `to > from`.
- `BulkUpdateRequestSchema` `{ ids[1..200], disponivel?, motivo? }` + refine
  exige ao menos um dos dois campos mutáveis.
- `BulkDeleteRequestSchema` `{ ids[1..200] }`.
- `BulkOpResponseSchema` `{ affectedCount, ids, excluded? }` (excluded
  contém `{id, reason}` para slots fora do tenant, já bloqueados, etc.).

Sem breaking change — apenas adição. Build verde.

### 2. DTOs class-validator no BE

[`apps/api/src/agenda/dto/`](../../apps/api/src/agenda/dto/):

- `bulk-block-agenda.dto.ts`
- `bulk-update-agenda.dto.ts`
- `bulk-delete-agenda.dto.ts`

Espelham os schemas Zod usando `class-validator` (padrão do BE). Limites
de 200 IDs aplicados via `ArrayMaxSize`.

### 3. AgendaService — RBAC + 3 métodos bulk

[`apps/api/src/agenda/agenda.service.ts`](../../apps/api/src/agenda/agenda.service.ts):

- **`assertCanAccessAgendaOf(actor, vistoriadorId)`** — novo helper. Bloqueia
  com 403 se actor é `VISTORIADOR` puro e `actor.id != vistoriadorId`. Vale
  para ADMIN/GESTOR como bypass. Chamado em todos os métodos públicos
  (`list`, `create`, `update`, `remove`, e os 3 bulk).
- **`bulkBlock(actor, vistoriadorId, {from,to,motivo?})`** — `findMany`
  candidates dentro de `[from,to]` (slot inteiramente dentro), `updateMany`
  só os disponíveis. Slots já bloqueados retornam em
  `excluded: [{id, reason: "already-blocked"}]`. Audit `AGENDA.BULK_BLOCKED`.
- **`bulkUpdate(actor, vistoriadorId, {ids, disponivel?, motivo?})`** —
  `findMany` para descobrir quais IDs realmente pertencem ao tenant+vistoriador,
  `updateMany` neles. IDs fora viram `excluded: [{id, reason: "not-found"}]`.
  Audit `AGENDA.BULK_UPDATED`.
- **`bulkDelete(actor, vistoriadorId, {ids})`** — mesma lógica, com
  `deleteMany`. Audit `AGENDA.BULK_DELETED`.

Todos os 3 bulk usam `$transaction` — se a etapa de audit falhar, o
update/delete também faz rollback.

### 4. AgendaController — 3 rotas novas + roles ajustado

[`apps/api/src/agenda/agenda.controller.ts`](../../apps/api/src/agenda/agenda.controller.ts):

- `@Roles(ADMIN, GESTOR, VISTORIADOR)` no controller (era ADMIN/GESTOR só).
  Comentário no header explica que a validação fina vive no service.
- `POST   /api/v1/vistoriadores/:id/agenda:bulk-block` → 200 `BulkOpResponse`.
- `POST   /api/v1/vistoriadores/:id/agenda:bulk-update` → 200 `BulkOpResponse`.
- `DELETE /api/v1/vistoriadores/:id/agenda:bulk-delete` → 200 `BulkOpResponse`.
- Swagger: `@ApiOperation`, `@ApiOkResponse`, `@ApiForbiddenResponse`.

### 5. Observabilidade — endpoint `/metrics`

Módulo novo [`apps/api/src/metrics/`](../../apps/api/src/metrics/):

- `MetricsService` — `Registry` isolado do `prom-client`, default metrics +
  2 métricas custom (`http_requests_total` Counter,
  `http_request_duration_seconds` Histogram com buckets `[5ms..5s]`).
  `defaultLabels: { service: "vistoria-api" }`.
- `MetricsInterceptor` — `APP_INTERCEPTOR` global, mede latência via
  `process.hrtime.bigint()`, usa `req.route.path` (preserva placeholders
  tipo `/users/:id`), ignora `/metrics` para evitar feedback loop.
- `MetricsController` — `@Public()` + `@ApiExcludeController()`, header
  `text/plain; version=0.0.4`, retorna `registry.metrics()`.
- `main.ts`: `setGlobalPrefix("api", { exclude: ["health", "metrics"] })`.

Dependência nova: `prom-client@15.1.3` em `apps/api`.

Pronto para o Prometheus que o QI subiu no docker-compose Sprint 26 fazer
scrape em `host.docker.internal:3000/metrics`.

### 6. Unit tests

- `agenda.service.spec.ts` ganha **3 novos blocos** (`describe`):
  - `RBAC vistoriador (Sprint 27)`: 4 cases — listar a própria agenda OK,
    bloquear acesso alheio (sem tocar Prisma), ADMIN/GESTOR irrestritos,
    vistoriador-com-role-ADMIN-extra bypass.
  - `bulkBlock`: 4 cases — bloqueia só disponíveis, affectedCount=0 quando
    nada cabe, rejeita `to<=from`, 403 quando vistoriador tenta alheia.
  - `bulkUpdate`: 2 cases — patch só nos IDs do tenant; rejeita quando
    nenhum campo mutável vem.
  - `bulkDelete`: 2 cases — remove só os do tenant; affectedCount=0 quando
    nada bate.
- `metrics.service.spec.ts` (novo): observa requests fake, valida que o
  texto Prometheus contém as métricas custom + defaults do Node.

## Mudanças que tocam o usuário

Nenhuma — endpoints novos são aditivos, o `/metrics` é ferramenta interna.
RBAC fica mais permissivo (VISTORIADOR ganha acesso à própria agenda) mas
não revoga nada.

## Para outros agentes

### IN (Sprint 28)

Nada novo da agenda — bulk endpoints são internos e não disparam eventos
de SAGA. Mantém o backlog herdado do S25:

- Dedup-by-eventId no consumer quando reabertura virar real (ADR-015).
- Port BE→IN para `consultar()` do `InternoProvider`.

### FE (Sprint 29)

Pode finalmente entregar a tela de calendário (que o produto pediu na
sessão atual). Endpoints novos disponíveis:

```ts
// Novo: bloqueio de período inteiro (substitui N PATCHes)
POST /api/v1/vistoriadores/:id/agenda:bulk-block
  { from: ISO, to: ISO, motivo?: string }
  → 200 { affectedCount, ids, excluded? }

// Novo: ação em massa por IDs (substitui N PATCHes em ações em massa do drawer)
POST /api/v1/vistoriadores/:id/agenda:bulk-update
  { ids: uuid[1..200], disponivel?, motivo? }
  → 200 { affectedCount, ids, excluded? }

// Novo: remoção em massa por IDs
DELETE /api/v1/vistoriadores/:id/agenda:bulk-delete
  { ids: uuid[1..200] }
  → 200 { affectedCount, ids, excluded? }
```

Tipos prontos em `@vistoria/api-contracts`:
`BulkBlockRequest`, `BulkUpdateRequest`, `BulkDeleteRequest`, `BulkOpResponse`.

**Rota `/agenda` para o vistoriador logado**: RBAC liberado no BE.
Quando o user tem role `VISTORIADOR` (e nada mais), só `actor.id` é
aceito como `vistoriadorId`. FE pode usar `useMe()` + montar a URL
`/vistoriadores/${me.id}/agenda` direto.

Destravar os `test.fixme()` no `e2e/agenda-calendar-ui.spec.ts` à medida
que entrega cada caso.

### DOC (Sprint 30)

- ADR sobre exposição do `/metrics` (sem auth na rede interna vs network
  policy). Texto sugerido nos comentários do `MetricsController`.
- Atualizar `c4-container.md`: container `apps/api` ganha `Metrics`,
  Prometheus aponta para ele.
- README raiz: + 3 endpoints bulk + endpoint `/metrics`.
- Validar handoffs Sprint 26..29.

## Validação executada

| Comando                                           | Resultado                                                                                                                                               |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm --filter @vistoria/api-contracts typecheck` | ✅                                                                                                                                                      |
| `pnpm --filter @vistoria/api-contracts build`     | ✅                                                                                                                                                      |
| `pnpm --filter @vistoria/api typecheck`           | ✅                                                                                                                                                      |
| `pnpm --filter @vistoria/api lint`                | ✅                                                                                                                                                      |
| `pnpm --filter @vistoria/api test`                | ✅ **78 testes em 9 suites** (era 64 em 8).                                                                                                             |
| `pnpm --filter @vistoria/web typecheck`           | ✅ (contracts não quebrou consumer)                                                                                                                     |
| `pnpm --filter @vistoria/api-contracts test`      | ⚠️ falha **preexistente** sem relação com este sprint (`webhooks.spec.ts` não resolve `./rede-vistorias.js` — config Jest do package, não toquei nele). |

## Known Issues

Cumulativos:

1. BE ainda não publica `vistoria.routed` — agent-sync S13 segue.
2. Refresh em `localStorage`.
3. DLX declarado, sem alarme em DLQ size > 0 (agora destravável com `/metrics` em pé).
4. Sem dedup-by-eventId.
5. Slot da agenda não detecta sobreposição (não tocado nesta sprint).
6. Sem testes unitários de Users/Agenda/Cobertura no FE.
7. Senha em texto plano em `POST /users`.
8. `event-flow.md` desatualizado.
9. Lint warning em `button.tsx`.
10. Cidade/bairro como strings livres no BE.
11. IBGE pode estar fora do ar — FE faz fallback parcial.
12. Lista de coberturas no FE não tem confirm para deletar.
13. **(Resolvido)** ~~`/metrics` ainda não existe~~ → entregue nesta sprint.
14. **(Resolvido)** ~~Bulk endpoints da agenda ainda não existem~~ → entregues nesta sprint.

Novas:

15. **Test runner do `api-contracts` está quebrado** (`Cannot find module './rede-vistorias.js'`). Preexistente — não bloqueia builds. Candidato a issue separada (config `ts-jest` precisa resolver `.js` em TS source).
16. **`/metrics` sem auth** — aceitável em rede interna; ADR pendente no DOC Sprint 30 para decidir se entra `basic-auth` ou network policy.

## Próximo Sprint

**Sprint 28 — IN**: trabalho herdado do S25 (dedup-by-eventId, port
`consultar()` do `InternoProvider`). Nada novo da agenda.
