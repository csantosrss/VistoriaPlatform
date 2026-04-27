---
agent: FE
sprint: "04"
date: 2026-04-27
---

# SPRINT-04-FE — Handoff

## Resumo

Bootstrap completo do `apps/web` (React 19 + Vite + TypeScript + Tailwind 3 + Shadcn-style + Tanstack Query + RHF + Zod). Painel admin com layout, router, dashboard placeholder, página de status (consumindo `GET /health`) e formulário de login pronto para o endpoint do BE.

## Itens Completos

### Scaffold

- FE-001 — `package.json` com React 19, Vite 5, Tailwind 3.4, Shadcn-style stack (`class-variance-authority`, `tailwind-merge`, `lucide-react`, `@radix-ui/react-slot`)
- FE-002 — `tsconfig.json` (project references) + `tsconfig.app.json` (extends `@vistoria/config/tsconfig/react.json`) + `tsconfig.node.json`
- FE-003 — `vite.config.ts` com proxy `/api` e `/health` para `localhost:3000`, alias `@/*`, vitest inline (jsdom)
- FE-004 — `eslint.config.mjs` consumindo `@vistoria/config/eslint/react`
- FE-005 — `tailwind.config.js` + `postcss.config.js` + `src/index.css` com tokens HSL (light + dark) compatíveis com Shadcn

### Lib

- FE-006 — `lib/utils.ts` com `cn(...inputs)` (clsx + tailwind-merge)
- FE-007 — `lib/api-client.ts` (Axios) — interceptor injeta `x-correlation-id` em todo request, anexa `Authorization: Bearer ...` se houver token em `localStorage.auth.access`, redireciona em 401 (placeholder)
- FE-008 — `lib/query-client.ts` — Tanstack Query client com `staleTime: 30s`, retry condicional (não retry em 4xx), `refetchOnWindowFocus: false`

### UI primitives (Shadcn-style)

