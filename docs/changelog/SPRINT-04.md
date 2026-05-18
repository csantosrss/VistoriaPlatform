# Sprint 04 — Changelog

**Período**: 2026-04-27
**Agente solo**: FE
**Commit**: `6e78f9d` — `feat(web): React admin shell with health page + login skeleton [sprint-04-fe]`

## Tema

Bootstrap completo do `apps/web`: React 19 + Vite + Tailwind + Shadcn-style + Tanstack Query, com layout admin, página de status funcional e login pronto pra plug.

## Itens entregues

### Stack

- React 19 + Vite 5 + TypeScript
- Tailwind 3.4 (HSL tokens light/dark)
- Tanstack Query, React Hook Form + Zod, Axios com correlation-id
- react-router-dom v6 com `createBrowserRouter`
- Shadcn-style: cva + tailwind-merge + radix-slot + lucide-react

### Configs

- `tsconfig.json` (project references) + `tsconfig.app.json` (extends `@vistoria/config/tsconfig/react.json`) + `tsconfig.node.json`
- `vite.config.ts` com proxy `/api` e `/health` para `localhost:3000`, alias `@/*`, vitest inline (jsdom)
- `eslint.config.mjs` consumindo `@vistoria/config/eslint/react`
- `tailwind.config.js` + `postcss.config.js` + `src/index.css` com tokens HSL Shadcn-compatible

### Lib

- `lib/utils.ts` — `cn(...inputs)` (clsx + tailwind-merge)
- `lib/api-client.ts` (Axios) — interceptor de correlation-id, anexa `Authorization: Bearer ...` se token em `localStorage.auth.access`
- `lib/query-client.ts` — Tanstack Query client com `staleTime: 30s`, retry condicional (não retry 4xx)

### UI primitives (Shadcn-style)

- `Button` (6 variantes, 4 sizes), `Card` + subcomponents, `Input`, `Label`, `Badge`, `Skeleton`

### Layout + router

- `AdminLayout` com sidebar nav (NavLink ativa) + Outlet
- Rotas: `/`, `/health`, `/login`, `/vistorias`

### Features

- `dashboard/DashboardPage` — 3 cards placeholder
- `health/` — feature completa (types/services/hooks/components/page) consumindo `GET /health` real, polling 15s, refresh manual
- `auth/` — feature completa (Zod schema + RHF form + mutation), aguardando `POST /api/v1/auth/login` do BE
- `vistorias/VistoriasPlaceholderPage` — exibe os 9 estados da SAGA importados de `@vistoria/api-contracts`

### Tests (vitest + RTL + jest-dom)

- 8 testes em 2 suites (`button.test.tsx` 4 casos + `login.schema.test.ts` 4 casos)

## ADRs criados

- [ADR-010](../decisions/ADR-010-react-router-v6.md) — React Router v6
- [ADR-011](../decisions/ADR-011-shadcn-copypaste.md) — Shadcn copy-paste
- [ADR-012](../decisions/ADR-012-tailwind-3.md) — Tailwind 3.4

## Breaking changes

Nenhuma — primeiro entregável de FE. `apps/web` agora consome `@vistoria/api-contracts`.

## Métricas

- ~40 arquivos no commit
- 8 testes passando
- Build: 1725 módulos → 464 kB raw / **146 kB gzip**
- Lint: 0 errors / 1 warning estético (react-refresh em `buttonVariants`, padrão Shadcn)

## Known issues encerrados

- `vite.config.ts` precisava `/// <reference types="vitest" />` para o campo `test` ser tipado.
- `NavLink.end` exigiu `interface NavItem` explícita (literal type só do primeiro item quebrava com `as const`).
- `tsc -b` com `declaration: true` quebrava em `createBrowserRouter` (tipo inferido não-portável de `@remix-run/router`) — desabilitado `declaration` na app config.

## Pedidos abertos

- **BE**: adicionar `LoginRequestSchema`/`LoginResponseSchema` em `@vistoria/api-contracts/auth` quando entregar `POST /api/v1/auth/login`. FE consome direto, evita drift.
- **BE**: endpoints de vistorias e auditoria para FE preencher Vistorias e Webhooks recebidos (Sprint 05+).
- **QI**: provisionar `VITE_API_BASE_URL` no deploy de produção.

## Próximo sprint

**Sprint 05 — DOC**: ADRs canônicos, changelogs (este, etc), diagramas Mermaid, README.md raiz atualizado, validação dos handoffs.
