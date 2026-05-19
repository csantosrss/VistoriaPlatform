# Sprint 05 — Changelog

**Período**: 2026-05-18 / 2026-05-19
**Agente solo**: DOC
**Tema**: Consolidação da documentação do ciclo QI → BE → IN → FE e fechamento do primeiro loop. Sem alterações de código de negócio: o agente DOC apenas observa, documenta e organiza.

## Itens entregues

### Diagramas de arquitetura (novos)

Fecharam os 3 itens que faltavam no checklist de [docs/architecture/README.md](../architecture/README.md):

- [c4-context.md](../architecture/c4-context.md) — Visão C4 Context (atores: cliente final, gestor/vistoriador, admin; externos: Salesforce, Rede Vistorias, Conceitual, SMTP).
- [c4-container.md](../architecture/c4-container.md) — Visão C4 Container (apps/api, apps/web, packages, Postgres 5433, Redis, RabbitMQ, MailHog) com referências cruzadas para os ADRs que motivaram cada escolha.
- [erd.md](../architecture/erd.md) — ERD do schema atual após a migration `20260519001119_init` (`Tenant`, `User`, `AuditLog`) + convenções multi-tenant/audit que entidades futuras devem respeitar.

Os outros 5 diagramas vivos (`saga-vistoria`, `webhook-flow`, `event-flow`, `auth-flow`, `status-mapping`) já existiam dos sprints anteriores; foram conferidos contra o código real e estão atualizados.

### Atualização do README raiz

- Bloco "Subir o stack local" agora referencia `pnpm dev:all` e os três sub-scripts (`dev:up`, `dev:migrate`, `dev`).
- Tabela "URLs locais" cobre Web (5173), Swagger (3000/api/docs), Health, RabbitMQ Management, MailHog, Prisma Studio.
- Conexões TCP listam Postgres em **5433** (não 5432) com a explicação do conflito com instalações Windows.
- Linkagem direta para os diagramas vivos a partir da seção SAGA.

### Validação dos handoffs anteriores

Os 4 handoffs em [`docs/handoffs/`](../handoffs/) foram validados — todos com frontmatter YAML correto, `pendente_para` rastreado e itens cruzados com os `agent-sync/SPRINT-XX-XX-TO-DOC.md` correspondentes. Nenhum handoff órfão ou contradição encontrada.

### Handoff DOC → próximo ciclo

- [SPRINT-05-DOC.md](../handoffs/SPRINT-05-DOC.md) — entrega para o QI da próxima rodada (validação E2E + setup do que faltou no CI).

### Índices

- [docs/changelog/README.md](./README.md) — já listava o Sprint 05; arquivo de fato agora existe.
- [docs/architecture/README.md](../architecture/README.md) — checklist "Diagramas Pendentes" passou para "Diagramas Vivos", todos marcados.

## ADRs criados

Nenhum nesta sprint. Os 12 ADRs (ADR-001 a ADR-012) já existiam e cobrem todas as decisões dos ciclos QI/BE/IN/FE. Não houve decisão arquitetural nova no trabalho de DOC.

## Breaking changes

Nenhuma.

## Métricas

- 3 diagramas novos (`c4-context`, `c4-container`, `erd`)
- 8 diagramas marcados como vivos em `docs/architecture/`
- README raiz: +30 linhas líquidas (comandos, URLs, diagramas)
- 12 ADRs consolidados e referenciados a partir dos C4
- 4 handoffs (QI, BE, IN, FE) validados
- 0 mudanças de código (DOC nunca toca em `apps/`, `packages/`, `infra/`)

## Known issues encontrados durante a sprint

Estes não foram corrigidos pelo DOC (não cabe à função do agente). Estão registrados aqui para o QI da próxima volta do ciclo decidir como atacar.

1. **`@Public()` ausente em controllers públicos** — antes do início desta sprint, o `HealthController` ficou bloqueado por `JwtGuard` global. Já foi corrigido **fora do escopo de DOC** (commit `9001ca5` `fix(api): mark HealthController as @Public to bypass JwtGuard`). DOC só registra; é um padrão a vigiar quando o BE adicionar novos endpoints públicos (`/auth/login`, webhooks).
2. **Boot do dev exigiu correções acumuladas** — durante a tentativa de subir `pnpm dev:all` foram identificados e corrigidos (também fora do escopo de DOC):
   - `nest-cli.json` com `deleteOutDir: true` brigando com `tsbuildinfo` (commit `ecc4208`)
   - Imports de barrel em `@vistoria/api-contracts` sem extensão `.js` em ESM (commit `a20ca24`)
   - `import type` para `ConfigService` usado em DI (commit `4fb7a7c`)
   - Conflito de porta 5432 com Postgres nativo Windows (commit `8cc1c80`)
   - DI de `TypedConfigService` não-global (commit `ecc4208`)
3. **Aviso `MODULE_TYPELESS_PACKAGE_JSON`** ao rodar `commitlint.config.js` — colateral menor de Node 22+. Solução envolveria adicionar `"type": "module"` ao `package.json` raiz, com risco de quebrar outros `.js` que assumem CJS. QI decide se vale endereçar.

## Pedidos abertos

Repassados ao próximo ciclo via [SPRINT-05-DOC.md](../handoffs/SPRINT-05-DOC.md):

- **QI (próxima volta — Sprint 06)**: validar E2E do stack que `pnpm dev:all` levanta; adicionar `pnpm --filter @vistoria/web build` ao CI; considerar Playwright contra `/v1/health`; provisionar `VITE_API_BASE_URL` para produção.
- **BE (Sprint 07)**: endpoints de auth real (`/api/v1/auth/login`, `/refresh`, `/me`), CRUD de Vistorias paginado/filtrado, endpoint de audit logs.
- **IN (Sprint 08)**: webhook handlers reais a partir do que QI/BE habilitarem.
- **FE (Sprint 09)**: telas que dependem dos endpoints do BE (Vistorias, Webhooks recebidos, login real, recharts dashboard).

## Próximo sprint

**Sprint 06 — QI** (validação E2E do primeiro ciclo + endurecimento de CI). O loop reinicia em QI conforme o protocolo do `AGENTS.md`.
