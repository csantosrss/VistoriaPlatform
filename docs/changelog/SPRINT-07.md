# Sprint 07 — Changelog

**Período**: 2026-05-19
**Agente solo**: BE
**Tema**: Auth real (login + me), CRUD de Vistorias paginado, endpoint de audit logs filtrado. As 3 dependências que o `apps/web` esperava desde o Sprint 04 e que o IN também precisa para integrações reais.

## Itens entregues

### Schemas compartilhados (`@vistoria/api-contracts`)

- `auth/login.ts` — `RoleSchema`, `AuthUserSchema`, `LoginRequestSchema`, `LoginResponseSchema`, `MeResponseSchema`.
- `vistoria/dto.ts` — `VistoriaSchema`, `CreateVistoriaRequestSchema`, `CancelVistoriaRequestSchema`, `ListVistoriasQuerySchema`, `ListVistoriasResponseSchema`. Reaproveita `StatusVistoriaSchema` e `TipoVistoriaSchema` já existentes.
- `audit/index.ts` — `AuditLogSchema`, `ListAuditLogsQuerySchema`, `ListAuditLogsResponseSchema`.
- Imports com `.js` explícito (regra ESM do pacote).

### Esquema Prisma + migration

- Migration `20260519014024_add_vistoria_entities`:
  - Enums `StatusVistoria` (9 valores da SAGA) e `TipoVistoria` (ENTRADA, SAIDA).
  - Model `Vistoria` com 22 campos: status (default SOLICITADA), tipo, endereço (7 campos), contato (3), atribuição (vistoriadorId, providerId), timestamps de SAGA (agendadoPara, concluidoEm, canceladoEm, canceladoMotivo), `tenantId`, `createdAt`, `updatedAt`. Índices `(tenantId, status)`, `(tenantId, createdAt)`, `(tenantId, vistoriadorId)`.
  - Model `VistoriaTransicao` (histórico das mudanças de estado) com `de/para`, `motivo`, `executadoPor`, `correlationId`.
  - Back-references em `Tenant` e `User` (`vistoriasAtribuidas`).
- ERD atualizado em [docs/architecture/erd.md](../architecture/erd.md).

### Seed de dev

- `apps/api/prisma/seed.ts` cria tenant `auxiliadora` + usuário `admin@auxiliadorapredial.com.br` (senha `admin123`, bcrypt). Idempotente via `upsert`. Acionado por `pnpm --filter @vistoria/api prisma:seed`. Configurado no `package.json` em `"prisma": { "seed": "..." }`.

### Módulos NestJS

- `auth/` — `AuthController` (POST `/api/v1/auth/login` público + GET `/api/v1/auth/me` autenticado), `AuthService` com bcrypt + JwtService, `dto/login.dto.ts` com class-validator.
- `vistorias/` — `VistoriasController` (`GET /api/v1/vistorias` paginado/filtrado, `GET /:id`, `POST /` cria em SOLICITADA, `POST /:id/cancelar` valida estados canceláveis), `VistoriasService` com `$transaction` para `Vistoria + VistoriaTransicao + AuditLog`.
- `audit-logs/` — `AuditLogsController` (GET com filtros: resourceType, resourceId, action, userId, intervalo). Restrito a `ADMIN` e `GESTOR` via `@Roles`.

### Bug crítico latente do JWT corrigido

- `auth/keys.ts`: `resolveRsaKeyPair` estava sendo chamado por `JwtModule.registerAsync` (signer) E por `JwtStrategy` (verifier) gerando **pares RSA diferentes** em cada chamada quando as env vars estavam vazias (dev). Resultado: todo token assinado era rejeitado na verificação. Não aparecia antes porque nenhum endpoint autenticado existia. Fix: cache `ephemeralCache` no escopo do módulo, gera uma vez por processo. Em produção (chaves do `.env`) o comportamento é inalterado.

### Testes

