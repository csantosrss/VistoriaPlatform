---
agent: FE
sprint: "09"
date: 2026-05-19
---

# Handoff — Sprint 09 (FE) → Sprint 10 (DOC)

## Resumo

FE plugou todas as telas planejadas nos endpoints reais do BE Sprint 07 (`auth`, `vistorias`, `audit-logs`). O painel admin saiu do estado "placeholder" do Sprint 04 e agora cobre o fluxo ponta-a-ponta: login real → dashboard com KPIs vivos → listagem com filtros e paginação → detalhe + cancelamento → criação de vistoria → auditoria de webhooks. Nenhuma chamada placeholder restante.

Boundary respeitada (CLAUDE.md de FE): zero arquivo tocado em `apps/api/`, `packages/integrations/` ou `infra/`. Apenas `apps/web/` e nenhum schema novo em `@vistoria/api-contracts` (FE consome, não cria — princípio do CLAUDE.md do pacote).

## Itens Entregues

### Auth real

- FE-021 — `features/auth/services/auth.service.ts` reescrito para os schemas oficiais de `@vistoria/api-contracts/auth` (`LoginRequestSchema`, `LoginResponseSchema`, `MeResponseSchema`). Removido o shape antigo com `tenantSlug` (decisão BE Sprint 07: tenant fica implícito no usuário). Helpers `persistSession` / `clearSession` / `getStoredToken` / `getStoredUser` agora usam Zod `safeParse` no localStorage — corrupção de storage não derruba a página.
- FE-022 — `features/auth/schemas/login.schema.ts` re-exporta `LoginRequestSchema` para uso direto no RHF (evita drift FE↔BE).
- FE-023 — `features/auth/hooks/use-login.ts` — Tanstack Mutation: persiste sessão, pré-popula o cache `["auth", "me"]` com o `user` recebido no login (evita refetch redundante) e navega para `next` (deep-link) ou `/`.
- FE-024 — `features/auth/hooks/use-me.ts` — query `["auth", "me"]` consumindo `GET /api/v1/auth/me`, `initialData` do localStorage, `staleTime 5min`, `retry: false`.
- FE-025 — `features/auth/hooks/use-logout.ts` — limpa sessão + `queryClient.clear()` + redireciona para `/login`.
- FE-026 — `features/auth/components/RequireAuth.tsx` — guard de rota; sem token redireciona para `/login` preservando `state.from` para redirect pós-login.
- FE-027 — `features/auth/components/LoginForm.tsx` — RHF + Zod, distingue `401` (credenciais inválidas) de erro genérico.
- FE-028 — `features/auth/LoginPage.tsx` — redireciona usuário já autenticado para `next` ou `/` em useEffect.
- FE-029 — `lib/api-client.ts` — interceptor de response em `401` limpa storage e redireciona para `/login?next=<path>` (uma única vez, evita loop).

### Vistorias

- FE-030 — `features/vistorias/services/vistorias.service.ts` — `listVistorias`, `getVistoria`, `createVistoria`, `cancelVistoria` validando response com Zod (`VistoriaSchema`, `ListVistoriasResponseSchema`).
- FE-031 — Hooks Tanstack Query: `use-vistorias` (com `keepPreviousData` para paginação sem flicker), `use-vistoria`, `use-create-vistoria` (invalida lista + navega para o detalhe), `use-cancel-vistoria` (atualiza cache do detalhe via `setQueryData` + invalida lista).
- FE-032 — `VistoriasListPage` — tabela com 6 colunas (status badge, tipo, endereço, cidade/UF, contato, criação), paginação (20/pág), estados de loading/erro/empty. Linhas com link para `/vistorias/:id`.
- FE-033 — `VistoriasFilters` — filtros por status e tipo (consome `StatusVistoriaSchema.options` e `TipoVistoriaSchema.options` do contracts — fonte única).
- FE-034 — `VistoriaDetailPage` — grid 2/3 + 1/3: dados completos (incluindo `providerId`, `vistoriadorId`, datas `agendadoPara`/`concluidoEm`/`canceladoEm`), badge de status, e card de cancelamento condicionado a `STATUS_CANCELAVEIS` (importado do contracts).
- FE-035 — `CancelVistoriaForm` — RHF + Zod, distingue `409` (regra de SAGA) de erro genérico.
- FE-036 — `NewVistoriaPage` + `VistoriaForm` — formulário completo (tipo, endereço com CEP regex já do contracts, contato, observações). Campos opcionais vazios são enviados como `null` (aceito pelo BE).
- FE-037 — `VistoriaStatusBadge` — mapeia os 9 estados da SAGA para variants do `Badge` (`success`/`warning`/`destructive`/`default`/`secondary`/`outline`) e labels PT-BR.

### Auditoria (webhooks recebidos)

