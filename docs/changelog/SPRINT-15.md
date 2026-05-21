# Sprint 15 — Changelog

**Período**: 2026-05-20
**Agente solo**: DOC (terceira volta do ciclo)
**Tema**: Consolidação documental do terceiro ciclo (Sprint 11–14). Zero alteração de código de negócio — DOC fecha o loop registrando o que QI/BE/IN/FE entregaram.

## Itens entregues

### 4 changelogs do ciclo

- [SPRINT-11.md](./SPRINT-11.md) — E2E ampliada (admin UI + 3 cenários novos de webhook), CI endurecida (seed pré-E2E, cache do Chromium), webServer Playwright agora sobe api **e** web. 15 testes Playwright (era 8).
- [SPRINT-12.md](./SPRINT-12.md) — Routing inline em `create` (vistoria nasce em ROTEADA), handler RMQ `vistoria.status.changed` (idempotente + guard terminal), endpoints `GET /vistorias/:id/transicoes` e `GET /vistorias/stats`, `POST /auth/refresh`. 30 unit tests + 20 E2E. ADR-014.
- [SPRINT-13.md](./SPRINT-13.md) — `eventId` no writer (UUID v4 + messageId AMQP + header), `InternoProvider` funcional (publica AGENDADA/CANCELADA via writer), `AgendamentoOrchestrator` dormente aguardando BE publicar `vistoria.routed`. 33 unit tests. ADR-015 + agent-sync IN→BE.
- [SPRINT-14.md](./SPRINT-14.md) — Refresh transparente no `apiClient` (singleton anti-thundering-herd), timeline da SAGA na detalhe, dashboard com 4 KPIs via `GET /vistorias/stats` (substitui 3 chamadas paralelas). 19 unit tests + 20 E2E.

Todos gerados a partir dos handoffs `SPRINT-11-QI`, `SPRINT-12-BE`, `SPRINT-13-IN`, `SPRINT-14-FE`. Sem contradição entre handoff e changelog. Frontmatter YAML correto em todos.

### Índices atualizados

- [docs/changelog/README.md](./README.md) ganhou linhas para SPRINT-11..15.
- [docs/decisions/README.md](../decisions/README.md) ganhou ADR-014 e ADR-015 no índice principal e nas seções "Backend" e "Integrações". `ADR-013 → ADR-015` traçam a evolução do contrato BE↔IN no broker.

### C4 Container atualizado

[docs/architecture/c4-container.md](../architecture/c4-container.md):

- Seta `RabbitMQ → apps/api` **saiu de "(planejado)" para "em produção"** — consume `vistoria.status.changed` desde S12.
- Seta nova `RabbitMQ → integrations` com label `consume vistoria.routed (integrations.events)` — `AgendamentoOrchestrator` da S13.
- Seta nova `apps/api → RabbitMQ` com label `publish vistoria.routed (planejado)` — pedido BE Sprint 16+; única seta que ainda fica como "planejado".
- Container `packages/integrations` ganhou "+ orchestrator" na descrição. `apps/api` ganhou menção ao consumer.
- Tabela de containers reflete as duas filas distintas (`apps-api.events` para BE, `integrations.events` para IN).
- Seção "Decisões que justificam o desenho" ganhou linhas para ADR-013, ADR-014, ADR-015.
- Seção "Fluxos atuais entre containers" recebeu 5 linhas novas refletindo as transições do ciclo 3 (refresh, stats, transicoes, eventId, consume `vistoria.routed`).
- Novo diagrama de sequência **"Fluxo async BE↔IN consolidado"** mostrando o ciclo completo `POST /vistorias → routing → vistoria.routed (planejado) → orchestrator → agendar() → vistoria.status.changed → consumer → AGENDADA`. Caixa cinza marca o passo único ainda planejado.

### README raiz atualizado

[README.md](../../README.md):

- Tabela "Painel admin" reflete os 4 KPIs (incluindo "Roteadas"), timeline da SAGA na detalhe, refresh transparente no login, vistorias nascem em `ROTEADA`.
- Tabela "Endpoints REST" ganhou 3 rotas novas (`POST /auth/refresh`, `GET /vistorias/stats`, `GET /vistorias/:id/transicoes`) e coluna "Entrou em" mapeando cada rota ao sprint de origem.

### Validação dos handoffs

