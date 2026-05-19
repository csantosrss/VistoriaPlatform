# Sprint 09 — Changelog

**Período**: 2026-05-19
**Agente solo**: FE
**Tema**: Painel admin sai do estado placeholder do Sprint 04. Todas as telas plugadas em endpoints reais do BE Sprint 07 (`auth`, `vistorias`, `audit-logs`). Fluxo ponta-a-ponta no admin: login real → dashboard com KPIs vivos → listagem com filtros e paginação → detalhe + cancelamento → criação → auditoria de webhooks.

## Itens entregues

### Auth real

- `LoginRequestSchema` / `LoginResponseSchema` / `MeResponseSchema` (de `@vistoria/api-contracts`) consumidos diretamente — sem redefinição local. Re-export em `login.schema.ts` evita drift FE↔BE.
- `RequireAuth` guard de rota — sem token redireciona para `/login` preservando `state.from` para redirect pós-login.
- `useMe` (Tanstack Query) com `initialData` do `localStorage` — primeira renderização sem flicker.
- `useLogin` pré-popula o cache `["auth", "me"]` com o `user` do response (evita refetch redundante na primeira tela).
- `useLogout` limpa sessão + `queryClient.clear()` + redireciona para `/login`.
- `api-client.ts`: interceptor de response em `401` limpa storage e redireciona para `/login?next=<path>` (uma única vez, evita loop).
- `getStoredUser` defensivo: `try/catch` no `JSON.parse` + `safeParse` no shape — localStorage corrompido vira `null` ao invés de quebrar a UI.

### Vistorias — CRUD completo

- `services/vistorias.service.ts`: `listVistorias`, `getVistoria`, `createVistoria`, `cancelVistoria` validando response com Zod.
- Hooks: `use-vistorias` (com `keepPreviousData` para paginação sem flicker), `use-vistoria`, `use-create-vistoria` (invalida lista + navega ao detalhe), `use-cancel-vistoria` (atualiza cache do detalhe via `setQueryData` + invalida lista).
- `VistoriasListPage`: tabela com 6 colunas, paginação 20/pág, estados loading/erro/empty.
- `VistoriasFilters`: filtros por status e tipo consumindo `StatusVistoriaSchema.options` e `TipoVistoriaSchema.options` (fonte única).
- `VistoriaDetailPage`: grid 2/3 + 1/3 com dados completos (provider, vistoriador, datas da SAGA) e card de cancelamento condicionado a `STATUS_CANCELAVEIS`.
- `CancelVistoriaForm`: RHF + Zod, distingue 409 (regra de SAGA) de erro genérico.
- `NewVistoriaPage` + `VistoriaForm`: formulário completo (tipo, endereço com CEP regex do contracts, contato, observações). Campos opcionais vazios viram `null`.
- `VistoriaStatusBadge`: mapeia os 9 estados da SAGA para variants do `Badge` + labels PT-BR.

### Auditoria (webhooks recebidos)

- `features/audit/`: `audit.service.ts`, `use-audit-logs`, `AuditPage`.
- Filtros pré-fixados em `resourceType=Vistoria` com seletor de `action` (`VISTORIA.CREATED`, `VISTORIA.CANCELED`, `VISTORIA.STATUS_CHANGED`, `VISTORIA.WEBHOOK_RECEIVED`) e busca por `resourceId`. Tabela com timestamp PT-BR, action, resource id, user id, correlation id.
- Quando BE consumir `vistoria.status.changed` (handoff IN Sprint 08), a tela reflete transições de parceiro automaticamente — sem mudança no FE.

### Dashboard

- 3 KPIs vivos (`SOLICITADA`, `EM_EXECUCAO`, `CONCLUIDA`) consumindo `useVistorias` com `pageSize: 1` (só queremos o `total`).
- Cards de atalho para as principais rotas.

### Layout

- `AdminLayout` com nav completa (Dashboard, Vistorias, Auditoria, Status), bloco de usuário (nome/email/roles via `useMe`) e botão de logout.

### UI primitives novos

- `components/ui/select.tsx` — `<select>` nativo estilizado, com `forwardRef`. Comentário explicita que vira `@radix-ui/react-select` se UX exigir busca.
- `components/ui/textarea.tsx` — `<textarea>` estilizado, com `forwardRef`.

### Roteamento

- `routes.tsx`: `/login` público, todo o resto sob `<RequireAuth><AdminLayout /></RequireAuth>`. Rotas: `/`, `/health`, `/vistorias`, `/vistorias/novo`, `/vistorias/:id`, `/audit`. `VistoriasPlaceholderPage` removido.

### Tests

- `auth.service.test.ts` — 4 casos: persist+get, clear, JSON corrompido → null, shape inválido → null.
- `VistoriaStatusBadge.test.tsx` — 3 casos: label PT-BR para SOLICITADA, variant destructive para CANCELADA, variant success para CONCLUIDA.
- `login.schema.test.ts` atualizado para o shape novo (sem `tenantSlug`): válido, e-mail inválido, senha <6, senha >72.

Total: **15 testes passando** em `@vistoria/web` (era 8 no Sprint 04).