- FE-038 — `features/audit/services/audit.service.ts` + `use-audit-logs` + `AuditPage`.
- FE-039 — Filtros pré-fixados em `resourceType=Vistoria`, com seletor de `action` (`VISTORIA.CREATED`, `VISTORIA.CANCELED`, `VISTORIA.STATUS_CHANGED`, `VISTORIA.WEBHOOK_RECEIVED`) e busca por `resourceId`. Tabela com timestamp (pt-BR), action, resource id, user id e correlation id.
- FE-040 — Quando BE consumir `vistoria.status.changed` (handoff IN Sprint 08), a tela passa a refletir transições disparadas por parceiro automaticamente — sem mudança de FE.

### Dashboard

- FE-041 — `DashboardPage` reescrito: 3 KPIs ao vivo (`SOLICITADA`, `EM_EXECUCAO`, `CONCLUIDA`) consumindo `useVistorias` com `pageSize: 1` (só queremos o `total`). Cards de atalho para principais rotas.

### Layout

- FE-042 — `AdminLayout` atualizado com nav completa (Dashboard, Vistorias, Auditoria, Status), bloco de usuário com nome/email/roles vindo de `useMe`, botão de logout.

### UI primitives novos

- FE-043 — `components/ui/select.tsx` — `<select>` nativo estilizado, com forwardRef (usado em filtros e form). Comentário deixa explícito que pode virar `@radix-ui/react-select` se UX exigir busca.
- FE-044 — `components/ui/textarea.tsx` — `<textarea>` estilizado, com forwardRef (usado em cancelamento e observações).

### Roteamento

- FE-045 — `routes.tsx` — `/login` público, todo o resto sob `<RequireAuth><AdminLayout /></RequireAuth>`. Rotas: `/`, `/health`, `/vistorias`, `/vistorias/novo`, `/vistorias/:id`, `/audit`. `VistoriasPlaceholderPage` removido.

### Tests

- FE-046 — `auth/services/auth.service.test.ts` — 4 casos: persist+get, clear, JSON corrompido → null, shape inválido → null. Cobre a defesa contra localStorage corrompido.
- FE-047 — `vistorias/components/VistoriaStatusBadge.test.tsx` — 3 casos: label PT-BR para SOLICITADA, variant destructive para CANCELADA, variant success para CONCLUIDA.
- FE-048 — `auth/schemas/login.schema.test.ts` atualizado para o shape novo (sem `tenantSlug`): válido, e-mail inválido, senha <6, senha >72.

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

Endpoints do BE Sprint 07 todos consumidos. Schemas de webhook do IN Sprint 08 não exigem tela nova — chegam transparentemente em `/audit`.

## Validação Executada

| Comando                                       | Resultado                                                                     |
| --------------------------------------------- | ----------------------------------------------------------------------------- |
| `pnpm --filter @vistoria/api-contracts build` | ✅ 0 erros                                                                    |
| `pnpm --filter @vistoria/web typecheck`       | ✅ 0 erros                                                                    |
| `pnpm --filter @vistoria/web lint`            | ✅ 0 errors, 1 warning estético pré-existente em `button.tsx` (padrão Shadcn) |
| `pnpm --filter @vistoria/web test`            | ✅ 15 testes em 4 suites                                                      |

## Endpoints Consumidos

| Método | Rota                             | Auth | Origem       |
| ------ | -------------------------------- | ---- | ------------ |
| POST   | `/api/v1/auth/login`             | —    | BE Sprint 07 |
| GET    | `/api/v1/auth/me`                | JWT  | BE Sprint 07 |
| GET    | `/api/v1/vistorias`              | JWT  | BE Sprint 07 |
| GET    | `/api/v1/vistorias/:id`          | JWT  | BE Sprint 07 |
| POST   | `/api/v1/vistorias`              | JWT  | BE Sprint 07 |
| POST   | `/api/v1/vistorias/:id/cancelar` | JWT  | BE Sprint 07 |
| GET    | `/api/v1/audit-logs`             | JWT  | BE Sprint 07 |
| GET    | `/health`                        | —    | BE Sprint 02 |

## Pendente Para Outros Agentes

### BE (Sprint 11+)

1. **Listar transições** de uma vistoria — endpoint `GET /api/v1/vistorias/:id/transicoes` para o detalhe poder renderizar timeline da SAGA. Hoje o detalhe mostra só o estado atual + datas; a timeline ainda não tem fonte.
2. **Refresh token** — token JWT expira em 15min (handoff BE07). Hoje o FE só desloga em 401. Quando BE entregar `/auth/refresh`, o `api-client.ts` deve renovar transparentemente.
3. **Migrar token para httpOnly cookie** — `localStorage` é placeholder herdado do Sprint 04. Vira tarefa quando BE expuser o cookie no `/login`. Vai exigir ajuste de CSRF e do interceptor.
4. **Status counts agregados** — hoje o dashboard faz 3 chamadas paralelas a `GET /vistorias?status=...&pageSize=1` só para ler `total`. Quando o tráfego justificar, BE pode expor `GET /api/v1/vistorias/stats` retornando `{ SOLICITADA: n, EM_EXECUCAO: n, ... }`.

