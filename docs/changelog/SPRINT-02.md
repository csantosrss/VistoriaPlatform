# Sprint 02 — Changelog

**Período**: 2026-04-26
**Agente solo**: BE
**Commits**:

- `2e0d602` — `feat(api): NestJS bootstrap + auth + health + prisma schema [sprint-02-be]`
- `a55749f` — `fix(api): make typecheck/lint pass — terminus v10 API + jest types [sprint-02-be]`

## Tema

Bootstrap do `apps/api`: NestJS 10 + Prisma + auth JWT RS256 + observabilidade (pino + correlation-id) + health checks.

## Itens entregues

### Scaffold

- `apps/api/package.json` (NestJS 10 + Prisma 5 + pino + Zod + amqplib + ioredis)
- `tsconfig.json` extends `@vistoria/config/tsconfig/node.json`
- `eslint.config.mjs` (flat config, consume `@vistoria/config/eslint/node`)
- `nest-cli.json`, `tsconfig.build.json`, `.env.example`

### Bootstrap

- `main.ts` — `helmet`, `compression`, URI versioning, `ValidationPipe` (whitelist + forbidNonWhitelisted + transform), Swagger em `/api/docs` (apenas dev), shutdown hooks
- `CorrelationIdMiddleware` aplicado a todas as rotas
- `AllExceptionsFilter` global (resposta com `{statusCode, message, error, correlationId, path, timestamp}`)

### Config

- `env.schema.ts` — Zod com 13 vars (NODE*ENV, PORT, DATABASE_URL, REDIS_URL, RABBITMQ_URL, JWT*_, SMTP\__, etc), falha-rápida em `validateEnv`
- `TypedConfigService` para acesso tipado

### Logger

- nestjs-pino + redact (authorization, cookie, password, token), `pino-pretty` em dev, `correlationId` em todos os logs

### Auth (JWT RS256)

- `AuthModule` global + Passport `JwtStrategy`
- `JwtGuard` (respeita `@Public()`) e `RolesGuard` registrados via `APP_GUARD`
- Decorators `@Public`, `@Roles(...)`, `@CurrentUser()`
- `keys.ts` — gen RSA-2048 efêmero em dev quando vars vazias; falha-rápida em produção

### Health

- `HealthModule` com 3 indicators custom: `PrismaHealthIndicator` (`SELECT 1`), `RedisHealthIndicator` (`PING`), `RabbitMQHealthIndicator` (connect+close)
- Endpoints `GET /health` (agregado) e `GET /health/liveness` (200 simples)

### Prisma

- `schema.prisma` com `Tenant`, `User` (com `Role[]` enum), `AuditLog`
- Constraints: unique `[tenantId, email]` em users; índices por tenant + tipo de recurso
- `PrismaModule` global + `PrismaService` (lifecycle hooks)

### Messaging

- `RmqPublisher` (amqplib) — exchange topic durable `vistoria.events`, persist messages

### Tests

- 8 testes em 2 suites (`correlation-id.middleware`, `env.schema`)

## ADRs criados

- [ADR-003](../decisions/ADR-003-prisma-vs-typeorm.md) — Prisma vs TypeORM
- [ADR-004](../decisions/ADR-004-jwt-rs256.md) — JWT RS256 vs HS256
- [ADR-005](../decisions/ADR-005-zod-vs-class-validator.md) — Zod para env (vs class-validator)
- [ADR-006](../decisions/ADR-006-amqplib-vs-nestjs-microservices.md) — amqplib vs `@nestjs/microservices`

## Breaking changes

Nenhuma — primeiro entregável de BE.

## Métricas

- 40 arquivos / +1476 linhas no commit principal
- 11 arquivos / +8327 linhas no commit de fix (inclui pnpm-lock atualizado)
- 8 testes passando, build OK, lint 0/0
- Endpoints novos: `GET /health`, `GET /health/liveness`, `GET /api/docs` (dev)

## Known issues encerrados

- **`@nestjs/terminus@10` API**: foi escrito código contra v11 (`HealthIndicatorService`); reescrito para v10 (`extends HealthIndicator` + `getStatus`).
- **Augmentation `Request.correlationId`**: declarado inline no middleware não pegava — movido para `src/types/express.d.ts` com `declare global`.
- **`JwtGuard.canActivate`**: faltava `override` modifier; tipo de retorno corrigido para `boolean | Promise<boolean> | Observable<boolean>`.
- **Jest types**: tsconfig.json agora sobrepõe `types: ["node", "jest"]`.

## Próximo sprint

**Sprint 03 — IN**: `IVistoriaProvider`, 3 adapters skeleton (Rede Vistorias, Conceitual, Interno), webhooks com HMAC, RmqSubscriber, scaffold Salesforce DX.
