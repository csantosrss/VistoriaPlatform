---
agent: DOC
sprint: "20"
date: 2026-05-21
---

# Handoff — Sprint 20 (DOC) → Sprint 21 (QI)

## Resumo

DOC fechou o quarto ciclo (S16..S19) sem tocar código:

- 4 changelogs do ciclo + 1 changelog próprio (SPRINT-20).
- Índices atualizados (changelog/README +5 linhas).
- C4 Container ganhou linha nova de fluxo (REST users + agenda) e descrição atualizada dos containers.
- README raiz com 2 telas novas + 9 endpoints novos no painel.
- 0 ADRs novos no ciclo.

Próximo agente é o **QI** (Sprint 21) — começo do ciclo 5.

## Entregas

### Changelogs

| Sprint | Arquivo                                   | Origem                    |
| ------ | ----------------------------------------- | ------------------------- |
| S16    | [SPRINT-16.md](../changelog/SPRINT-16.md) | handoff `SPRINT-16-QI.md` |
| S17    | [SPRINT-17.md](../changelog/SPRINT-17.md) | handoff `SPRINT-17-BE.md` |
| S18    | [SPRINT-18.md](../changelog/SPRINT-18.md) | handoff `SPRINT-18-IN.md` |
| S19    | [SPRINT-19.md](../changelog/SPRINT-19.md) | handoff `SPRINT-19-FE.md` |
| S20    | [SPRINT-20.md](../changelog/SPRINT-20.md) | esta consolidação         |

### Índices

- [docs/changelog/README.md](../changelog/README.md) — +5 linhas (S16..S20).
- `docs/decisions/README.md` — sem alteração (ciclo 4 não produziu ADRs).

### C4 Container

[docs/architecture/c4-container.md](../architecture/c4-container.md):

- Tabela "Containers" — descrição do `apps/api` e `apps/web` ganhou menção a Users + Agenda CRUD (S17/S19).
- Tabela "Fluxos atuais entre containers" — linha nova para `apps/web → apps/api REST /users + /vistoriadores/:id/agenda`.
- Última seta cinza (`apps/api → vistoria.routed (planejado)`) **continua aberta** — BE17 priorizou escopo de produto; agent-sync IN→BE da S13 segue válido para BE Sprint 22+.

### README raiz

[README.md](../../README.md):

- Tabela "Painel admin" ganhou 2 linhas: `/users` e `/vistoriadores/:id/agenda` (S19).
- Tabela "Endpoints REST" ganhou 9 linhas (Users CRUD + Agenda CRUD), todas mapeadas com "S17".

### Validação dos handoffs

Os 4 handoffs do quarto ciclo foram revistos contra os changelogs e o estado do código. Sem contradições. Pendentes para outros agentes preservados.

## Mudanças que tocam o usuário

Nenhuma — DOC não altera código. As mudanças "user-visible" foram entregues pelos agentes do ciclo:

- DLX/DLQ declarados no boot do RabbitMQ (QI S16).
- Endpoints Users + Agenda (BE S17).
- Provider `cancelar(CancelarDto)` (IN S18) — breaking minor de port, sem caller em produção.
- Telas `/users` e `/vistoriadores/:id/agenda` no painel (FE S19).

## Validação executada

| Comando            | Resultado                                                           |
| ------------------ | ------------------------------------------------------------------- |
| `pnpm typecheck`   | ✅ Não executado nesta sprint. Última execução verde no commit S19. |
| Cross-check manual | ✅ Cada changelog conferido contra seu handoff. Sem contradições.   |
| Links internos     | ✅ Caminhos relativos batem com a estrutura `docs/`.                |

## Para outros agentes

### QI (Sprint 21)

- Validar `pnpm test:e2e` pós-ciclo 4 (26 specs). As novas — `users-and-agenda.spec.ts` (S17) e `vistoria-routed-orchestrator.spec.ts` (S16) — não foram executadas juntas no CI ainda.
- E2E browser-based de `/users/novo` → criar vistoriador → `/vistoriadores/:id/agenda` → cadastrar slot.
- Cobertura para `vistoria.routed` quando BE Sprint 22 publicar (simplificar a injection do S16).
- Considerar começar a esteira de Prometheus + Grafana para alarme em DLQ size > 0 (pendência S16).

### BE (Sprint 22)

- **Publicar `vistoria.routed`** per [`agent-sync/2026-05-20-from-in-to-be-vistoria-routed-event.md`](../agent-sync/2026-05-20-from-in-to-be-vistoria-routed-event.md). Único item cinza no C4.
- Endpoint dedicado de reset de senha (evitar plain-text no PATCH atual).
- Integração routing↔agenda se produto pedir atribuição automática.

### IN (Sprint 23)

- Idempotência por `eventId` no consumer quando reabertura legítima da SAGA virar caso real (ADR-015).
- Port BE→IN para `consultar()` do `InternoProvider`.

### FE (Sprint 24)

- Cookie httpOnly + persistência server-side do refresh (depende de ADR + BE expor).
- Calendário visual da agenda se volume crescer (react-big-calendar ou grid CSS).
- Testes unitários de Users/Agenda.

## Decisões táticas

- **Não revisei `event-flow.md` nesta sprint** — mantém handlers conceituais (`vistoria.solicitada`/`vistoria.agendada`). Vale revisão no DOC do ciclo 5 quando BE publicar `vistoria.routed` e a topologia ficar 100% real.
- **C4 mantém o fluxo de sequência da S15** — o passo cinza (BE publicar `vistoria.routed`) segue inalterado neste ciclo.

## Known issues herdados

Lista cumulativa repassada ao ciclo 5:

1. BE ainda não publica `vistoria.routed` — single elo cinza.
2. Refresh em `localStorage`.
3. DLX declarado, sem alarme em DLQ size > 0.
4. Sem dedup-by-eventId.
5. Slot não detecta sobreposição.
6. Sem testes unitários de Users/Agenda no FE.
7. `UserForm` sem campo de `active`.
8. Sem auto-cadastro público.
9. Senha em texto plano em `POST /users`.
10. `event-flow.md` desatualizado.
11. Lint warning em `button.tsx`.

## Próximo Sprint

**Sprint 21 — QI**: começo do ciclo 5. Validação pós-ciclo + cobertura E2E browser-based para Users/Agenda + esteira de observabilidade (Prometheus/Grafana se for prioridade).
