---
agent: FE
sprint: "14"
date: 2026-05-20
---

# Handoff — Sprint 14 (FE) → Sprint 15 (DOC)

## Resumo

FE consumiu os endpoints novos do BE12 e fechou 3 das 4 pendências herdadas:

1. **Refresh transparente** — interceptor do `apiClient` renova access via `POST /auth/refresh` em respostas 401 e retenta a request original. Refresh persistido em `localStorage` ao lado do access.
2. **Timeline da SAGA** — componente `VistoriaTransicoesTimeline` na página de detalhe consome `GET /vistorias/:id/transicoes`.
3. **Dashboard via `/stats`** — DashboardPage faz **uma** chamada agregada (`GET /vistorias/stats`) que serve **4 KPIs** (Solicitadas, Roteadas, Em execução, Concluídas). Substitui as 3 chamadas paralelas a `?status=X&pageSize=1` da Sprint 09.

Não entreguei nesta sprint:

- **Cookie httpOnly** — decisão pendente (ADR futuro). Mantemos refresh em `localStorage`.
- **Recharts** — adiado; nenhum KPI atual precisa de gráfico (todos são cards numéricos). Quando uma série temporal entrar (ex.: vistorias por semana), revisitamos.

Próximo agente é o **DOC** (Sprint 15).

## Entregas

### 1. Refresh transparente

Novo módulo de storage isolado para quebrar o ciclo de imports entre `api-client` e `auth.service`:

[`apps/web/src/features/auth/services/session-storage.ts`](../../apps/web/src/features/auth/services/session-storage.ts):

- `persistSession({ access, refresh, user, ... })` — grava 3 chaves no `localStorage`: `auth.access`, `auth.refresh`, `auth.user`.
- `clearSession()` — remove as 3.
- `getStoredToken()`, `getStoredRefresh()`, `getStoredUser()` — leitura tipada.
- Pure: zero dependência de axios; serve tanto ao `apiClient` (interceptor) quanto ao `auth.service`.

[`apps/web/src/features/auth/services/auth.service.ts`](../../apps/web/src/features/auth/services/auth.service.ts):

- Re-exporta os helpers do `session-storage` (compat — chamadores antigos `import { persistSession } from "auth.service"` seguem funcionando).
- `refreshTokens(refresh)` novo — chama `POST /auth/refresh` e valida resposta com `RefreshResponseSchema`. (Não usado diretamente pelo interceptor; o interceptor tem sua própria chamada axios "crua" para evitar recursão; ver abaixo.)

[`apps/web/src/lib/api-client.ts`](../../apps/web/src/lib/api-client.ts):

- Interceptor de **request**: adiciona `Authorization: Bearer <access>` quando há token armazenado (mantido — só refatorado para usar `getStoredToken()` do `session-storage`).
- Interceptor de **response**:
  - Se status === 401 **e** request não é de `/auth/login` ou `/auth/refresh` **e** não foi já retentada (flag `_retry`), tenta refresh.
  - Refresh é feito via `axios.post(...)` **bruto** (sem passar pelo interceptor — evita recursão), valida resposta com `RefreshResponseSchema`, persiste e refaz a request original com o novo access.
  - **Concorrência**: usa `refreshPromise` singleton — múltiplas requests que dispararem 401 simultâneo compartilham o mesmo refresh em curso. Evita "thundering herd" de refresh.
  - 401 em `/auth/refresh` → limpa sessão + redirect para `/login?next=...`.
  - 401 em `/auth/login` → propaga como erro (credenciais inválidas — não derrubar sessão atual).
  - Erro no refresh em si → limpa sessão + redirect.

`RequireAuth` e `useLogout` não precisaram mudar — continuam apontando para `getStoredToken()` e `clearSession()` (que agora ficam no `session-storage` mas seguem reexportados via `auth.service`).

### 2. Timeline da SAGA

[`apps/web/src/features/vistorias/components/VistoriaTransicoesTimeline.tsx`](../../apps/web/src/features/vistorias/components/VistoriaTransicoesTimeline.tsx):

- Renderiza lista vertical com:
  - Ícone por status (`CircleCheck` para CONCLUIDA/LAUDO_APROVADO, `AlertCircle` para CANCELADA, `CircleDot` para o último, `Circle` para os intermediários).
  - Texto `"De → Para"` (ou só `"Para"` quando `de` é null, ou seja, transição inicial).
  - Timestamp `pt-BR`.
  - `motivo` exibido como bloco secundário quando presente.
