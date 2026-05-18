# Sprint 01 — Changelog

**Período**: 2026-04-26
**Agente solo**: QI (setup inicial)
**Commit**: `b9ebb99` — `feat(infra): docker compose, shared configs, ci pipeline [sprint-01-qi]`

## Tema

Setup inicial de qualidade e infraestrutura: tooling, containers de dev, CI, hooks de Git.

## Itens entregues

- **Docker Compose** (`infra/docker-compose.yml`) — Postgres 16, Redis 7-alpine, RabbitMQ 3.13-management, MailHog. Network `vistoria-net`, volumes nomeados, healthchecks por serviço.
- **`.env.example`** com todas as vars dos serviços + URLs derivadas (`DATABASE_URL`, `REDIS_URL`, `RABBITMQ_URL`, SMTP).
- **`packages/config`** — `@vistoria/config` exporta:
  - ESLint flat configs: `eslint/{base,node,react}.js`
  - tsconfigs estritos: `tsconfig/{base,node,react}.json`
  - Prettier: `prettier/index.js`
- **Turbo** — `turbo.json` com `dev/build/lint/test/typecheck/clean`, `dependsOn: ["^build"]`, `inputs`/`outputs`.
- **CI** — `.github/workflows/ci.yml` com Node 20 + pnpm 9, cache de `pnpm store path` + `.turbo`.
- **Hooks** — Husky 9 (`pre-commit` → lint-staged, `commit-msg` → commitlint), `.lintstagedrc` em `package.json`, `commitlint.config.js` com `config-conventional` + scope-enum.
- **Scripts raiz** — `dev`, `build`, `lint`, `test`, `typecheck`, `format`, `docker:{up,down,reset,logs,ps}`.

## ADRs criados

- [ADR-001](../decisions/ADR-001-rabbitmq-vs-kafka.md) — RabbitMQ vs Kafka
- [ADR-002](../decisions/ADR-002-turborepo-vs-nx.md) — Turborepo vs Nx

## Breaking changes

Nenhuma — primeiro entregável.

## Métricas

- 19 arquivos commitados / +5157 linhas
- 371 dependências instaladas (pnpm)
- 4 serviços Docker definidos
- Coverage: N/A (sem código de domínio ainda)

## Known issues encerrados pelo handoff

- **Docker Desktop / WSL2**: Postgres `initdb` travou em I/O lento no host de desenvolvimento. Hook do Husky inicialmente quebrava por `pnpm` fora do PATH no subshell do Git — corrigido no Sprint 02 BE usando os binários direto de `node_modules/.bin`.

## Próximo sprint

**Sprint 02 — BE**: bootstrap NestJS em `apps/api`, Prisma schema, auth JWT RS256, health endpoint.
