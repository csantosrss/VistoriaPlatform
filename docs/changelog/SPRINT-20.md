# Sprint 20 — Changelog

**Período**: 2026-05-21
**Agente solo**: DOC (quarta volta do ciclo)
**Tema**: Consolidação documental do ciclo 4 (Sprint 16–19). Sem alteração de código.

## Itens entregues

### 4 changelogs do ciclo

- [SPRINT-16.md](./SPRINT-16.md) — QI: DLX/DLQ explícitos via `definitions.json`, E2E injection do orchestrator BE↔IN, investigação documentada do `nest --watch`. 21 testes Playwright (era 20).
- [SPRINT-17.md](./SPRINT-17.md) — BE: 9 endpoints novos (Users CRUD + AgendaSlot CRUD), 1 migration, 49 unit (era 30), 26 E2E (era 21). Decisões de produto via `AskUserQuestion`.
- [SPRINT-18.md](./SPRINT-18.md) — IN: `cancelar(CancelarDto)` resolve `tenantId: ""` herdado da S13; `vistoriadorId?` opcional em events/DTOs forward-compat.
- [SPRINT-19.md](./SPRINT-19.md) — FE: telas `/users` + `/users/novo` + `/users/:id` + `/vistoriadores/:id/agenda` + item de navegação "Usuários".

### Índices atualizados

- [docs/changelog/README.md](./README.md) ganhou 5 linhas (S16..20).
- `docs/decisions/README.md` sem alteração — não houve ADRs novos no ciclo (decisões de produto via `AskUserQuestion`, decisões táticas dentro dos handoffs).

### C4 Container atualizado

[docs/architecture/c4-container.md](../architecture/c4-container.md):

- Tabela "Containers" ganhou menção a Users CRUD + AgendaSlot CRUD no `apps/api`.
- Tabela "Fluxos atuais entre containers" ganhou linha para os endpoints novos do BE17 e telas do FE19.
- Última seta cinza `apps/api → vistoria.routed (planejado)` **continua aberta** — BE17 priorizou o escopo de produto; agent-sync IN→BE da S13 segue válido para BE21+.
- Diagrama de sequência consolidado BE↔IN da S15 mantém-se (passo cinza inalterado).

### README raiz atualizado

[README.md](../../README.md):

- Painel admin: linha nova "Usuários" e "Agenda do vistoriador" na tabela de telas.
- Endpoints REST: 9 linhas novas (Users CRUD + Agenda CRUD), todas marcadas "S17" na coluna "Entrou em".

### Validação dos handoffs

Os 4 handoffs do quarto ciclo (`SPRINT-16-QI`, `SPRINT-17-BE`, `SPRINT-18-IN`, `SPRINT-19-FE`) foram revistos contra os changelogs e contra o estado atual do código. Pendentes para outros agentes preservados. Agent-sync `2026-05-20-from-in-to-be-vistoria-routed-event.md` segue aberto e é o item top do próximo ciclo (BE21).

## ADRs criados nesta sprint

Nenhum. O ciclo 4 também não produziu ADRs — as decisões foram:

- **Decisões de produto** (S17 BE): via `AskUserQuestion` antes da implementação — permissão ADMIN/GESTOR para agenda, slot com flag `disponivel`, sem integração com routing. Documentadas nos handoffs.
- **Decisões táticas** (S16 QI, S17 BE, S18 IN, S19 FE): nos respectivos handoffs.

Candidatos a ADR ainda em aberto:

- **Cookie httpOnly** para o refresh — herdado do ciclo 3.
- **Outbox pattern** quando `vistoria.routed` perder mensagens.
- **Dedup-by-eventId** quando reabertura legítima da SAGA virar real.
- **Calendário visual da agenda** se virar pedido (react-big-calendar vs grid CSS).

DOC só registra a existência destes candidatos — não decide.

## Breaking changes

Nenhum. DOC nunca toca código.

## Métricas

- 5 changelogs novos (SPRINT-16..20).
- 1 diagrama atualizado (`c4-container.md`).
- 1 README atualizado (telas + endpoints).
- 4 handoffs do quarto ciclo validados.
- 0 ADRs novos.

## Known issues que ficam de pé

Cumulativos dos ciclos 3 e 4:

1. **BE ainda não publica `vistoria.routed`** — único elo cinza no C4. Item top do BE Sprint 21.
2. **Refresh em `localStorage`** — vulnerável a XSS. ADR futuro com cookie httpOnly.
3. **DLX declarado, sem alarme em DLQ size > 0** — espera Prometheus.
4. **Sem dedup-by-eventId** no consumer — ADR-015 explica.
5. **Slot não detecta sobreposição** — aceitável v1.
6. **Sem testes unitários de Users/Agenda no FE** — confiou no contrato Zod.
7. **`UserForm` sem campo de `active`** — desativação só no detalhe.
8. **Sem auto-cadastro público de usuários** — só ADMIN/GESTOR cria.
9. **Senha em texto plano no body de `POST /users`** — HTTPS-only mitiga; sem audit do body.
10. **`event-flow.md`** descreve handlers conceituais que não batem com a topologia real — vale revisão DOC no próximo ciclo.
11. **Lint warning em `button.tsx`** — cosmético.

## Pedidos abertos

Repassados via [SPRINT-20-DOC.md](../handoffs/SPRINT-20-DOC.md):

- **QI (Sprint 21)**: validar `pnpm test:e2e` pós-ciclo 4 (26 specs); adicionar E2E browser-based de `/users/novo` → criar vistoriador → cadastrar agenda; cobrir `vistoria.routed` quando BE publicar.
- **BE (Sprint 22)**: publicar `vistoria.routed` per agent-sync S13; avaliar integração routing↔agenda se produto pedir; endpoint dedicado de reset de senha (evitar plain-text no PATCH).
- **IN (Sprint 23)**: idempotência por eventId quando reabertura da SAGA virar real; port BE→IN para `consultar()` do InternoProvider.
- **FE (Sprint 24)**: cookie httpOnly + persistência server-side do refresh; calendário visual da agenda se volume crescer; testes unitários de Users/Agenda.

## Próximo sprint

**Sprint 21 — QI**: começo do ciclo 5. Validação pós-ciclo 4 + cobertura para o fluxo `/users/agenda` no painel + investigação contínua de flakiness onde for.
