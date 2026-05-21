---
agent: BE
sprint: "17"
date: 2026-05-21
---

# Handoff — Sprint 17 (BE) → Sprint 18 (IN)

## Resumo

BE entregou o backend do escopo novo pedido pelo produto:

1. **Users CRUD** — `POST/GET/PATCH/DELETE /api/v1/users` (ADMIN/GESTOR). Soft-delete por `active=false`. Hash de senha com bcrypt. Audit log para create/update/deactivate.
2. **AgendaSlot CRUD** — modelo Prisma novo `agenda_slots` + endpoints `POST/GET/PATCH/DELETE /api/v1/vistoriadores/:id/agenda[/(:slotId)]`. Slot serve a dois conceitos via flag `disponivel` (libera vs bloqueio). Sem integração com routing nesta sprint.
3. **Contratos** em `@vistoria/api-contracts/users` e `@vistoria/api-contracts/agenda`.
4. **Migration** `20260521120000_add_agenda_slot`.

Próximo agente é o **IN** (Sprint 18). Sem dependência direta de IN nesta sprint — IN pode atacar pendências cumuladas (eventos `vistoria.routed`, tenantId em `cancelar`, prep para integração futura entre routing e agenda).

## Entregas

### 1. Modelo Prisma `AgendaSlot`

[`apps/api/prisma/schema.prisma`](../../apps/api/prisma/schema.prisma):

```prisma
model AgendaSlot {
  id            String   @id @default(uuid()) @db.Uuid
  tenantId      String   @db.Uuid
  vistoriadorId String   @db.Uuid
  inicio        DateTime
  fim           DateTime
  disponivel    Boolean  @default(true)
  motivo        String?
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  ...
  @@index([tenantId, vistoriadorId, inicio])
  @@index([tenantId, inicio, fim])
  @@map("agenda_slots")
}
```

Migration em [`apps/api/prisma/migrations/20260521120000_add_agenda_slot/migration.sql`](../../apps/api/prisma/migrations/20260521120000_add_agenda_slot/migration.sql). Tenant + User ganham relações `agendaSlots[]`.

### 2. Módulo Users

Estrutura padrão: `users.module.ts` + `users.controller.ts` + `users.service.ts` + DTOs.

Endpoints:

| Método | Rota                | Body / Query                                             |
| ------ | ------------------- | -------------------------------------------------------- |
| POST   | `/api/v1/users`     | `{ email, name, password (min 8), roles[], active? }`    |
| GET    | `/api/v1/users`     | `?role=ROLE&active=bool&q=substring&page&pageSize`       |
| GET    | `/api/v1/users/:id` | —                                                        |
| PATCH  | `/api/v1/users/:id` | `{ name?, password?, roles?, active? }` — 1+ obrigatório |
| DELETE | `/api/v1/users/:id` | soft-delete (`active=false`)                             |

Comportamento:

- Tenant isolation: `actor.tenantId` em todas as queries; nunca expõe user de outro tenant.
- Hash de senha com `bcrypt.hash(..., 10)` (consistente com `AuthService` desde S07).
- Email duplicado no tenant → 409 (`@@unique([tenantId, email])` já existia).
- `q` faz busca case-insensitive em `email` OU `name` (Postgres `ILIKE`).
- `password` em update é opcional — quando omitido, hash anterior preservado.
- `deactivate(self)` → 403 (admin não pode se auto-desativar).
- Idempotente: `deactivate` num user já inativo retorna o mesmo user sem novo audit.
- Audit log: `USER.CREATED`, `USER.UPDATED` (after omite `passwordHash` — só registra `passwordChanged: bool`), `USER.DEACTIVATED`.

### 3. Módulo Agenda

Estrutura padrão. Controller com path `vistoriadores/:vistoriadorId/agenda` (controller agrupa subpaths).

Endpoints:

| Método | Rota                                       | Body / Query                                               |
| ------ | ------------------------------------------ | ---------------------------------------------------------- |
| POST   | `/api/v1/vistoriadores/:id/agenda`         | `{ slots: AgendaSlotInput[] }` — 1..200 slots (bulk)       |
| GET    | `/api/v1/vistoriadores/:id/agenda`         | `?from=&to=&disponivel=` — todos opcionais                 |
| PATCH  | `/api/v1/vistoriadores/:id/agenda/:slotId` | `{ inicio?, fim?, disponivel?, motivo? }` — 1+ obrigatório |
| DELETE | `/api/v1/vistoriadores/:id/agenda/:slotId` | 204                                                        |

Validações:

- `assertVistoriador()` valida em **toda** entrada que `vistoriadorId` é um User do tenant, ativo, com role `VISTORIADOR`. 404 se não existe; 400 se inativo ou role errada.
- `fim > inicio` validado tanto na criação (loop nos slots) quanto no patch (cobre o caso de patch só de `inicio` ou só de `fim`).
- Audit log: `AGENDA.SLOTS_CREATED` (com `slotIds[]` no `after`), `AGENDA.SLOT_UPDATED`, `AGENDA.SLOT_DELETED`.
- Ordenação default: `inicio ASC` (timeline natural).

