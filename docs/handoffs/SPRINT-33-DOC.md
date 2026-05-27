---
agent: DOC
sprint: "33"
date: 2026-05-27
---

# Handoff — Sprint 33 (DOC) → Sprint 34 (QI)

## Resumo

Fechamento do **ciclo corretivo abreviado** que rodou QI31 → BE32 →
DOC33 (IN e FE pulados, no-op declarado).

- 3 changelogs novos (S31, S32, S33).
- ADR-016 ganha adendo sobre `VERSION_NEUTRAL`.
- SPRINT-30.md atualizado: "Bugs latentes do ciclo 6 (acertados
  depois)".
- Índice de changelog atualizado.
- 2 bugs latentes documentados: `/metrics` (resolvido) e
  `providerId` em `assertVistoriador` (workaround + pedido aberto).

Próximo agente é o **QI** (Sprint 34) — começo do ciclo 8 regular.

## Pedidos abertos para o ciclo 8

### QI (Sprint 34)

- **Alert rule do Prometheus para DLQ size > 0** — agora possível,
  scrape funcionando.
- Validar `pnpm test:e2e` pós-S33 (38 specs Playwright, +2 do
  `metrics-endpoint`).
- Mock estável do IBGE para tests determinísticos (pendente desde
  S21).
- **Adendo ao `CLAUDE.md` do DOC**: smoke HTTP no fechamento de
  ciclo quando há infra/endpoint novo. Esse adendo evita gap como o
  do ciclo 6.

### BE (Sprint 35)

- Publicar `vistoria.routed` (pendência mais antiga, ~3 ciclos).
- Detector de sobreposição na agenda.
- Reset de senha dedicado.
- **Relaxar `AgendaService.assertVistoriador` no `list()`** — só
  `create()`/`update()`/`bulk-*` exigem `providerId`; `list()` e
  `remove()` deveriam funcionar sem (vistoriador legado tem
  direito a ver/limpar a agenda mesmo sem providerId).

### IN (Sprint 36)

- Dedup-by-eventId no consumer.
- Endpoint HTTP que use `InternoProvider.consultar` (opcional).

### FE (Sprint 37)

- Cookie httpOnly + refresh server-side.
- Testes unitários para Users e Cobertura.
- Confirm de delete em coberturas.
- **`AgendaPage`: expor a mensagem do BE quando 4xx** — hoje
  mostra "Falha ao carregar slots" genérico mesmo quando o BE
  devolve mensagem específica (ex.: "Vistoriador precisa ter
  `providerId` definido").

## Validação

- Cross-check dos 3 handoffs do ciclo corretivo (S31-QI, S32-BE,
  e este) contra os changelogs. Sem contradições.
- Spec `metrics-endpoint.spec.ts` rodou 2/2 contra a stack viva.
- `GET /metrics` confirmado: 200, 11.2 KB, content-type Prometheus.
- `vistoriador1.providerId` agora = `"interno"` (workaround
  operacional aplicado pelo usuário, registrado nos known issues).

## Known issues cumulativas — ver [SPRINT-33.md](../changelog/SPRINT-33.md)

15 itens no total; **2 novos** vs S30:

- **15 (novo)**: `assertVistoriador` exige `providerId` em qualquer
  operação. Workaround manual aplicado. Pedido para BE Sprint 35.
- O bug do `/metrics` foi promovido a **known-resolved** (S32 BE).

## Nota de processo

Ciclo corretivo abreviado QI→BE→DOC funcionou: 3 sprints em 1
sessão, correção limpa, sem inflar IN/FE com no-ops formais. O
padrão fica disponível para repetir quando uma correção se contém
em BE+infra+docs. Se aparecer um terceiro caso, formalizar como
ADR-019.

## Próximo Sprint

**Sprint 34 — QI**: começo do ciclo 8 regular.
