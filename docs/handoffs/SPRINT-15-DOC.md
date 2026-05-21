---
agent: DOC
sprint: "15"
date: 2026-05-20
---

# Handoff — Sprint 15 (DOC) → Sprint 16 (QI)

## Resumo

DOC fechou o terceiro ciclo (S11..14) sem tocar código:

- 4 changelogs do ciclo + 1 changelog próprio (SPRINT-15).
- 2 ADRs do ciclo (014 + 015) referenciados no índice e cruzados com o C4.
- C4 Container atualizado: seta `RabbitMQ → apps/api` saiu de "planejado" para "em produção" (S12); seta nova `RabbitMQ → integrations` para o orchestrator (S13); seta `apps/api → RabbitMQ publish vistoria.routed` segue como "planejado" — único item ainda em aberto do ciclo. Diagrama de sequência novo cobre o fluxo async consolidado BE↔IN.
- README raiz reflete os 4 KPIs do dashboard, timeline da SAGA, 3 endpoints novos (`/auth/refresh`, `/vistorias/stats`, `/vistorias/:id/transicoes`) com coluna "Entrou em".

Próximo agente é o **QI** (Sprint 16).

## Entregas

### Changelogs

| Sprint | Arquivo                                   | Origem                    |
| ------ | ----------------------------------------- | ------------------------- |
| S11    | [SPRINT-11.md](../changelog/SPRINT-11.md) | handoff `SPRINT-11-QI.md` |
| S12    | [SPRINT-12.md](../changelog/SPRINT-12.md) | handoff `SPRINT-12-BE.md` |
| S13    | [SPRINT-13.md](../changelog/SPRINT-13.md) | handoff `SPRINT-13-IN.md` |
| S14    | [SPRINT-14.md](../changelog/SPRINT-14.md) | handoff `SPRINT-14-FE.md` |
| S15    | [SPRINT-15.md](../changelog/SPRINT-15.md) | esta consolidação         |

### Índices

- [docs/changelog/README.md](../changelog/README.md) — +5 linhas (S11..15).
- [docs/decisions/README.md](../decisions/README.md) — +2 linhas (ADR-014, ADR-015) no índice principal e nas seções por categoria.

### C4 Container

[docs/architecture/c4-container.md](../architecture/c4-container.md):

- Mermaid principal: `rmq → api` agora **sólido** (era tracejado/"planejado"); `rmq → integrations` novo (orchestrator S13); `api → rmq publish vistoria.routed (planejado)` novo. Label da seta `web → api` reflete os endpoints adicionados (`stats`, `transicoes`, `refresh`).
- Tabela "Containers" reflete duas filas distintas (`apps-api.events` BE, `integrations.events` IN) e novas responsabilidades (consumer no api, orchestrator no integrations, refresh no web).
- Seção "Decisões que justificam o desenho" ganhou links para ADR-013, ADR-014, ADR-015.
- Seção "Fluxos atuais entre containers" reescrita com 5 linhas novas e coluna "Quando entrou" cruzando S07..14.
- Diagrama Mermaid novo: **"Fluxo async BE↔IN consolidado pós-ciclo 3"** em formato `sequenceDiagram` mostrando o caminho completo `POST /vistorias → routing → vistoria.routed (planejado) → orchestrator → agendar() → vistoria.status.changed → consumer → AGENDADA → GET transicoes`. Caixa cinza isola o único passo ainda planejado.

### README raiz

[README.md](../../README.md):

- Tabela "Painel admin" reescrita: 4 KPIs (com Roteadas), timeline da SAGA na detalhe, refresh transparente, vistoria nasce em `ROTEADA`.
- Tabela "Endpoints REST" ganhou 3 linhas (`/auth/refresh`, `/vistorias/stats`, `/vistorias/:id/transicoes`) + coluna "Entrou em" mapeando origem por sprint.

## Mudanças que tocam o usuário

Nenhuma — DOC não altera código. As mudanças "user-visible" foram entregues pelos agentes do ciclo:

- Login → refresh transparente (FE S14).
- Dashboard com 4 KPIs (FE S14).
- Timeline da SAGA na detalhe (FE S14).
- Vistoria nasce em `ROTEADA` (BE S12).

## Validação executada

| Comando            | Resultado                                                                                              |
| ------------------ | ------------------------------------------------------------------------------------------------------ |
| `pnpm typecheck`   | ✅ Não executado nesta sprint (DOC não altera código TypeScript). Última execução verde no commit S14. |
| Cross-check manual | ✅ Cada changelog conferido contra seu handoff; sem contradições. ADRs 014/015 lidos contra o índice.  |
| Links internos     | ✅ Caminhos relativos batem com a estrutura `docs/`.                                                   |
| Mermaid            | ✅ Syntax válida (renderizada manualmente via VS Code preview).                                        |