## Páginas / Rotas

| Rota              | Componente           | Auth    | Estado                                       |
| ----------------- | -------------------- | ------- | -------------------------------------------- |
| `/login`          | `LoginPage`          | público | **Funcional** — `POST /api/v1/auth/login`    |
| `/`               | `DashboardPage`      | JWT     | **Funcional** — 3 KPIs vivos                 |
| `/vistorias`      | `VistoriasListPage`  | JWT     | **Funcional** — `GET /api/v1/vistorias`      |
| `/vistorias/novo` | `NewVistoriaPage`    | JWT     | **Funcional** — `POST /api/v1/vistorias`     |
| `/vistorias/:id`  | `VistoriaDetailPage` | JWT     | **Funcional** — `GET` + `POST /:id/cancelar` |
| `/audit`          | `AuditPage`          | JWT     | **Funcional** — `GET /api/v1/audit-logs`     |
| `/health`         | `HealthPage`         | JWT     | **Funcional** — herdado do Sprint 04         |

Todos os endpoints do BE Sprint 07 consumidos.

## Validação executada

| Comando                                       | Resultado                                                                     |
| --------------------------------------------- | ----------------------------------------------------------------------------- |
| `pnpm --filter @vistoria/api-contracts build` | ✅ 0 erros                                                                    |
| `pnpm --filter @vistoria/web typecheck`       | ✅ 0 erros                                                                    |
| `pnpm --filter @vistoria/web lint`            | ✅ 0 errors, 1 warning estético pré-existente em `button.tsx` (padrão Shadcn) |
| `pnpm --filter @vistoria/web test`            | ✅ 15 testes em 4 suites                                                      |

## ADRs criados

Nenhum. Todas as escolhas desta sprint são implementações dentro de decisões já registradas (ADR-010, ADR-011, ADR-012). Pendentes candidatos a ADR (não decididos ainda):

- **localStorage vs httpOnly cookie** para o token — segue como `localStorage` herdado do Sprint 04. Vira ADR quando BE expuser o cookie.
- **Dashboard com chamadas paralelas vs endpoint agregado** — hoje 3 chamadas. Vira ADR/refatoração quando BE entregar `GET /api/v1/vistorias/stats`.

## Breaking changes

Em `@vistoria/api-contracts`: nenhum (FE só consome).

Em `apps/web`:

- `VistoriasPlaceholderPage` removido — rota `/vistorias` aponta para a `VistoriasListPage` real.
- `auth.service`: `persistTokens(tokens)` → `persistSession(LoginResponse)`, `clearTokens()` → `clearSession()`. Sem consumidor externo (só FE).

## Métricas

- 33 arquivos tocados em `apps/web/src/` (+1608 / −167)
- 15 testes passando em 4 suites (era 8 em 2)
- 0 schemas novos em `@vistoria/api-contracts` (FE consome, não cria — princípio do CLAUDE.md do pacote)
- 0 mudanças em `apps/api`, `packages/integrations`, `infra/` (boundary respeitado)

## Known issues que ficam de pé

1. **Sem timeline da SAGA no detalhe** — depende de endpoint de transições (`GET /api/v1/vistorias/:id/transicoes`) ainda não exposto pelo BE. Hoje o detalhe mostra apenas o estado atual + datas.
2. **`localStorage` para token** — placeholder herdado do Sprint 04. Migração esperada quando BE expuser cookie httpOnly.
3. **Sem refresh token automático** — token expira em 15min e o usuário precisa logar de novo. Mitigado pelo redirect `?next=` que preserva a rota.
4. **Lint warning estético em `button.tsx`** — `buttonVariants` exportado junto com o componente (padrão Shadcn). Pré-existente do Sprint 04.
5. **Dashboard com 3 chamadas paralelas** — não é problema de correção, mas vale endurecer com endpoint agregado quando o tráfego justificar.

## Pedidos abertos

Detalhados em [SPRINT-09-FE.md](../handoffs/SPRINT-09-FE.md). Resumo:

- **BE (Sprint 11+)**: listar transições (`GET /vistorias/:id/transicoes`), refresh token, migração para cookie httpOnly, endpoint agregado `GET /vistorias/stats`, consumir `vistoria.status.changed` do IN Sprint 08 (compromisso herdado).
- **IN (Sprint 12+)**: sem pendência direta — quando o BE consumir o evento RMQ, `/audit` reflete automaticamente.
- **QI (Sprint 11)**: Playwright E2E das telas novas (login → dashboard → criar vistoria → cancelar → 401 redirect); confirmar `pnpm --filter @vistoria/web build` no CI; provisionar `VITE_API_BASE_URL` no deploy estático.
- **DOC (Sprint 10)**: este changelog + `c4-container.md` com a seta FE→BE saindo do estado planejado + README raiz com lista de telas funcionais. Feito nesta sprint.

## Próximo sprint

**Sprint 10 — DOC** (esta sprint). Após esta consolidação, o ciclo reinicia em **Sprint 11 — QI** (validação E2E ampliada + investigação do `nest start --watch` flaky herdada do BE07).
