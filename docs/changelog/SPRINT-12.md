# Sprint 12 — Changelog

**Período**: 2026-05-20
**Agente solo**: BE
**Tema**: Fechar os 5 pendentes herdados de QI11. BE passa a consumir o evento que IN publica desde S08, aplica routing inline na criação de Vistoria, entrega timeline da SAGA, refresh token e endpoint agregado de stats.

## Itens entregues

### 1. Routing inline em `VistoriasService.create`

[`apps/api/src/vistorias/vistorias.service.ts`](../../apps/api/src/vistorias/vistorias.service.ts):

- Antes da `$transaction`, chama `routing.decide({ tenantId, tipo, enderecoUf, enderecoCidade })` para obter `{ providerId, reason }`.
- Dentro da transação: cria vistoria **direto em `ROTEADA`** com `providerId` preenchido; `vistoriaTransicao.createMany` insere `null → SOLICITADA` e `SOLICITADA → ROTEADA` (com `motivo = reason`); `auditLog.createMany` insere `VISTORIA.CREATED` + `VISTORIA.ROUTED`.
- `ProviderRoutingService` é registrado como **provider local** de `VistoriasModule` (não tem deps de construtor; instância paralela à do `IntegrationsModule` é trivial). Evita globalizar `IntegrationsModule.forRoot()`.

### 2. Handler RMQ `vistoria.status.changed`

[`apps/api/src/vistorias/handlers/vistoria-status-changed.handler.ts`](../../apps/api/src/vistorias/handlers/vistoria-status-changed.handler.ts):

- `@OnModuleInit` → `subscriber.subscribe('vistoria.status.changed', handle)`.
- Valida payload com `VistoriaStatusChangedEventSchema` (novo em `@vistoria/api-contracts`).
- **Idempotência**: compara `current.status === event.newStatus` — descarta com log se já está no destino.
- **Guard terminal**: bloqueia transições partindo de `CONCLUIDA`/`CANCELADA` com warn.
- Update + `vistoriaTransicao.create` (com `motivo = event.motivo ?? source=${source}`, `correlationId`) + `auditLog.create` (`action = VISTORIA.STATUS_CHANGED`, `userId = null`, `correlationId`).

Subscriber **local** em [`apps/api/src/infrastructure/messaging/rmq-subscriber.service.ts`](../../apps/api/src/infrastructure/messaging/rmq-subscriber.service.ts) — espelha o do `@vistoria/integrations` com fila própria `apps-api.events` (binding `vistoria.#`). Preserva a fronteira IN↔BE — IN publica, BE consome, sem cross-import de módulos NestJS dinâmicos.

### 3. `GET /vistorias/:id/transicoes`

[`apps/api/src/vistorias/vistorias.controller.ts`](../../apps/api/src/vistorias/vistorias.controller.ts):

- Verifica que a vistoria existe no tenant; devolve transições ordenadas `createdAt ASC`.
- Contrato `ListVistoriaTransicoesResponseSchema` em `@vistoria/api-contracts/vistoria/transicao`.

### 4. `POST /auth/refresh` + refresh no login (ADR-014)

[`apps/api/src/auth/auth.service.ts`](../../apps/api/src/auth/auth.service.ts):

- `issueTokens()` privado emite **ambos** os tokens em paralelo com claim `type: "access" | "refresh"`.
- `login()` agora devolve `{ access, expiresIn, refresh, refreshExpiresIn, user }`.
- `refresh(input)` verifica o JWT (`verifyAsync`), rejeita `type !== "refresh"`, faz DB lookup de usuário/tenant ativo e devolve **par novo** (rotação completa).
- Stateless, sem revogação — trade-off documentado em [ADR-014](../decisions/ADR-014-refresh-token-stateless.md).

Env nova: `JWT_REFRESH_EXPIRES_IN` (default `7d`) em [`apps/api/src/config/env.schema.ts`](../../apps/api/src/config/env.schema.ts) e [`apps/api/.env.example`](../../apps/api/.env.example).

### 5. `GET /vistorias/stats`

- `prisma.vistoria.groupBy({ by: ['status'], where: { tenantId }, _count: { _all: true } })`.
- Pre-inicializa `byStatus` com **todos os 9 status em 0** para o FE não precisar fazer defensive coding.
- Contrato `VistoriaStatsResponseSchema` em `@vistoria/api-contracts/vistoria/stats`.
- Rota registrada **antes** de `/:id` no controller (ordem importa no NestJS).

### Contratos compartilhados

Adições em `@vistoria/api-contracts`:

- `vistoria/transicao.ts` — `VistoriaTransicaoSchema`, `ListVistoriaTransicoesResponseSchema`.
- `vistoria/stats.ts` — `VistoriaStatsResponseSchema`.
- `vistoria/events.ts` — `VistoriaStatusChangedEventSchema` (espelha o shape do `VistoriaStatusUpdate` que IN publica).
- `auth/refresh.ts` — `RefreshRequestSchema`, `RefreshResponseSchema`.
- `auth/login.ts` — `LoginResponseSchema` ganhou `refresh` e `refreshExpiresIn` (minor breaking — FE strict-parser quebraria se ficar dessincronizado; resolvido com Sprint 14 FE).

## Endpoints novos

