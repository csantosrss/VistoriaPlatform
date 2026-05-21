# Sprint 14 — Changelog

**Período**: 2026-05-20
**Agente solo**: FE
**Tema**: Consumir os endpoints novos do BE12: refresh transparente no `apiClient`, timeline da SAGA na detalhe, dashboard via `/stats` com 4 KPIs.

## Itens entregues

### 1. Refresh transparente

Novo módulo de storage isolado para quebrar o ciclo `api-client ↔ auth.service`:

[`apps/web/src/features/auth/services/session-storage.ts`](../../apps/web/src/features/auth/services/session-storage.ts):

- `persistSession({ access, refresh, user, ... })` — grava 3 chaves em `localStorage`: `auth.access`, `auth.refresh`, `auth.user`.
- `clearSession()` remove as 3. Getters tipados para cada.
- Pure: zero dependência de axios. Serve tanto `apiClient` (interceptor) quanto `auth.service`.

[`apps/web/src/lib/api-client.ts`](../../apps/web/src/lib/api-client.ts):

- Interceptor de **response** detecta 401 (exceto em `/auth/login` ou `/auth/refresh` ou requests já retentadas via flag `_retry`).
- Em 401: faz `axios.post("/api/v1/auth/refresh", { refresh })` **bruto** (sem passar pelo interceptor → evita recursão), valida resposta com `RefreshResponseSchema`, persiste e retenta a request original com o novo access.
- **`refreshPromise` singleton**: múltiplas requests com 401 simultâneo compartilham o mesmo refresh em curso. Evita thundering herd.
- 401 em `/auth/refresh` → limpa sessão + redirect `/login?next=...`.
- 401 em `/auth/login` → propaga (credenciais inválidas — não derrubar sessão atual).

[`apps/web/src/features/auth/services/auth.service.ts`](../../apps/web/src/features/auth/services/auth.service.ts): re-exporta os helpers do `session-storage` (chamadores antigos seguem funcionando) + adiciona `refreshTokens(refresh)` para uso fora do interceptor.

### 2. Timeline da SAGA

[`apps/web/src/features/vistorias/components/VistoriaTransicoesTimeline.tsx`](../../apps/web/src/features/vistorias/components/VistoriaTransicoesTimeline.tsx):

- Renderiza lista vertical com ícone por status (`CircleCheck` para CONCLUIDA/LAUDO_APROVADO, `AlertCircle` para CANCELADA, `CircleDot` no último, `Circle` nos intermediários), texto `"De → Para"` (ou só `"Para"` quando `de` é null), timestamp `pt-BR` e `motivo` quando presente.
- Cores: vermelho/CANCELADA, verde/CONCLUIDA-LAUDO_APROVADO, primário/demais.
- Estados: `Skeleton` em loading, mensagem tipada em erro, mensagem "Nenhuma transição registrada ainda." quando vazio.

Hook [`use-vistoria-transicoes.ts`](../../apps/web/src/features/vistorias/hooks/use-vistoria-transicoes.ts) + service `getVistoriaTransicoes(id)` em [`vistorias.service.ts`](../../apps/web/src/features/vistorias/services/vistorias.service.ts) com `ListVistoriaTransicoesResponseSchema.parse`. Plugado em [`VistoriaDetailPage.tsx`](../../apps/web/src/features/vistorias/VistoriaDetailPage.tsx) como card "Timeline" na coluna lateral, acima do "Cancelar".

### 3. Dashboard via `/stats`

[`apps/web/src/features/dashboard/DashboardPage.tsx`](../../apps/web/src/features/dashboard/DashboardPage.tsx):

- 1 query (`useVistoriasStats`) alimenta **4 cards** (era 3, com 3 chamadas paralelas):
  - **Solicitadas** = `byStatus.SOLICITADA` (segue útil — flagram vistorias que falharam no routing).
  - **Roteadas** = `byStatus.ROTEADA` (KPI novo — visibilidade do estado intermediário).
  - **Em execução** = `byStatus.AGENDADA + CONFIRMADA + EM_EXECUCAO` (visão consolidada de "está rolando").
  - **Concluídas** = `byStatus.LAUDO_APROVADO + CONCLUIDA` (final feliz; CANCELADA fora).
- Layout: `md:grid-cols-2 xl:grid-cols-4`.
- `staleTime: 30s` — KPIs não precisam real-time. Dedupado pelo Tanstack Query via queryKey `["vistorias","stats"]`.

