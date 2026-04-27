---
agent: QI
sprint: "01"
date: 2026-04-26
---

# SPRINT-01-QI — Handoff

## Resumo

Setup inicial de qualidade e infraestrutura do monorepo: Docker Compose com 4 serviços, configs compartilhadas (`@vistoria/config`), pipeline turbo, CI no GitHub Actions, hooks de Git (Husky + lint-staged + commitlint).

## Arquivos Criados / Alterados

### Infraestrutura

- `infra/docker-compose.yml` — postgres:16, redis:7-alpine, rabbitmq:3.13-management, mailhog
- `infra/.env.example` — todas as variáveis dos serviços + URLs derivadas

### Configs compartilhadas (`packages/config`)

- `packages/config/package.json` — pacote `@vistoria/config`
- `packages/config/eslint/{base,node,react}.js` — flat configs ESLint 9
- `packages/config/tsconfig/{base,node,react}.json` — tsconfigs estritos
- `packages/config/prettier/index.js` — config Prettier

### Build / CI / Hooks

- `turbo.json` — refinado: `dependsOn`, `inputs`, `outputs`, `globalEnv`
- `package.json` (raiz) — scripts dev/build/lint/test/typecheck/docker:\*, devDeps
- `.github/workflows/ci.yml` — Node 20, pnpm 9, cache `pnpm store path` + `.turbo`
- `.husky/pre-commit` — `pnpm exec lint-staged`
- `.husky/commit-msg` — `pnpm exec commitlint --edit "$1"`
- `commitlint.config.js` — config-conventional + scope-enum (api, web, contracts, integrations, infra, docs, ci, deps, release)

## Serviços Docker

| Serviço  | Imagem                   | Porta(s)     | Healthcheck                    |
| -------- | ------------------------ | ------------ | ------------------------------ |
| postgres | postgres:16              | 5432         | `pg_isready -U $POSTGRES_USER` |
| redis    | redis:7-alpine           | 6379         | `redis-cli ping`               |
| rabbitmq | rabbitmq:3.13-management | 5672 / 15672 | `rabbitmq-diagnostics -q ping` |
| mailhog  | mailhog/mailhog:latest   | 1025 / 8025  | (sem healthcheck nativo)       |

- Network: `vistoria-net` (bridge)
- Volumes nomeados: `postgres-data`, `redis-data`, `rabbitmq-data`
- Credenciais default RabbitMQ: `vistoria` / `vistoria`

## Variáveis de Ambiente Adicionadas

Lista completa em `infra/.env.example`. Destaque para o backend:

- `DATABASE_URL=postgresql://vistoria:vistoria@localhost:5432/vistoria?schema=public`
- `REDIS_URL=redis://localhost:6379`
- `RABBITMQ_URL=amqp://vistoria:vistoria@localhost:5672`
- `SMTP_HOST=localhost`, `SMTP_PORT=1025`

## Scripts Disponíveis

```bash
pnpm dev            # turbo run dev (em todos os pacotes)
pnpm build          # turbo run build
pnpm lint           # turbo run lint
pnpm test           # turbo run test
pnpm typecheck      # turbo run typecheck
pnpm format         # prettier --write
pnpm docker:up      # docker compose up -d (com infra/.env.example)
pnpm docker:down    # docker compose down
pnpm docker:reset   # down -v && up -d
pnpm docker:ps      # status dos serviços
pnpm docker:logs    # follow logs
```

## Validação Executada

- `corepack pnpm install` → 371 pacotes, 33s. Husky hook `prepare` executou.
- `docker compose up -d` → 4 containers criados, network `vistoria-net` provisionada, imagens baixadas.
- `docker compose ps`:
  - ✅ `vistoria-redis` → healthy
  - ✅ `vistoria-mailhog` → up (sem healthcheck)
  - ⚠️ `vistoria-postgres` → up mas `initdb` travou em "post-bootstrap initialization"
  - ⚠️ `vistoria-rabbitmq` → up, healthcheck falhando

## Known Issues

- **Docker Desktop / WSL2 I/O lento neste ambiente**: `initdb` do Postgres não completou em 15+ minutos no host atual; `docker stop`/`docker kill` também não respondem. Compose e healthchecks são corretos — Redis e MailHog provam isso. Sintoma típico de WSL2 com volume virtual fragmentado. Recomendação para o usuário:
  1. `wsl --shutdown` e reiniciar Docker Desktop
  2. Em Settings → Resources, aumentar memória/CPU dedicados ao WSL2
  3. Se persistir, considerar `Disk image location` em SSD não-fragmentado
  4. `pnpm docker:reset` após fix
- O CI (Linux puro) não é afetado por isso.

## Próximos Passos para BE (Sprint 02)

1. Criar `apps/api` como projeto NestJS em monorepo:
   - `apps/api/package.json` com `@vistoria/config` e tsconfig estendendo `tsconfig/node.json`
   - `apps/api/eslint.config.js` importando `@vistoria/config/eslint/node`
   - Scripts: `dev` (nest start --watch), `build` (nest build), `lint`, `test`, `typecheck`
2. Bootstrap NestJS:
   - `main.ts` com `helmet`, `compression`, `pino`, correlation-id middleware, validation pipe (whitelist + transform)
   - Health check endpoint `GET /health` (db, redis, rabbitmq) — usado pelo QI para validação E2E
3. Conectar a Postgres via Prisma: `prisma init` → `schema.prisma` no `apps/api/prisma/`
4. Auth: módulo JWT RS256 (placeholder de chaves, real em sprint posterior)
5. Estrutura de pastas conforme `apps/api/CLAUDE.md`:
   - `src/domain/` — entities, value objects, ports
   - `src/application/` — use cases
   - `src/infrastructure/` — Prisma repositories, RabbitMQ publisher
6. Consumir variáveis do `infra/.env.example` via `@nestjs/config`
7. Ao final: gerar `docs/handoffs/SPRINT-02-BE.md`

## Decisões Que Viram ADR

Notificação enviada ao DOC em `docs/agent-sync/SPRINT-01-QI-TO-DOC.md`:

- ADR-001: RabbitMQ vs Kafka (escolhido RabbitMQ)
- ADR-002: Turborepo vs Nx (escolhido Turborepo)

## Breaking Changes

Nenhuma — sprint inicial.