- Cor de destaque do ícone varia: vermelho para CANCELADA, verde para LAUDO_APROVADO/CONCLUIDA, primário para demais.
- Estados: `Skeleton` em loading, mensagem de erro tipada em isError, mensagem "Nenhuma transição registrada ainda." quando array vazio.

[`apps/web/src/features/vistorias/hooks/use-vistoria-transicoes.ts`](../../apps/web/src/features/vistorias/hooks/use-vistoria-transicoes.ts) — `useQuery` simples; `enabled: !!id`.

[`apps/web/src/features/vistorias/services/vistorias.service.ts`](../../apps/web/src/features/vistorias/services/vistorias.service.ts) ganhou `getVistoriaTransicoes(id)` que faz `GET /api/v1/vistorias/:id/transicoes` e valida com `ListVistoriaTransicoesResponseSchema`.

Plugue no detalhe: [`VistoriaDetailPage.tsx`](../../apps/web/src/features/vistorias/VistoriaDetailPage.tsx) agora tem o `<Card>` "Timeline" na coluna lateral, acima do "Cancelar".

### 3. Dashboard via `/stats`

[`apps/web/src/features/dashboard/DashboardPage.tsx`](../../apps/web/src/features/dashboard/DashboardPage.tsx):

- 1 query (`useVistoriasStats`) alimenta **4 cards**:
  - **Solicitadas** = `byStatus.SOLICITADA` (continua útil mesmo com routing inline — flags vistorias que falharam no routing ou que IN reverteu).
  - **Roteadas** = `byStatus.ROTEADA` (KPI novo — vistorias prontas para `agendar()`).
  - **Em execução** = `byStatus.AGENDADA + CONFIRMADA + EM_EXECUCAO` (visão de "está rolando" do gestor — qualquer estado entre agendamento e execução).
  - **Concluídas** = `byStatus.LAUDO_APROVADO + CONCLUIDA` (final feliz; CANCELADA fica fora).
- Layout responsive: `md:grid-cols-2 xl:grid-cols-4`.
- Mesmo `useQuery` é dedupado pelo Tanstack Query (queryKey `["vistorias","stats"]`) — não há fan-out de chamadas paralelas.
- `staleTime: 30s` evita refetch agressivo (KPIs não precisam de real-time).

[`apps/web/src/features/vistorias/hooks/use-vistorias-stats.ts`](../../apps/web/src/features/vistorias/hooks/use-vistorias-stats.ts) — `useQuery` com staleTime + queryFn.

[`apps/web/src/features/vistorias/services/vistorias.service.ts`](../../apps/web/src/features/vistorias/services/vistorias.service.ts) ganhou `getVistoriasStats()` que faz `GET /api/v1/vistorias/stats` e valida com `VistoriaStatsResponseSchema`.

### 4. Testes

- **Unit (vitest, apps/web)**: 19 testes, todos verdes (era 15).
  - `auth.service.test.ts` reescrito: `persistSession`/`clearSession`/`getStoredRefresh` cobrindo o shape novo do `LoginResponse` (com `refresh` + `refreshExpiresIn`).
  - `VistoriaTransicoesTimeline.test.tsx` novo (2): renderização com transições e estado vazio. Mock de `getVistoriaTransicoes` via `vi.mock`.
  - `DashboardPage.test.tsx` novo (2): KPIs leem do agregado com somas corretas; agregação compartilhada entre os 4 cards (helper `kpiValue` localiza valor dentro do card por título — robusto à colisão de textos repetidos no DOM).

- **E2E (Playwright)**: spec `admin-ui.spec.ts` atualizada:
  - `login carrega dashboard com KPIs` agora afirma os 4 títulos (era 3 — adicionado "Roteadas").
  - `criar vistoria → detalhe → cancelar` agora afirma também `<h>Timeline</h>` visível + texto `Solicitada → Roteada` no detalhe.
- Sem novos testes E2E — a cobertura segue 20.

## Mudanças que tocam o usuário

- **Sessão**: usuários logados antes da Sprint 14 só têm `auth.access` e `auth.user` no `localStorage`. Sem `auth.refresh`, o interceptor cai no fluxo "sem refresh disponível → redirect para login" no primeiro 401. Aceitável (logam de novo).
- **Dashboard**: visualmente passou de 3 para 4 KPIs (`Roteadas` entrou). Layout responsive ajustado para acomodar.
- **Detalhe da vistoria**: agora mostra a timeline da SAGA. Vistorias antigas (criadas antes da Sprint 12 BE) que tinham só `null → SOLICITADA` registrada continuam exibindo só essa entrada — não tem como reconstruir o histórico ausente.

## Validação executada

