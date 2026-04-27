---
agent: BE
sprint: "02"
date: 2026-04-26
---

# SPRINT-02-BE — Handoff

## Resumo

Bootstrap do `apps/api` (NestJS 10): config tipada, observabilidade (pino + correlation-id), validação global, swagger em dev, health checks (db/redis/rabbitmq), auth JWT RS256 (com keys efêmeras em dev), Prisma schema multi-tenant + auditoria, publisher RabbitMQ placeholder.

## Itens Completos

- BE-001 — Scaffold do `apps/api` (package.json, tsconfig, nest-cli, eslint flat config consumindo `@vistoria/config`)
- BE-002 — `ConfigModule` global com validação Zod das env vars (falha rápida na inicialização)
- BE-003 — `main.ts` com `helmet`, `compression`, versioning URI, ValidationPipe (whitelist + forbidNonWhitelisted + transform), Swagger em `/api/docs` (apenas dev)
- BE-004 — `CorrelationIdMiddleware` aplicado a todas as rotas; logger Pino propaga `correlationId`
- BE-005 — `AllExceptionsFilter` global (responde com `{statusCode, message, error, correlationId, path, timestamp}`)
- BE-006 — `PrismaModule` global + `PrismaService` (lifecycle hooks)
- BE-007 — `MessagingModule` global + `RmqPublisher` (amqplib, exchange `vistoria.events` topic durable)
- BE-008 — `HealthModule` com 3 indicators customizados (`PrismaHealthIndicator`, `RedisHealthIndicator`, `RabbitMQHealthIndicator`), endpoints `GET /health` e `GET /health/liveness`
- BE-009 — `AuthModule` global: `JwtModule` + Passport `JwtStrategy`, `JwtGuard` e `RolesGuard` registrados via `APP_GUARD`, decorators `@Public()`, `@Roles(...)`, `@CurrentUser()`
- BE-010 — Geração de par RSA-2048 efêmero em dev quando `JWT_PRIVATE_KEY/JWT_PUBLIC_KEY` vazios; falha-rápida em produção
- BE-011 — Prisma schema mínimo: `Tenant`, `User`, `AuditLog` + enum `Role` (ADMIN, GESTOR, VISTORIADOR, CLIENTE, PARCEIRO)
- BE-012 — Smoke tests: `correlation-id.middleware.spec.ts` (3 cases) e `env.schema.spec.ts` (5 cases)

## Estrutura de Pastas Entregue

```
apps/api/
├── package.json, tsconfig.json, tsconfig.build.json, nest-cli.json
├── eslint.config.js, .env.example
├── prisma/
│   └── schema.prisma                    # Tenant, User, AuditLog, Role
└── src/
    ├── main.ts                           # bootstrap completo
    ├── app.module.ts                     # composição + middleware
    ├── config/
    │   ├── env.schema.ts                 # Zod + validateEnv()
    │   ├── config.module.ts
    │   └── typed-config.service.ts       # acesso tipado às env vars
    ├── common/
    │   ├── constants.ts
    │   ├── middleware/correlation-id.middleware.ts
    │   ├── logger/logger.config.ts       # pino-http + redact + pretty em dev
    │   └── filters/all-exceptions.filter.ts
    ├── auth/
    │   ├── auth.module.ts
    │   ├── jwt.strategy.ts
    │   ├── jwt-payload.interface.ts
    │   ├── keys.ts                       # resolveRsaKeyPair (dev efêmero)
    │   ├── guards/jwt.guard.ts           # respeita @Public()
    │   ├── guards/roles.guard.ts
    │   └── decorators/{public,roles,current-user}.decorator.ts
    ├── health/
    │   ├── health.module.ts
    │   ├── health.controller.ts          # GET /health, /health/liveness
    │   └── indicators/{prisma,redis,rabbitmq}.indicator.ts
    ├── infrastructure/
    │   ├── prisma/{prisma.module,prisma.service}.ts
    │   └── messaging/{messaging.module,rmq-publisher.service}.ts
    ├── domain/.gitkeep                   # reservado p/ entities + ports (BE Sprint 03)
    └── application/.gitkeep              # reservado p/ use-cases (BE Sprint 03)
```

## Endpoints Novos

| Método | Rota               | Auth          | Descrição                                         |
| ------ | ------------------ | ------------- | ------------------------------------------------- |
| GET    | `/health`          | Pública       | Status agregado de DB, Redis e RabbitMQ           |
| GET    | `/health/liveness` | Pública       | `{status:"ok"}` — uso interno do K8s/CI           |
| GET    | `/api/docs`        | Pública (dev) | Swagger UI (somente em `NODE_ENV !== production`) |

JWT obrigatório nas demais rotas (próximas a serem criadas) — guards já registrados globalmente como `APP_GUARD`. Use `@Public()` para opt-out.

## Eventos Novos

Nenhum publicado ainda. Infraestrutura pronta para BE Sprint 03:

- Exchange topic `vistoria.events` (durable) é declarada na inicialização do `RmqPublisher`
- `RmqPublisher.publish({ routingKey, payload, correlationId, headers })` é a interface única para emitir

## Variáveis de Ambiente Adicionadas

Em `apps/api/.env.example` (consumidas por Zod, falha-rápida se inválidas):