- `auth/auth.service.spec.ts` — 5 casos: login sucesso, usuário inexistente, usuário inativo, tenant inativo, senha errada (todos com mocks de Prisma + JwtService + Config).
- `vistorias/vistorias.service.spec.ts` — 4 casos: cancel em SOLICITADA, cancel em CONCLUIDA (409), cancel em EM_EXECUCAO (409), 404 quando não encontra.
- E2E (`e2e/auth-and-vistorias.spec.ts`) — 4 testes Playwright: login OK + /me, login com senha errada (401), /me sem token (401), ciclo completo Vistoria (create → list → cancel → cancel novamente 409 → audit registra `VISTORIA.CREATED` e `VISTORIA.CANCELED`).
- Total: 9 unit tests novos (17 totais passando em ~11s) + 4 e2e novos (6 totais passando em ~9s).

## Endpoints novos no Swagger (`http://localhost:3000/api/docs`)

| Método | Path                             | Auth               | Notas                                                                   |
| ------ | -------------------------------- | ------------------ | ----------------------------------------------------------------------- |
| POST   | `/api/v1/auth/login`             | —                  | Body `{ email, password }` → `{ access, expiresIn, user }`              |
| GET    | `/api/v1/auth/me`                | JWT                | Retorna `AuthUser` do token                                             |
| GET    | `/api/v1/vistorias`              | JWT                | Filtros: status, tipo, from, to, vistoriadorId; paginação page+pageSize |
| GET    | `/api/v1/vistorias/:id`          | JWT                | 404 fora do tenant                                                      |
| POST   | `/api/v1/vistorias`              | JWT                | Cria em SOLICITADA + transição + audit log                              |
| POST   | `/api/v1/vistorias/:id/cancelar` | JWT                | Estados SOLICITADA/ROTEADA/AGENDADA/CONFIRMADA. 409 nos demais          |
| GET    | `/api/v1/audit-logs`             | JWT (ADMIN/GESTOR) | Filtros: resourceType, resourceId, action, userId, intervalo            |

## ADRs criados

Nenhum nesta sprint. Decisões tomadas (sem rendimento de ADR, pois apenas implementam padrões já decididos):

- `bcryptjs` (não `bcrypt` nativo) — escolha pragmática para evitar problemas de compilação nativa no Windows do dev; performance suficiente para o cenário.
- DTOs HTTP em `class-validator` (ADR-005 já vigente).
- SAGA: criação inicia em `SOLICITADA`, cancel admite apenas estados pré-execução. Demais transições serão regradas por motor de roteamento em sprints futuros.

## Breaking changes

Nenhuma. Tudo é acréscimo. O JWT key fix corrige um bug latente que ainda não impactava nada em produção.

## Métricas

- 21 arquivos novos / +1k linhas (api-contracts + api modules + tests + seed + migration SQL)
- 17 unit tests passando (era 8) / 6 e2e passando (era 2)
- 1 migration (Prisma)
- 1 dependência runtime nova: `bcryptjs` (+ `@types/bcryptjs`)
- 5 endpoints REST novos + 2 refinamentos no health

## Known issues encerrados

- **Bug latente do JWT em dev** — par RSA ephemeral diferente entre signer e verifier. Antes nunca disparava porque não havia rota autenticada. Resolvido com cache em `resolveRsaKeyPair`.
- **`nest start --watch` ainda emite incompleto às vezes**: convivendo com `deleteOutDir: false` (Sprint 06). Quando ataca, basta `pnpm --filter @vistoria/api build && pnpm --filter @vistoria/api start` para destravar. Será endereçado pelo QI no próximo loop.

## Pedidos abertos

Detalhados no [SPRINT-07-BE.md](../handoffs/SPRINT-07-BE.md). Resumo:

- **IN (Sprint 08)**: webhook handlers reais a partir do controller de webhooks já existente; provider routing real para escolher `Vistoria.providerId`; eventual normalização de status do parceiro alimentando `VistoriaTransicao`.
- **FE (Sprint 09)**: telas plugando nos endpoints novos (login real, lista de Vistorias, detalhe, criação, audit).
- **QI (Sprint 10)**: investigar flakiness do `nest start --watch` num PR isolado.
- **DOC (Sprint 11)**: novo loop de consolidação após IN/FE entregarem; ADR para a estratégia de refresh-token quando for o caso.

## Próximo sprint

**Sprint 08 — IN**: integrar os providers reais (Rede Vistorias, Conceitual) à SAGA, processar webhooks de status e gravar `VistoriaTransicao`. Detalhes no handoff.