### 4. Contratos compartilhados

[`packages/api-contracts/src/users/dto.ts`](../../packages/api-contracts/src/users/dto.ts):

- `UserSchema`, `CreateUserRequestSchema`, `UpdateUserRequestSchema`, `ListUsersQuerySchema`, `ListUsersResponseSchema`.
- `RoleSchema` reusado do `auth/login.ts`.

[`packages/api-contracts/src/agenda/dto.ts`](../../packages/api-contracts/src/agenda/dto.ts):

- `AgendaSlotSchema`, `AgendaSlotInputSchema` (com `.refine` validando `fim > inicio`), `CreateAgendaSlotsRequestSchema`, `UpdateAgendaSlotRequestSchema` (com `.refine` cruzado), `ListAgendaSlotsQuerySchema`, `ListAgendaSlotsResponseSchema`.

[`packages/api-contracts/src/index.ts`](../../packages/api-contracts/src/index.ts): re-exporta `./users` e `./agenda`.

### 5. Testes

- **Unit (`apps/api`)**: 49 testes (era 30). Suítes novas:
  - `users.service.spec.ts` — create (sucesso + 409), update (sucesso + 400 sem campos + 404), deactivate (sucesso + 403 auto + idempotente).
  - `agenda.service.spec.ts` — create (sucesso bulk + 400 fim<=inicio + 404 user + 400 sem role), list (ASC), update (sucesso + 400 sem campos + 404 + 400 fim novo), remove (sucesso + 404).
- **E2E (Playwright)**: [`e2e/users-and-agenda.spec.ts`](../../e2e/users-and-agenda.spec.ts) — 5 cenários:
  1. Users: cria + lista + patch + soft-delete + audit registra `USER.CREATED/UPDATED/DEACTIVATED`.
  2. Users: email duplicado no tenant → 409.
  3. Agenda: cria 2 slots + list ASC + patch + delete.
  4. Agenda: slot com `fim <= inicio` → 400.
  5. Agenda: usar usuário com role errada (GESTOR) → 400.
- Total Playwright passa de 21 para **26 testes**.

## Endpoints novos (resumo para README)

| Método | Rota                                       | Auth               |
| ------ | ------------------------------------------ | ------------------ |
| POST   | `/api/v1/users`                            | JWT (ADMIN/GESTOR) |
| GET    | `/api/v1/users`                            | JWT (ADMIN/GESTOR) |
| GET    | `/api/v1/users/:id`                        | JWT (ADMIN/GESTOR) |
| PATCH  | `/api/v1/users/:id`                        | JWT (ADMIN/GESTOR) |
| DELETE | `/api/v1/users/:id`                        | JWT (ADMIN/GESTOR) |
| POST   | `/api/v1/vistoriadores/:id/agenda`         | JWT (ADMIN/GESTOR) |
| GET    | `/api/v1/vistoriadores/:id/agenda`         | JWT (ADMIN/GESTOR) |
| PATCH  | `/api/v1/vistoriadores/:id/agenda/:slotId` | JWT (ADMIN/GESTOR) |
| DELETE | `/api/v1/vistoriadores/:id/agenda/:slotId` | JWT (ADMIN/GESTOR) |

## Database

- 1 migration nova: `20260521120000_add_agenda_slot`.
- Schema Prisma adicionou `AgendaSlot` + relações em Tenant e User.

## Eventos RMQ

Nenhum. O CRUD de users e agenda é puramente HTTP — não publica eventos. Routing decision do `ProviderRoutingService` segue desconectado da agenda (decisão de produto explícita para a Sprint 17).

## Breaking changes

Nenhum. Tudo é acréscimo. Endpoints existentes (`/auth`, `/vistorias`, `/audit-logs`, `/integrations/webhooks`) intocados.

## Métricas

- 14 arquivos novos em `apps/api/src/users/` + `apps/api/src/agenda/`.
- 4 arquivos novos em `packages/api-contracts/src/{users,agenda}/`.
- 1 migration nova.
- 1 spec E2E nova (5 cenários).
- 2 suítes unit novas (UsersService, AgendaService).
- Total: 49 unit (era 30), 26 E2E (era 21).
- 9 endpoints REST novos.
- 0 ADRs novos (decisões de produto tomadas via `AskUserQuestion` antes da implementação; não exigem ADR formal).

## Decisões táticas (sem ADR formal)