- FE-009 — `Button` com 6 variantes (default/destructive/outline/secondary/ghost/link) e 4 sizes
- FE-010 — `Card` + subcomponentes (`CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, `CardFooter`)
- FE-011 — `Input`, `Label`, `Badge` (6 variantes incl. success/warning), `Skeleton`

### Layout + router

- FE-012 — `AdminLayout` com sidebar + Outlet, navegação ativa via `NavLink` className condicional
- FE-013 — `routes.tsx` com `createBrowserRouter`: `/`, `/health`, `/login`, `/vistorias`

### Features

- FE-014 — `features/dashboard/DashboardPage` — 3 cards placeholder (vistorias ativas, concluídas hoje, link para health)
- FE-015 — `features/health/` — feature completa:
  - `types.ts` (`HealthCheckResponse`, `HealthIndicatorEntry`)
  - `services/health.service.ts` (`fetchHealth`)
  - `hooks/use-health.ts` (Tanstack Query, `refetchInterval: 15s`)
  - `components/HealthCard.tsx` (ícone + badge UP/DOWN)
  - `HealthPage.tsx` com loading/error/success states + botão refresh
- FE-016 — `features/auth/` — feature completa:
  - `schemas/login.schema.ts` (Zod: email, senha 8+, tenantSlug regex `^[a-z0-9-]+$`)
  - `services/auth.service.ts` (`login`, `persistTokens`, `clearTokens`)
  - `hooks/use-login.ts` (Tanstack Mutation, navega para `/` em sucesso)
  - `components/LoginForm.tsx` (RHF + zodResolver, 3 campos, mensagens de erro)
  - `LoginPage.tsx` (Card centralizado com aviso de endpoint pendente)
- FE-017 — `features/vistorias/VistoriasPlaceholderPage` — exibe os 9 estados da SAGA importados de `@vistoria/api-contracts` (validação visual da integração com o pacote do IN/BE)

### Tests (vitest + RTL + jest-dom)

- FE-018 — `src/test/setup.ts` (jest-dom matchers + cleanup)
- FE-019 — `button.test.tsx` (4 casos: variants, click, disabled)
- FE-020 — `login.schema.test.ts` (4 casos: válido, email inválido, senha curta, slug uppercase)

## Páginas / Rotas

| Rota         | Componente                 | Auth | Status                                      |
| ------------ | -------------------------- | ---- | ------------------------------------------- |
| `/`          | `DashboardPage`            | —    | Placeholder (cards aguardando endpoints)    |
| `/health`    | `HealthPage`               | —    | **Funcional** — consome `GET /health`       |
| `/login`     | `LoginPage`                | —    | UI pronta, espera `POST /api/v1/auth/login` |
| `/vistorias` | `VistoriasPlaceholderPage` | —    | Placeholder com enum dos 9 estados          |

## Validação Executada

| Comando                                 | Resultado                                                                           |
| --------------------------------------- | ----------------------------------------------------------------------------------- |
| `pnpm install`                          | ✅ +151 pacotes (web stack)                                                         |
| `pnpm --filter @vistoria/web typecheck` | ✅ 0 erros                                                                          |
| `pnpm --filter @vistoria/web test`      | ✅ 8 testes em 2 suites (3.41s)                                                     |
| `pnpm --filter @vistoria/web build`     | ✅ 1725 módulos → `dist/` 464 kB raw / 146 kB gzip                                  |
| `pnpm --filter @vistoria/web lint`      | ✅ 0 errors, 1 warning estético (react-refresh em `buttonVariants` — padrão Shadcn) |

## Endpoints Consumidos

- `GET /health` (existente, BE Sprint 02) — funciona em dev via Vite proxy
- `POST /api/v1/auth/login` — **aguardando BE Sprint 03+**, schema do request já definido em `LoginInput`:
  ```ts
  {
    email: string;
    password: string;
    tenantSlug: string;
  }
  ```
  Response esperado: `{ accessToken, refreshToken, expiresIn }`. **Sugiro ao BE adicionar esse schema em `@vistoria/api-contracts/auth`** para alinhar (sync explícito via agent-sync se quiser que eu mude o LoginInput).

## Variáveis de Ambiente (`apps/web`)

- `VITE_API_BASE_URL` — opcional. Em dev fica vazio (proxy do Vite); em produção, apontar para o api.

## Pendente Para Outros Agentes

### BE (Sprint 03+ — quando entregar)

1. **Endpoints de auth**: `POST /api/v1/auth/login`, `POST /api/v1/auth/refresh`, `GET /api/v1/auth/me`. Adicionar request/response schemas em `@vistoria/api-contracts/auth` para FE consumir tipos.
2. **Endpoints de vistorias**: `GET /api/v1/vistorias` (paginado, com filtro por status/período), `GET /api/v1/vistorias/:id`, `POST /api/v1/vistorias`, `POST /api/v1/vistorias/:id/cancelar`. FE Sprint 05+ implementa as telas.
3. **Endpoints de auditoria** para FE consultar webhooks recebidos: `GET /api/v1/audit-logs?resourceType=Webhook&provider=...&from=...&to=...`. Necessário para a tela "Webhooks recebidos" pedida no handoff do IN.

### IN (próximos sprints)

- Quando os endpoints de auditoria existirem, FE consulta webhooks recebidos. Não precisa de mudança em IN para o FE atual.

### QI (validação E2E + CI)

1. Adicionar `pnpm --filter @vistoria/web build` ao job de CI (já entra automaticamente via `turbo run build` quando QI configurar turbo + pnpm globalmente disponível no CI).
2. Considerar Playwright E2E em sprint futuro: rota `/health` é um candidato natural (smoke test contra o stack docker compose).
3. Provisionar `VITE_API_BASE_URL` no deploy (CDN/static hosting) — rota relativa em dev, absoluta em produção.

### DOC

- Sync enviado em `docs/agent-sync/SPRINT-04-FE-TO-DOC.md`.

## Known Issues

1. **Lint warning estético** em `Button.tsx`: `buttonVariants` exportado junto com o componente → react-refresh complain (`only-export-components`). É padrão do Shadcn original; mover para arquivo separado é a única solução completa, mas adiciona ruído. Mantido como está; podemos refatorar no Sprint 05+ se incomodar.
2. **Sem endpoints reais ainda** — tela de login submete e falha graciosamente (mostra "endpoint indisponível"). Valido o fluxo completo no Sprint 05 quando BE liberar.
3. **`localStorage` para tokens** é placeholder. Deve migrar para httpOnly cookie (definido pelo BE no `/login` response) num sprint próximo, com toda a configuração CSRF necessária.

## Próximos Passos do Próprio FE (Sprint 05+)

1. **Listagem de Vistorias** com filtros (status, período, parceiro), paginação infinite-scroll
2. **Detalhe de Vistoria** com timeline da SAGA, fotos, laudo
3. **Solicitação de Vistoria** (formulário multi-step com endereço, tipo, contato — mobile-first)
4. **Tela de Webhooks recebidos** consumindo `audit_logs`
5. **Recharts** no dashboard: gráfico de vistorias por status (donut), por dia (line)
6. **Login real** + refresh token flow + redirect deep-link após auth
7. **Theme toggle** (light/dark já tem CSS pronto)
8. **i18n** se tiver clientes além de pt-BR

## Breaking Changes

Nenhuma — primeiro entregável de FE. Agora `apps/web` consome `@vistoria/api-contracts`.

## Decisões Que Viram ADR

Notificação enviada ao DOC em `docs/agent-sync/SPRINT-04-FE-TO-DOC.md`:

- ADR-010: React Router v6 vs Tanstack Router
- ADR-011: Shadcn-style copy-paste vs Material UI / Mantine
- ADR-012: Tailwind 3 (v3.4) vs Tailwind 4
