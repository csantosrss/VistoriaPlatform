# Sprint 06 — Changelog

**Período**: 2026-05-19
**Agente solo**: QI (segunda volta do ciclo)
**Tema**: Validação E2E do primeiro ciclo, endurecimento de CI e remoção dos atritos de bootstrap herdados.

## Itens entregues

### Bootstrap automático dos `.env`

- `scripts/setup-env.mjs` — script Node cross-platform que copia `apps/api/.env.example` → `apps/api/.env` e `apps/web/.env.example` → `apps/web/.env` se o destino não existir. Idempotente.
- `apps/web/.env.example` criado (não existia) documentando `VITE_API_BASE_URL` para dev (vazio + proxy do Vite) e produção (URL absoluta).
- `pnpm env:setup` exposto e encadeado em `dev:all`: `env:setup → dev:up → dev:migrate → dev` num clone limpo.

### E2E com Playwright

- `@playwright/test@^1.49.0` adicionado como devDep raiz.
- `playwright.config.ts` na raiz com `webServer` que sobe o `apps/api` (reusa em local, sobe limpo em CI), `baseURL` = `http://localhost:3000`, `trace: on-first-retry`.
- `e2e/health.spec.ts` — 2 testes contra o `apps/api` real: `GET /v1/health` (com indicadores Postgres/Redis/RabbitMQ todos `up`) e `GET /api/v1/health/liveness`.
- Scripts: `pnpm test:e2e` e `pnpm test:e2e:install` (baixa o Chromium do Playwright).
- `.gitignore` agora ignora `playwright-report/`, `playwright/.cache/`, `test-results/`.
- Validado localmente: 2/2 testes passando em ~5.7s.

### CI endurecida

- Job `ci` continua: install → lint → typecheck → test → build, agora com **etapa explícita** `pnpm --filter @vistoria/web build` para garantir que regressões no FE não passam despercebidas (mesmo já cobertas pelo `turbo run build`).
- Novo job `e2e` (`needs: ci`):
  1. install deps + `pnpm env:setup`
  2. `pnpm dev:up` (Docker compose --wait)
  3. `pnpm dev:migrate`
  4. `pnpm test:e2e:install` (browser Chromium)
  5. `pnpm test:e2e`
  6. upload do `playwright-report/` em caso de falha
  7. `pnpm docker:down` no `always()`

### Aviso ESM resolvido

- `commitlint.config.js` → `commitlint.config.mjs` (git mv preservando histórico). Elimina o aviso `MODULE_TYPELESS_PACKAGE_JSON` que aparecia a cada commit. Mais seguro do que adicionar `"type": "module"` ao `package.json` raiz (que afetaria todos os `.js`).

### Validação E2E `pnpm dev:all`

- Cadeia `pnpm env:setup → dev:up → dev:migrate → dev` validada num cenário pós-fix (sem precisar recriar volume): API + Web sobem em < 30s, Swagger e Vite respondem, todos os 4 indicadores de health verdes. Cenário "clone 100% limpo" coberto pelo job `e2e` no CI.

## ADRs criados

Nenhum nesta sprint. Decisões tomadas:

- Renomear `commitlint.config.js` para `.mjs` em vez de adicionar `"type": "module"` ao package raiz — diff mínimo, risco zero para outros `.js` do projeto. Não rende ADR porque é fix tático.
- Playwright (em vez de Cypress ou outros) já estava implícito como ferramenta padrão pelo agente QI; não rende ADR.

## Breaking changes

Nenhuma. As mudanças são acréscimos (scripts, testes, CI job) ou rename interno (commitlint config).

## Métricas

- +9 arquivos novos (`scripts/setup-env.mjs`, `apps/web/.env.example`, `playwright.config.ts`, `e2e/health.spec.ts`, `docs/changelog/SPRINT-06.md`, `docs/handoffs/SPRINT-06-QI.md`, + 3 ajustes)
- 2 dependências novas (`@playwright/test` + transitives → +3 packages)
- 2 testes E2E novos, ambos passando em 5.7s
- CI: 2 jobs (ci + e2e), e2e timeout 25min
- 0 mudanças de código de negócio em `apps/api`, `apps/web` ou `packages/`

## Known issues que ficam de pé

1. **@Public() em controllers não-autenticados**: ainda manual. Sem lint rule. O `auth-flow.md` documenta o padrão; o checklist de PR template (a criar) pode citar.
2. **`pnpm test:e2e:install` baixa ~150MB** do Chromium na primeira execução do CI. Considerar cache de `~/.cache/ms-playwright` se o e2e job começar a doer no tempo total.
3. **`playwright.config.ts.webServer` em modo dev no CI** invoca `nest start --watch` que continua observando arquivos. Funciona porque Playwright manda SIGTERM no fim, mas se aparecer flakiness, alternativa é `pnpm --filter @vistoria/api build && node apps/api/dist/main.js`.

## Pedidos abertos

Repassados ao próximo ciclo via [SPRINT-06-QI.md](../handoffs/SPRINT-06-QI.md):

- **BE (Sprint 07 — próximo)**: endpoints de auth real (login/refresh/me), CRUD de Vistorias paginado/filtrado, endpoint de audit logs — pendências carregadas desde o Sprint 04.
- **IN (Sprint 08)**: webhook handlers reais quando BE liberar.
- **FE (Sprint 09)**: telas de Vistorias, login real, theme toggle, recharts.
- **DOC (Sprint 10)**: novo loop de consolidação após BE/IN/FE entregarem domínio real.

## Próximo sprint

**Sprint 07 — BE**: endpoints de domínio (auth real, vistorias, audit). Tema central: começar a entregar valor de negócio agora que o pipeline está sólido ponta-a-ponta.