- **Slot único com flag `disponivel`** (em vez de tabelas separadas para libera/bloqueio) — escolha do produto. Vantagens: UI única no FE19; query simples no routing futuro (`WHERE disponivel = true AND inicio <= ? AND fim >= ?`). Desvantagem: precisa lembrar que `disponivel=false` é semanticamente "ocupado/bloqueado".
- **Auditoria de update omite `passwordHash` no `before`/`after`** — só registra `passwordChanged: bool`. Não vaza hash em audit log; útil para forense.
- **Auto-desativação proibida** — gestor poderia se trancar para fora do sistema. Mensagem clara: "peça a outro ADMIN".
- **`assertVistoriador` em toda chamada da agenda** — não fia que o caller passou ID correto; valida em tenant + active + role. Custa um query extra; aceitável para a segurança/UX (404 vs 500 silencioso).
- **`q` no list de users em vez de filtros separados por email/name** — UX simples, query única com OR + ILIKE. Pode evoluir para full-text search se virar dor.
- **Routing não consulta agenda** — decisão do produto. Quando virar pedido, port BE→IN ou cache em Redis pode resolver.

## Para outros agentes

### IN (Sprint 18)

Sem pendência direta da S17. Itens em aberto que IN pode atacar:

1. **Publicar `vistoria.routed`** — agent-sync da S13 segue válido. Fecha a única seta cinza do C4.
2. **`InternoProvider.cancelar(externalId)`** não conhece tenant — assinatura limitação herdada do `IVistoriaProvider`. Quando cancelamento via interno virar caso real, sync IN↔BE para atualizar a port.
3. **Prep para agenda no routing** — IN pode adicionar `vistoriadorId` opcional em `VistoriaRoutedEvent` e `AgendamentoDto` para quando o routing começar a consultar a agenda. Compatível com S17 BE (não usa ainda).

### FE (Sprint 19)

Telas novas a entregar:

1. **`/users`** — lista paginada com filtros por role, active, busca (`q`). Botão "Novo usuário" abre form modal/sheet com email, name, password, roles[], active.
2. **`/users/:id`** — detalhe + edit + soft-delete.
3. **`/vistoriadores/:id/agenda`** — calendário visual (semana/mês). Slot disponível em verde, bloqueado em cinza/vermelho. Click cria slot; arrastar redimensiona; click no slot abre edit (disponivel + motivo + horário).
4. (Opcional) **Atalho na sidebar/menu** para "Usuários" e "Agenda dos vistoriadores".

Sugestões técnicas:

- Reusar pattern de `feature/<nome>/{components,hooks,services}` (Sprint 04 FE).
- React Hook Form + Zod (`CreateUserRequestSchema`, `UpdateUserRequestSchema`).
- Calendário: avaliar `react-big-calendar` ou implementação simples baseada em grid CSS (semana × hora). Recharts não é o melhor fit; FullCalendar é overkill.

### DOC (Sprint 20)

- Consolidar changelogs SPRINT-16..19.
- Atualizar `c4-container.md` se IN18 publicar `vistoria.routed` (remover última seta cinza).
- Atualizar README com novos endpoints e telas.
- Considerar ADR sobre o modelo de slot com flag `disponivel` se ficar dúvida do "porquê não separar tabelas".

## Validação executada

| Comando                                       | Resultado                                          |
| --------------------------------------------- | -------------------------------------------------- |
| `pnpm typecheck`                              | ✅ 6 workspaces, 0 erros                           |
| `pnpm --filter @vistoria/api test`            | ✅ 7 suites, 49 testes (era 30)                    |
| `pnpm --filter @vistoria/api lint`            | ✅ 0 warnings                                      |
| `pnpm --filter @vistoria/api-contracts build` | ✅ dist atualizado (novos schemas Users + Agenda)  |
| `pnpm playwright test --list`                 | ✅ 26 testes em 6 arquivos (era 21)                |
| `pnpm test:e2e` (local)                       | ⚠️ Não executado (Docker fora). CI valida no push. |

## Known Issues

Herdadas (mantêm-se abertas):

1. **BE ainda não publica `vistoria.routed`** — não atacada nesta sprint (foco no escopo de produto).
2. **Refresh em `localStorage`** — vulnerável a XSS. ADR futuro.
3. **`InternoProvider.cancelar` sem tenantId** — assinatura da port.
4. **DLX já declarado** (S16) mas sem alarme em DLQ size > 0.
5. **Lint warning em `button.tsx`** — cosmético.

Novas desta sprint:

6. **Senha em texto plano no body do `POST /users` + `PATCH /users/:id`** — protegida apenas por HTTPS em prod. Para auditoria, body de request não é logado. Considere endpoint dedicado de reset/email-link em sprint futura.
7. **Sem endpoint público de auto-cadastro** — só ADMIN/GESTOR cria. Se cliente final precisar se inscrever, exige rota nova.
8. **Slot não detecta sobreposição** — `(inicio, fim)` pode sobrepor com outro slot do mesmo vistoriador sem rejeição. Aceitável para v1 (semântica "lista de slots" em vez de "schedule único contínuo"); se o produto pedir, validar overlapping no service.

## Próximo Sprint

**Sprint 18 — IN**: itens em aberto cumulados (vistoria.routed, tenantId em cancelar, prep agenda no routing). Pequeno em tamanho; pode rodar rápido.
