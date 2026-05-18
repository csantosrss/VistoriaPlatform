# ADR-002: Turborepo como orquestrador de monorepo (vs Nx)

## Status

Aceita

## Contexto

Monorepo com `apps/*` (api, web), `packages/*` (config, api-contracts, integrations) e `infra/`. Necessidades:

- Cache local e remoto de tasks
- `dependsOn` entre pacotes (ex.: web depende de contracts)
- Pipelines paralelas (lint/test/typecheck simultâneos onde possível)
- Curva de aprendizado baixa
- Boa integração com pnpm workspaces

## Decisão

**Turborepo 2.x** (`turbo`) com `turbo.json` no root.

## Alternativas Consideradas

- **Nx**: mais opinionated, gera scaffolding automático, plugins ricos para NestJS e React. Porém traz "Nx-isms" (project graph, executors, generators) que adicionam carga cognitiva e dificultam extração futura de pacotes para fora do monorepo.
- **Lerna**: estagnado em prática (sem cache moderno).
- **Bazel**: industrial, excessivo para este escopo.

## Consequências

- **Positivas**: configuração mínima (`turbo.json`), respeita os scripts existentes em cada `package.json`. Cache local automático e remote-cache plugável (Vercel, GitHub Actions). Sai do caminho.
- **Negativas**: sem geradores de scaffolding (cada agente cria sua estrutura manualmente — alinhado com nosso protocolo de 5 agentes especializados).
- **Riscos**: cache hit miss em CI até `inputs`/`outputs` estarem bem ajustados. Vamos monitorar nos primeiros sprints.

## Agente Autor

QI

## Data

2026-04-26

## Sprint

S01

## Referências

- Sync original: `docs/agent-sync/SPRINT-01-QI-TO-DOC.md`
- Configuração: [`turbo.json`](../../turbo.json)
- Workspaces: [`pnpm-workspace.yaml`](../../pnpm-workspace.yaml)