- `NODE_ENV`, `PORT` (3000), `LOG_LEVEL` (debug)
- `DATABASE_URL`, `REDIS_URL`
- `RABBITMQ_URL`, `RABBITMQ_EXCHANGE` (default `vistoria.events`)
- `SMTP_HOST`, `SMTP_PORT`
- `JWT_PRIVATE_KEY`, `JWT_PUBLIC_KEY` (vazios em dev → ephemeral RSA-2048)
- `JWT_ISSUER` (`vistoria-platform`), `JWT_AUDIENCE` (`vistoria-api`), `JWT_EXPIRES_IN` (`15m`)
- `SERVICE_NAME` (`vistoria-api`)

## Database Changes

- Migration **NÃO foi gerada** neste sprint (depende de Postgres acessível, ver "Known Issues").
- Schema Prisma definido em `apps/api/prisma/schema.prisma`:
  - `tenants` (id, slug, name, active, timestamps)
  - `users` (id, tenantId, email, name, passwordHash, roles[], active, timestamps; unique [tenantId, email]; indexed by tenantId)
  - `audit_logs` (id, tenantId, userId?, action, resourceType, resourceId?, before/after Json, correlationId, ip, userAgent; indexed by tenantId+createdAt e por resource)
  - enum `Role`: ADMIN, GESTOR, VISTORIADOR, CLIENTE, PARCEIRO

Próximo sprint deve rodar `pnpm --filter @vistoria/api prisma:migrate` para criar a migration inicial.

## Pendente Para Outros Agentes

### IN (Sprint 03 — agente próximo)

- Implementar `IVistoriaProvider` interface em `packages/integrations/` (ainda sem código no repo) com:
  - `agendar(dto): Promise<AgendamentoResult>`
  - `consultar(id): Promise<VistoriaStatus>`
  - `cancelar(id): Promise<void>`
  - `receberWebhook(payload): Promise<void>`
  - `healthCheck(): Promise<PartnerHealth>`
- Subscribers de eventos `vistoria.*` via amqplib OU `@nestjs/microservices` (preferimos amqplib direto pelo padrão já estabelecido no `RmqPublisher`)
- Aguardar BE liberar entidade `Vistoria` (não existe ainda) antes de adapters reais — neste sprint, IN pode focar em estrutura do pacote + Salesforce LWC base

### FE (Sprint 04)

- Consumir `GET /health` para tela de status interno (admin-only)
- Esperar BE entregar endpoints de auth (`POST /auth/login`, `POST /auth/refresh`) — não foram entregues neste sprint, ver "Próximos Passos do BE"

### QI (validação E2E)

- Atualizar CI: rodar `pnpm --filter @vistoria/api prisma:generate` antes do build
- Acrescentar job de migration check em CI: `pnpm --filter @vistoria/api prisma:deploy --dry-run` contra um Postgres ephemeral
- Smoke test E2E que dê `GET /health` contra o stack docker compose

### DOC

- Sync enviado em `docs/agent-sync/SPRINT-02-BE-TO-DOC.md` com decisões para virarem ADR

## Known Issues / Bloqueios

1. **Disco C: 100% cheio neste host** → `pnpm install` falhou com "No space left on device". Os arquivos de `apps/api/` estão escritos e corretos, mas `node_modules`, geração do client Prisma, typecheck e build NÃO foram validados localmente. Ações para o usuário:
   - Liberar espaço em C: (Docker Desktop WSL2 disk image, browser caches, %TEMP%)
   - Executar:
     ```bash
     pnpm install
     pnpm --filter @vistoria/api prisma:generate
     pnpm --filter @vistoria/api typecheck
     pnpm --filter @vistoria/api test
     pnpm --filter @vistoria/api build
     ```
   - O CI (Linux puro) não é afetado — primeiro push/PR validará a build em ambiente limpo.
2. **Docker compose stack do Sprint 01 ainda travado** (Postgres `initdb` hanging). Antes de rodar `prisma:migrate`, executar `wsl --shutdown` e reiniciar Docker Desktop, conforme handoff do QI.

## Próximos Passos do Próprio BE (Sprint 03)

1. Criar entidades de domínio em `src/domain/vistoria/`: `Vistoria`, `Imovel`, `Comodo`, `FotoVistoria`
2. Implementar máquina de estados SAGA (9 estados) com transições explícitas e validação de invariantes
3. `AuthService.login()` + `AuthService.refresh()` (com refresh tokens em Redis)
4. Repositórios Prisma com tenant scoping automático (extension Prisma `$extends({ query: ... })`)
5. Use cases: `CreateVistoriaUseCase`, `RouteVistoriaUseCase`, `ConcludeVistoriaUseCase`
6. Audit interceptor que escreve em `AuditLog` em toda mutação (`@Audit({resourceType})`)

## Breaking Changes

Nenhuma — primeiro entregável de BE.

## Decisões Que Viram ADR

Notificação enviada ao DOC em `docs/agent-sync/SPRINT-02-BE-TO-DOC.md`:

- ADR-003: Prisma vs TypeORM
- ADR-004: JWT RS256 (assimétrico) vs HS256 (simétrico)
- ADR-005: Validação de env via Zod vs class-validator
- ADR-006: amqplib direto vs `@nestjs/microservices` para publisher RMQ