| Comando                            | Resultado                                                                 |
| ---------------------------------- | ------------------------------------------------------------------------- |
| `pnpm typecheck`                   | ✅ 6 workspaces, 0 erros                                                  |
| `pnpm --filter @vistoria/web test` | ✅ 6 suites, 19 testes (era 15)                                           |
| `pnpm --filter @vistoria/web lint` | ⚠️ 1 warning pré-existente em `button.tsx` (não introduzido nesta sprint) |
| `pnpm --filter @vistoria/api test` | ✅ Sem regressão (30 testes)                                              |

E2E não executado localmente (Docker fora). CI valida no push.

## Para outros agentes

### DOC (Sprint 15)

- Consolidar changelogs **SPRINT-11 a SPRINT-14**.
- ADRs novos do ciclo: **ADR-014** (refresh stateless, BE12), **ADR-015** (eventId no writer, IN13). Linkar em `docs/decisions/README.md`.
- Atualizar `docs/architecture/c4-container.md`:
  - Remover "(planejado)" da seta `RabbitMQ → apps/api` (Sprint 12 BE adicionou o consumer).
  - Adicionar consumer `AgendamentoOrchestrator` (Sprint 13 IN) e seu binding `vistoria.routed`.
- Sugestão de novo diagrama Mermaid: SAGA com setas de evento entre BE↔IN (publish/consume) para deixar o fluxo async visível.

### BE (Sprint 16 quando rolar)

- Publicar `vistoria.routed` per [`agent-sync/2026-05-20-from-in-to-be-vistoria-routed-event.md`](../agent-sync/2026-05-20-from-in-to-be-vistoria-routed-event.md). Continua sendo o item mais alto valor para fechar o loop async.
- Quando o ciclo `ROTEADA → AGENDADA` estiver fechado pelo broker, a timeline do FE ganha 1 transição automática nova — sem mudança no FE.

### IN (futuro)

- Sem pendência direta. Quando reabertura legítima da SAGA virar caso real, alinhar com BE o dedup-by-eventId (ADR-015).

## Decisões táticas

- **`session-storage.ts` como módulo separado** — quebra o ciclo `api-client ↔ auth.service`. Não é só estética: sem isso, o interceptor não consegue ler/escrever tokens sem reimportar o `apiClient` que ele está dentro.
- **Refresh com `axios.post` cru** (não via `apiClient`) dentro do interceptor — evita recursão garantida em runtime, mais simples que flag de "skip interceptor".
- **`refreshPromise` singleton** (não `Map` por url) — só pode haver um refresh em voo por vez. Sob carga, 10 requests simultâneas que recebem 401 disparam **1** refresh; as 9 outras esperam. Pattern padrão.
- **`RefreshResponseSchema` strict no client** — se BE divergir do contrato, falha no parse e cai no caminho de erro (limpa sessão + login). Melhor que silenciosamente aceitar um shape desconhecido.
- **Não somei CANCELADA em nenhum KPI** — vistorias canceladas são um estado terminal "ruim"; gestor que quer ver cancelamentos abre a lista filtrada. Adicionar um KPI separado se virar pedido.
- **KPI "Em execução" agrupa 3 status** (AGENDADA + CONFIRMADA + EM_EXECUCAO) — semanticamente "está em andamento". Granularidade fica na timeline / lista.

## Known Issues

Herdadas (mantêm-se abertas):

1. **Cookie httpOnly** — refresh em `localStorage` continua vulnerável a XSS. Decisão pendente (ADR futuro). Mitigação atual: TTL curto do refresh (7d default) + reauth manual no logout.
2. **`nest start --watch` flaky** — mitigado em CI.

Novas:

3. **Refresh com 2 requests em paralelo recebendo 401 e ambas vão tentar retentar a request original** — o `refreshPromise` singleton garante que só 1 chamada ao BE é feita, mas as duas requests originais são refeitas independentemente. Em prática isso é o comportamento desejado (cada uma precisa do response real). Caso evolua para um sistema de fila de requests pendurar e refazer só após refresh OK, vale uma camada acima.
4. **Vistorias antigas (pré-BE12) sem `null → SOLICITADA` registrado** podem aparecer com timeline vazia se também não tiveram routing aplicado retroativamente. Caso virar pedido, é job one-off (não bloqueia).
5. **Botão "Sair" não invalida refresh server-side** — sem revogação stateful (ADR-014 documenta), o refresh continua válido até expirar. Mitigação: limpar `localStorage` no logout (já feito).

## Próximo Sprint

**Sprint 15 — DOC**: consolidar changelogs 11–14, ADRs 14–15, atualizar C4 com o caminho async BE↔IN.