Os 4 handoffs do terceiro ciclo (`SPRINT-11-QI`, `SPRINT-12-BE`, `SPRINT-13-IN`, `SPRINT-14-FE`) foram revistos contra os changelogs e contra o estado atual do código. Pendentes para outros agentes preservados nesta consolidação. Agent-sync `2026-05-20-from-in-to-be-vistoria-routed-event.md` ainda está aberto e é o item top do próximo ciclo.

## ADRs criados nesta sprint

Nenhum. As decisões do terceiro ciclo já foram registradas pelos agentes correspondentes:

- **ADR-014** (BE, S12) — Refresh token JWT stateless com claim `type`.
- **ADR-015** (IN, S13) — `eventId` no writer como identidade de dedup forward-compat.

Candidatos a ADR ainda não decididos (mencionados nos handoffs, pendentes de decisão real):

- **Cookie httpOnly** vs `localStorage` para o refresh — decisão FE quando BE expuser endpoint set-cookie (continua aberto; ADR-014 deixa a porta aberta para revisitar junto com persistência server-side do refresh).
- **Outbox pattern** para garantia transacional de publicação de eventos do BE — virou tema concreto com o agent-sync IN→BE. Não bloqueia a S16; quando dor de "vistoria roteada mas evento perdido" aparecer, vira ADR.
- **Dedup-by-eventId** no consumer (Redis SETEX ou tabela `processed_events`) — ADR-015 documenta o porquê do "ainda não". Vira ADR quando reabertura legítima da SAGA aparecer.

DOC apenas registra a existência destes candidatos — não decide.

## Breaking changes

Nenhum. DOC nunca toca código.

## Métricas

- 5 changelogs novos (SPRINT-11..15)
- 1 diagrama atualizado (`c4-container.md`) + 1 diagrama de sequência novo (fluxo async BE↔IN)
- README raiz: tabela de painel admin reescrita + 3 endpoints novos com coluna de origem
- 2 índices atualizados (changelog/README + decisions/README)
- 4 handoffs do terceiro ciclo validados
- 0 ADRs novos (sem decisão arquitetural nesta sprint)
- 0 mudanças de código

## Known issues encontrados durante a sprint

Registrados aqui para o QI do próximo ciclo (Sprint 16):

1. **BE ainda não publica `vistoria.routed`** — fecha o ciclo async BE→IN. Pedido em [agent-sync IN→BE](../agent-sync/2026-05-20-from-in-to-be-vistoria-routed-event.md). Único item da S15 que tem seta cinza no C4. Item top do BE Sprint 16.
2. **Refresh em `localStorage` (vulnerável a XSS)** — ADR-014 documenta; cookie httpOnly continua pendente.
3. **`InternoProvider.cancelar` não conhece `tenantId`** — assinatura da port `IVistoriaProvider.cancelar(externalId)` é breaking se mudada. Hoje publica com `tenantId: ""` (descartado silenciosamente pelo consumer). Vira pedido real quando cancelamento via interno entrar em uso.
4. **Sem dedup-by-eventId no consumer** — ADR-015 explica; evolução futura.
5. **DLX `vistoria.events.dlx`** em produção — pendente desde Sprint 03.
6. **Lint warning em `apps/web/src/components/ui/button.tsx`** — pré-existente; padrão Shadcn.

## Pedidos abertos

Repassados ao próximo ciclo via [SPRINT-15-DOC.md](../handoffs/SPRINT-15-DOC.md):

- **QI (Sprint 16)**: validar `dev:up` + `pnpm test:e2e` em CI após os commits da S12–14 (sprint validados localmente, CI nunca rodou as 20 specs juntas); ampliar a cobertura para o fluxo `vistoria.routed` quando BE publicar.
- **BE (Sprint 17)**: publicar `vistoria.routed` no `VistoriasService.create()` per agent-sync IN→BE. Sem migration; reusa `RmqPublisher`. Quando isso fechar, IN orchestrator sai do "dormente" e a timeline ganha 1 transição extra automaticamente.
- **IN (Sprint 18)**: avaliar idempotência do consumer (BE) baseada em `eventId` quando reabertura legítima aparecer; expor port BE→IN para `consultar()` do `InternoProvider` se virar caso real.
- **FE (Sprint 19)**: cookie httpOnly + persistência server-side do refresh (depende de ADR + BE expor endpoint); recharts quando a primeira série temporal entrar.

## Próximo sprint

**Sprint 16 — QI**: validação E2E ampliada para cobrir o ciclo `routed → agendar() → vistoria.status.changed → AGENDADA` quando BE publicar; investigar a flakiness do `nest start --watch` herdada da Sprint 07 (ainda no backlog).