| Método | Rota                               | Auth                      | Mudança                         |
| ------ | ---------------------------------- | ------------------------- | ------------------------------- |
| POST   | `/api/v1/auth/refresh`             | público (refresh próprio) | Rotaciona o par access/refresh. |
| GET    | `/api/v1/vistorias/stats`          | JWT                       | Agregado `{ total, byStatus }`. |
| GET    | `/api/v1/vistorias/:id/transicoes` | JWT                       | Timeline ordenada ASC.          |

Mudança no existente: `POST /api/v1/vistorias` agora retorna `status: "ROTEADA"` + `providerId` preenchido (era `SOLICITADA` + `null`). `POST /api/v1/auth/login` agora retorna 2 campos a mais (`refresh`, `refreshExpiresIn`).

## Eventos RMQ

- **Novo consumer**: `vistoria.status.changed` no `apps/api` (fila `apps-api.events`, binding `vistoria.#`). Fecha o loop iniciado pelo IN em S08.

## Database

Sem migration nova — Vistoria/VistoriaTransicao/AuditLog já existiam (S07).

## ADRs criados

- **ADR-014** — [Refresh token stateless com claim `type`](../decisions/ADR-014-refresh-token-stateless.md): JWT RS256 stateless, sem persistência server-side, sem revogação imediata. Rotação completa por refresh. Trade-off explícito; ADR futuro endereça cookie httpOnly + outbox/redis.

## Testes

- **Unit (apps/api)**: 30 testes (era 12). Cobertura nova: routing na criação (rede-vistorias + interno para SAIDA), `stats` (preenchimento com zeros), `listTransicoes` (200 e 404), `refresh` (sucesso + type errado + expirado + inativo), handler (transição válida + idempotência + terminal bloqueado + payload inválido).
- **E2E (Playwright)**: spec `auth-and-vistorias.spec.ts` ganhou 5 cenários (refresh feliz, refresh inválido, refresh com access, `/stats`, `/transicoes`) e atualizou os existentes (status pós-create = ROTEADA, audit inclui VISTORIA.ROUTED). Total: 20 testes (era 15). `e2e/admin-ui.spec.ts` ajustou badge para "Roteada".

## Breaking changes

- `POST /auth/login` agora retorna 2 campos a mais (`refresh`, `refreshExpiresIn`). FE da Sprint 09 ignora — efeito real só a partir da S14.
- `POST /vistorias` agora retorna `status: "ROTEADA"` + `providerId` preenchido. Quebra qualquer cliente que dependa de `SOLICITADA` imediatamente após criar. E2E foi atualizado; painel admin se ajusta automaticamente.
- `LoginResponseSchema` ganhou 2 campos `z.string().min(20)` obrigatórios. Minor por convenção (`packages/api-contracts/CLAUDE.md`); FE strict-parser quebraria se ficar dessincronizado — resolvido na S14.

## Métricas

- 25 arquivos commitados, +1456 / −95 LoC
- 30 unit tests (era 12), 20 E2E (era 15)
- 3 endpoints novos + 1 evento consumido
- 1 ADR (ADR-014)
- 4 schemas novos em `api-contracts` (transicao, stats, events, refresh)

## Decisões táticas (sem ADR)

- `ProviderRoutingService` como provider local em `VistoriasModule` (sem deps no construtor; instância paralela trivial). Evita globalizar `IntegrationsModule.forRoot()` que é território IN.
- Subscriber próprio em `apps/api` (fila `apps-api.events`) em vez de reusar o `RmqSubscriber` do `@vistoria/integrations`. Filas separadas com bindings sobrepostos é padrão recomendado para RMQ.
- `createMany` em transições/audit logs do create para reduzir roundtrips mantendo atomicidade.
- Audit `VISTORIA.STATUS_CHANGED` com `userId = null` — eventos do broker não têm ator humano. Adicionado `_source` e `_motivo` no campo `after` para auditoria forense.

## Known issues que ficam de pé

1. **Refresh stateless sem revogação** — ver ADR-014. Trade-off documentado.
2. **Vistorias antigas com `status = "SOLICITADA"`** ficam em backlog (criadas antes da S12). Sem migration retroativa.
3. **Reentrada na SAGA bloqueada por estado terminal** — handler bloqueia transições saindo de `CONCLUIDA`/`CANCELADA`. Se o produto quiser reabrir, mexer no guard (também impacta o `cancel`).
4. **Sem `RABBITMQ_URL`** → subscriber no-op, paralelo ao writer. Aceitável em dev sem stack.
5. **DLX em produção** — pendente desde Sprint 03.

## Pedidos abertos

Detalhados em [SPRINT-12-BE.md](../handoffs/SPRINT-12-BE.md):

- **IN (Sprint 13)**: avaliar idempotência no writer (dedup por `eventId`), implementar `agendar()` real do `interno`, decidir se vai consumir `VISTORIA.ROUTED` para disparar `agendar()`.
- **FE (Sprint 14)**: refresh transparente, timeline da SAGA, dashboard via `/stats`, KPI "Roteadas".
- **DOC (Sprint 15)**: consolidar changelogs 11–14, ADR-014 no índice, atualizar `c4-container.md`.

## Próximo sprint

**Sprint 13 — IN**: 3 itens (eventId no writer, `InternoProvider` funcional, orchestrator `vistoria.routed`).
