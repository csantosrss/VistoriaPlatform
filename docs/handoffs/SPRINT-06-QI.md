---
agent: QI
sprint: "06"
date: 2026-05-19
---

# Handoff — Sprint 06 (QI) → Sprint 07 (BE)

## Resumo

QI fechou as 6 pendências deixadas pelo DOC no `SPRINT-05-DOC.md`: bootstrap automático dos `.env`, E2E com Playwright (smoke contra `/v1/health` + liveness), CI com job `e2e` próprio, `VITE_API_BASE_URL` documentado para o `apps/web`, aviso `MODULE_TYPELESS_PACKAGE_JSON` eliminado renomeando `commitlint.config.js` → `.mjs`, e build explícito do `apps/web` no pipeline principal. Próximo agente é **BE**.

## Entregas

- `scripts/setup-env.mjs` + script `pnpm env:setup` integrado em `dev:all`. Clone limpo → install → `dev:all` funciona sem `cp` manual.
- `apps/web/.env.example` criado documentando `VITE_API_BASE_URL` (vazio em dev, absoluto em prod).
- `playwright.config.ts` + `e2e/health.spec.ts` (2 testes, ambos verdes em ~5.7s).
- Scripts raiz: `pnpm test:e2e`, `pnpm test:e2e:install`.
- `.github/workflows/ci.yml`: novo job `e2e` que sobe stack, migra, instala Chromium e roda Playwright; sempre derruba o stack no final.
- `commitlint.config.js` → `commitlint.config.mjs` (rename via `git mv`).
- `.gitignore` cobre artefatos Playwright (`playwright-report/`, `test-results/`, `playwright/.cache/`).

## O Que o BE Precisa Saber Antes de Começar (Sprint 07)

### Endpoints prioritários (já pedidos desde o SPRINT-04-FE)

1. **Auth real** — `POST /api/v1/auth/login`, `POST /api/v1/auth/refresh`, `GET /api/v1/auth/me`. Schemas em `@vistoria/api-contracts/auth` (criar barrel novo seguindo o padrão `./vistoria` e `./webhooks` — `import` com extensão `.js` por causa do ESM, ver `packages/api-contracts/src/index.ts`).
2. **CRUD de Vistorias** — `GET /api/v1/vistorias` (paginado + filtros status/período/parceiro), `GET /:id`, `POST /`, `POST /:id/cancelar`. Cada nova entidade Prisma precisa de `tenantId @db.Uuid`, índice `(tenantId, ...)` e seguir o que está em `docs/architecture/erd.md`.
3. **Audit endpoint** — `GET /api/v1/audit-logs?resourceType=Webhook&provider=...` para a tela de Webhooks recebidos do FE.

### Regras de DI e ESM já dolorosamente aprendidas (não repetir)

- Use `import { ConfigService } from "@nestjs/config"` (não `import type`) sempre que injetar via construtor — `import type` é apagado pelo tsc e a DI quebra com "argument Function at index [N]".
- Imports em `packages/api-contracts/src/**` precisam de `.js` explícito (`./vistoria/index.js`, não `./vistoria`) — pacote é ESM e Node não aceita directory imports.
- Se precisar registrar `JwtModule.registerAsync` ou similar com `inject: [TypedConfigService]`, o serviço precisa estar disponível no scope do consumidor. `TypedConfigService` está em `ConfigModule` que é `@Global` — apenas use o `ConfigModule` no `imports` se ainda não estiver global.

### @Public()

`HealthController` é o único controller com `@Public()` hoje (commit `9001ca5`). **Qualquer endpoint novo que NÃO exige JWT precisa de `@Public()` no método ou na classe**, caso contrário o `JwtGuard` global devolve 401. Casos prováveis:

- `POST /api/v1/auth/login` → `@Public()` (não tem token ainda)
- `POST /api/v1/auth/refresh` → talvez `@Public()` (depende se ainda valida o refresh token via guard custom ou no controller)
- `GET /api/v1/auth/me` → autenticado, NÃO usar `@Public()`
- Webhooks de parceiros → já têm guard HMAC próprio em `packages/integrations`; precisam ser `@Public()` para escapar do JwtGuard global.

### Setup local

Clone limpo, primeiro boot:

```bash
pnpm install
pnpm dev:all
```

`dev:all` cuida de: `env:setup` (cria `.env` se faltar) → `dev:up` (docker compose --wait) → `dev:migrate` (Prisma) → `dev` (turbo: api + web). Postgres em **5433**, não 5432.

### Testes E2E

Quando criar endpoint novo, adicionar um `e2e/<dominio>.spec.ts` mínimo (status code esperado + shape do payload). O job `e2e` no CI roda em todo PR.

## Pendente Para Outros Agentes

### IN (Sprint 08)

- Webhook handlers de verdade (`RedeVistoriasProvider`, `ConceitualProvider`) quando os endpoints REST do BE existirem.
- Salesforce LWC + Apex (continua pendente do plano original).

### FE (Sprint 09)

- Telas de Vistorias (lista paginada + detalhe + criação), Webhooks recebidos, recharts no dashboard, login real, theme toggle, i18n. Todas dependem de BE Sprint 07.

### DOC (Sprint 10)

- Consolidação do segundo ciclo: changelog SPRINT-06..09, ADRs novas de BE/IN/FE, atualizar `erd.md` quando entidades de domínio entrarem, novo C4 se topologia mudar.

## Known Issues Documentadas

1. **`pnpm test:e2e:install` baixa Chromium (~150MB)** no CI — pode ser cacheado em `~/.cache/ms-playwright` se ficar lento.
2. **Playwright webServer em modo dev no CI** funciona mas é cinto + suspensório: se aparecer flakiness, alternar para `pnpm --filter @vistoria/api build && node apps/api/dist/main.js`.
3. **Sem lint rule para `@Public()`** — checagem ainda é manual. Considerar criar `eslint-plugin-vistoria` num sprint futuro se virar problema recorrente.

## Decisões Que Viram ADR

Nenhuma — todas as decisões desta sprint foram táticas (rename de config, escolha de browser do Playwright, formato dos `.env.example`).

## Próximo Sprint

**Sprint 07 — BE**: auth real + Vistorias + audit endpoint. Detalhes nos pedidos acima e em `SPRINT-04-FE.md`.
