# Sprint 17 — Changelog

**Período**: 2026-05-21
**Agente solo**: BE
**Tema**: Atender o pedido de produto registrado ao fim do ciclo 3 — gestão de usuários + agenda dos vistoriadores.

## Itens entregues

### Users CRUD

[`apps/api/src/users/`](../../apps/api/src/users/) — controller + service + 3 DTOs:

| Método | Rota                | Comportamento                                                |
| ------ | ------------------- | ------------------------------------------------------------ |
| POST   | `/api/v1/users`     | body: email, name, password (min 8), roles[], active?        |
| GET    | `/api/v1/users`     | query: role, active, q (email/name), page, pageSize          |
| GET    | `/api/v1/users/:id` | detalhe                                                      |
| PATCH  | `/api/v1/users/:id` | body parcial (name, password, roles, active); ≥1 obrigatório |
| DELETE | `/api/v1/users/:id` | soft-delete (active=false); 403 se actor.id === id           |

Comportamento: tenant isolation em todas as queries, `bcrypt.hash(..., 10)`, 409 em email duplicado, idempotência em `deactivate`, audit log `USER.CREATED/UPDATED/DEACTIVATED` (passwordHash nunca vaza — só `passwordChanged: bool` no `before`).

Sob `@Roles(ADMIN, GESTOR)` no controller.

### AgendaSlot CRUD

[`apps/api/src/agenda/`](../../apps/api/src/agenda/) — controller + service + 3 DTOs. Migration `20260521120000_add_agenda_slot`.

Modelo Prisma `AgendaSlot { id, tenantId, vistoriadorId, inicio, fim, disponivel, motivo?, createdAt, updatedAt }`. Índices em `(tenantId, vistoriadorId, inicio)` e `(tenantId, inicio, fim)`. Relações em `User` e `Tenant`.

| Método | Rota                                       | Comportamento                                                 |
| ------ | ------------------------------------------ | ------------------------------------------------------------- |
| POST   | `/api/v1/vistoriadores/:id/agenda`         | body: `{ slots: AgendaSlotInput[] }` — bulk 1..200            |
| GET    | `/api/v1/vistoriadores/:id/agenda`         | query: from, to, disponivel (todos opcionais); ASC por inicio |
| PATCH  | `/api/v1/vistoriadores/:id/agenda/:slotId` | parcial; ≥1 campo obrigatório; valida fim > inicio cruzado    |
| DELETE | `/api/v1/vistoriadores/:id/agenda/:slotId` | 204                                                           |

Validações:

- `assertVistoriador()` garante que `:id` é User do tenant, ativo, com role `VISTORIADOR`. 404/400 conforme caso.
- `fim > inicio` validado no create (loop) e no patch (cruzado quando só inicio ou só fim mudam).
- Audit log: `AGENDA.SLOTS_CREATED` (com `slotIds[]`), `AGENDA.SLOT_UPDATED`, `AGENDA.SLOT_DELETED`.

Slot serve aos dois conceitos via flag `disponivel`: `true` = janela LIVRE (default — routing futuro escolhe nestes), `false` = bloqueio (férias, plantão, indisp.).

### Contratos compartilhados

`@vistoria/api-contracts/users` e `/agenda` — schemas Zod completos (Create/Update/List/Response + AgendaSlotInput com `.refine` de `fim > inicio`).

### Testes

- 49 unit (era 30). Suítes novas: `users.service.spec.ts` (8), `agenda.service.spec.ts` (10).
- 26 E2E (era 21). Spec novo `users-and-agenda.spec.ts` com 5 cenários.

## Endpoints novos

9 endpoints REST. Routing decision do `ProviderRoutingService` segue **desconectado da agenda** (decisão de produto explícita).

## Database

- 1 migration nova.
- Tabela `agenda_slots` + relações em `tenants` e `users`.

## ADRs criados

Nenhum. Decisões de produto fechadas via `AskUserQuestion` antes da implementação (permissão ADMIN/GESTOR, slot com flag `disponivel`, sem integração com routing nesta sprint). Não exigem ADR formal.

## Breaking changes

Nenhum. Endpoints existentes (`/auth`, `/vistorias`, `/audit-logs`, `/integrations/webhooks`) intocados.

## Métricas

- 14 arquivos novos em `apps/api/src/{users,agenda}/`.
- 4 arquivos novos em `packages/api-contracts/src/{users,agenda}/`.
- 1 migration.
- 49 unit (era 30), 26 E2E (era 21).
- 9 endpoints REST novos.

## Decisões táticas (sem ADR)

- Slot único com flag `disponivel` (decisão de produto). UI v1 mais simples; routing futuro: `WHERE disponivel = true AND inicio <= ? AND fim >= ?`.
- Audit omite hash de senha do `before`/`after`; registra `passwordChanged: bool`.
- Auto-desativação bloqueada com 403.
- `assertVistoriador` em toda chamada da agenda — não confia que o caller passou ID correto.

## Known issues que ficam de pé

1. BE ainda não publica `vistoria.routed`.
2. Refresh em `localStorage`.
3. Senha em texto plano no body do `POST /users` + `PATCH /users/:id` — protegida por HTTPS em prod; sem audit do body.
4. Sem endpoint público de auto-cadastro.
5. Slot não detecta sobreposição — aceitável v1.

## Próximo sprint

**Sprint 18 — IN**: ajustes forward-compat para futura integração routing↔agenda.