### IN (Sprint 12+)

- Sem pendência direta. Quando o BE consumir `vistoria.status.changed` do IN Sprint 08, `/audit` filtrando por `action=VISTORIA.STATUS_CHANGED` mostra as transições — sem mudança em FE.

### QI (Sprint 10)

1. **Playwright E2E** das telas novas. Cobertura atual (`apps/web/e2e/`) é só health/login skeleton. Sugestões priorizadas:
   - Login com seed (`admin@auxiliadorapredial.com.br` / `admin123`) → redirect → dashboard carrega KPIs.
   - Criar vistoria → redirect ao detalhe → cancelar → status `CANCELADA` aparece.
   - 401 em rota protegida (token removido manualmente) → redirect para `/login?next=...`.
2. **Build do FE no CI** — confirmar que `pnpm --filter @vistoria/web build` está no pipeline (Sprint 06 endureceu CI; vale conferir que a tela nova não inflou o bundle além do esperado).
3. **`VITE_API_BASE_URL`** no deploy estático quando QI provisionar hosting.

### DOC (Sprint 10)

- Consolidar este handoff em `docs/changelog/SPRINT-09.md`.
- `docs/architecture/c4-container.md` pode ganhar a seta `apps/web → apps/api (auth + vistorias + audit-logs)` saindo do estado "planejado".
- Eventualmente um ADR sobre **localStorage vs httpOnly cookie** quando BE entregar a migração — hoje seguimos com localStorage (decisão herdada do Sprint 04, ainda válida enquanto BE não expuser cookie).
- Atualizar `README.md` da raiz com a lista de telas funcionais (`/login`, `/vistorias`, `/audit` etc.) saindo do estado placeholder.

## Decisões Tomadas

- **Re-export do `LoginRequestSchema` em `login.schema.ts`** ao invés de redefinir — evita drift FE↔BE no caso do schema oficial evoluir. Documentado no comentário do arquivo.
- **`useMe` com `initialData` do localStorage** — primeira renderização do `AdminLayout` mostra o usuário sem flicker. O `fetchMe` ainda roda em background e atualiza se algo mudou no BE.
- **`getStoredUser` defensivo** — `try/catch` no `JSON.parse` + `safeParse` no shape. Storage corrompido vira `null` ao invés de quebrar a UI. Coberto por dois testes.
- **`Select` e `Textarea` nativos** ao invés de `@radix-ui/react-select` — admin interno, não precisa de combobox com busca. Documentado nos arquivos; trocar quando UX exigir.
- **Dashboard fazendo 3 chamadas paralelas** ao invés de bloquear esperando um endpoint agregado — aceitável para piloto, pedido para BE registrado acima.
- **`/audit` em vez de uma tela dedicada "Webhooks recebidos"** — auditoria é o mesmo dado, com filtros mais úteis para o time interno. Cumpre o pedido do handoff IN08 sem sobreposição de telas.

Nenhuma destas merece ADR isolado (são escolhas de implementação dentro de decisões já registradas — ADR-010, ADR-011, ADR-012). DOC pode mencionar no changelog se achar útil.

## Known Issues

1. **Sem timeline da SAGA no detalhe** — depende de endpoint de transições (pendência para BE acima). Hoje o detalhe mostra apenas o estado atual.
2. **`localStorage` para token** — segue herdado do Sprint 04. Migração esperada quando BE expuser cookie.
3. **Lint warning estético em `button.tsx`** — `buttonVariants` exportado junto com o componente (padrão Shadcn). Pré-existente do Sprint 04, não foi alterado nesta sprint.
4. **Dashboard com 3 chamadas paralelas** — não é problema de correção, mas vale endurecer com um endpoint agregado no futuro.
5. **Sem refresh token automático** — token expira em 15min e o usuário precisa logar de novo. Mitigado pelo redirect `?next=` preservar a rota.

## Breaking Changes

Nenhum em `@vistoria/api-contracts` (FE só consome). Em `apps/web`:

- `VistoriasPlaceholderPage` removido (rota `/vistorias` agora aponta para `VistoriasListPage` real).
- `auth.service` mudou de assinatura: `persistTokens(tokens)` → `persistSession(LoginResponse)`, `clearTokens()` → `clearSession()`. Não há consumidor externo desses helpers — só FE — então não impacta outros agentes.

## Próximo Sprint

**Sprint 10 — DOC**: consolidar changelog SPRINT-09, atualizar `c4-container.md` e `README.md` da raiz com as telas funcionais. Sem código.

Em seguida, **Sprint 11 — QI**: Playwright E2E das telas novas + investigação do `nest start --watch` flaky herdada do BE07. Detalhes nos pendentes acima.