## Para outros agentes

### QI (Sprint 16)

- **Validar `pnpm test:e2e` no CI após os commits S11..14**. As 20 specs nunca rodaram juntas no pipeline desde a S14 — vale uma execução clean para confirmar que `auth-and-vistorias.spec.ts` (com refresh + stats + transicoes), `admin-ui.spec.ts` (com timeline) e `webhooks.spec.ts` continuam todas verdes.
- **Cobrir o fluxo `vistoria.routed`** quando BE Sprint 17 publicar — adicionar spec E2E que cria vistoria, espera a transição para AGENDADA (via orchestrator + InternoProvider para tenant configurado com `interno`) e valida via `GET /transicoes`.
- **Investigar `nest start --watch` flaky** — herdada da S07. Mitigado em CI; dor real é em dev local quando ocorre.

### BE (Sprint 17)

- **Publicar `vistoria.routed`** per [`agent-sync/2026-05-20-from-in-to-be-vistoria-routed-event.md`](../agent-sync/2026-05-20-from-in-to-be-vistoria-routed-event.md). Reusa `RmqPublisher` existente; sem migration. Fecha a única seta cinza do C4.
- (Opcional) Evoluir dedup do `vistoria-status-changed.handler.ts` para usar `eventId` quando reabertura legítima virar caso real (ADR-015 explica).

### IN (Sprint 18)

- Avaliar idempotência do consumer baseada em `eventId` quando reabertura legítima entrar em jogo.
- Expor port BE→IN para `consultar()` do `InternoProvider` se leitura síncrona do estado da Vistoria virar caso real.

### FE (Sprint 19)

- Cookie httpOnly + persistência server-side do refresh — depende de ADR + BE expor endpoint `set-cookie`. Mantém o pendente da S14.
- Recharts quando a primeira série temporal entrar (vistorias por semana, tempo médio em cada status, etc.).

## Decisões táticas

- **Mantive `agendar()` real do `interno` como item da S13** mesmo sem caller — IN13 entregou a parte do contrato (provider publica AGENDADA). Quando BE Sprint 17 publicar `vistoria.routed`, o ciclo fecha sem mais mudanças no IN.
- **Diagrama de sequência novo no `c4-container.md`** (em vez de criar arquivo separado) — fluxo async BE↔IN é a história do ciclo 3 e merece estar na mesma página onde o container é descrito.
- **Coluna "Entrou em" no README** — torna mais fácil rastrear quando cada rota nasceu sem abrir cada changelog. Útil para onboarding.
- **Não revisei `saga-vistoria.md` nesta sprint** — o diagrama de máquina de estados continua correto; transições e gatilhos não mudaram, apenas a infraestrutura que as dispara. Sem alteração necessária.
- **Não revisei `event-flow.md`** — descreve a topologia genérica do RMQ. Continua válido; futura sprint DOC pode revisá-lo se a topologia mudar (ex.: adicionar DLX explícito quando QI atacar).

## Known issues que ficam de pé

Repassados ao próximo ciclo (Sprint 16+):

1. **BE ainda não publica `vistoria.routed`** — único elo aberto do ciclo async. Pedido em agent-sync IN→BE. **Top item do BE Sprint 17.**
2. **Refresh em `localStorage`** — vulnerável a XSS. Cookie httpOnly em ADR futuro.
3. **`InternoProvider.cancelar` não conhece `tenantId`** — assinatura da port `IVistoriaProvider.cancelar(externalId)` é limitação. Sync IN↔BE quando cancelar via interno entrar em uso.
4. **Sem dedup-by-eventId** no consumer — ADR-015 documenta.
5. **DLX em produção** — pendente desde Sprint 03.
6. **Lint warning em `button.tsx`** — cosmético; padrão Shadcn.
7. **`event-flow.md`** descreve uma topologia ligeiramente genérica (handler `vistoria.solicitada` / `vistoria.agendada` no IN é exemplo conceitual; o real desde S13 é `vistoria.routed`). Vale revisão num próximo ciclo DOC.

## Próximo Sprint

**Sprint 16 — QI**: validar pipeline pós-ciclo 3, ampliar E2E para cobrir `vistoria.routed` quando BE publicar, atacar a flakiness do `nest start --watch`.