Hook [`use-vistorias-stats.ts`](../../apps/web/src/features/vistorias/hooks/use-vistorias-stats.ts) + service `getVistoriasStats()` com `VistoriaStatsResponseSchema.parse`.

### Não entregue nesta sprint

- **Cookie httpOnly** — decisão pendente. Refresh continua em `localStorage` (vulnerável a XSS). Será ADR futuro junto com persistência server-side do refresh.
- **Recharts** — adiado. Nenhum KPI atual precisa de gráfico (todos numéricos). Revisitamos quando série temporal entrar (vistorias por semana, etc.).

## Testes

- **Unit (`apps/web`)**: 19 testes (era 15).
  - `auth.service.test.ts` reescrito para o shape novo do `LoginResponse` (com `refresh` + `refreshExpiresIn`) + cobrir `getStoredRefresh`.
  - `VistoriaTransicoesTimeline.test.tsx` novo (2): renderização com transições + estado vazio.
  - `DashboardPage.test.tsx` novo (2): KPIs leem do agregado com somas corretas; helper `kpiValue` localiza valor dentro do card por título (robusto à colisão de textos repetidos no DOM).
- **E2E**: `admin-ui.spec.ts` atualizado — `login carrega dashboard com KPIs` agora afirma os 4 títulos (era 3 + "Roteadas"); `criar vistoria → detalhe → cancelar` afirma também `<h>Timeline</h>` visível + `Solicitada → Roteada`. Total Playwright: 20 testes.

## Endpoints consumidos

Sem novos endpoints — todos vêm do BE12:

- `GET /api/v1/vistorias/stats`
- `GET /api/v1/vistorias/:id/transicoes`
- `POST /api/v1/auth/refresh`

## Breaking changes

- **Sessão**: usuários logados antes da S14 só têm `auth.access` e `auth.user` no `localStorage`. Sem `auth.refresh`, o interceptor cai no fluxo "sem refresh → redirect para login" no primeiro 401. Aceitável (logam de novo).
- **Dashboard**: visualmente passou de 3 para 4 KPIs.
- **Detalhe**: agora mostra a timeline da SAGA. Vistorias antigas com histórico parcial mostram só o que houver.

## Métricas

- 14 arquivos commitados, +733 / −99 LoC
- 19 unit tests (era 15)
- 0 endpoints novos (apenas consumo do BE12)
- 0 ADRs novos
- 0 alterações em `apps/api` (boundary respeitado)

## Decisões táticas (sem ADR)

- **`session-storage.ts` como módulo separado** — quebra o ciclo de imports `api-client ↔ auth.service`. Pure (zero axios).
- **Refresh com `axios.post` cru no interceptor** — evita recursão sem flag de skip. Mais simples.
- **`refreshPromise` singleton** (não Map por url) — só pode haver um refresh em voo por vez. Sob carga, 10 requests com 401 → 1 refresh ao BE; outras 9 esperam.
- **`RefreshResponseSchema` strict no client** — se BE divergir, falha previsivelmente.
- **CANCELADA não entra em nenhum KPI** — estado terminal "ruim"; gestor abre lista filtrada para isso.
- **"Em execução" agrupa 3 status** (AGENDADA + CONFIRMADA + EM_EXECUCAO) — granularidade fica na timeline e na lista.

## Known issues que ficam de pé

1. **Cookie httpOnly** — refresh em `localStorage` vulnerável a XSS. Decisão pendente (ADR futuro). Mitigação: TTL curto (7d) + reauth manual no logout.
2. **Logout não invalida refresh server-side** — sem revogação stateful (ADR-014). Limpar `localStorage` no logout (já feito) é só client-side.
3. **Vistorias antigas (pré-S12) sem `null → SOLICITADA`** podem aparecer com timeline vazia. Job retroativo opcional, sem bloqueio.
4. **Lint warning pré-existente em `button.tsx`** — `buttonVariants` exportado junto com o componente (padrão Shadcn). Cosmético; desde Sprint 04.

## Pedidos abertos

Detalhados em [SPRINT-14-FE.md](../handoffs/SPRINT-14-FE.md):

- **DOC (Sprint 15)**: consolidar changelogs 11–14, ADRs 14–15 no índice, atualizar `c4-container.md`.
- **BE (Sprint 16+)**: publicar `vistoria.routed` per agent-sync da S13. Fecha o ciclo async — IN→FE timeline ganha uma transição automática nova sem mudança no FE.

## Próximo sprint

**Sprint 15 — DOC**: consolidação documental do terceiro ciclo (SPRINT-11..14 + ADRs 14–15 + C4 atualizado).
