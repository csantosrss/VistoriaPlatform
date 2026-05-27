---
agent: DOC
sprint: "30"
date: 2026-05-26
---

# Handoff — Sprint 30 (DOC) → Sprint 31 (QI)

## Resumo

DOC fechou o ciclo 6 (S26..S29) sem tocar código:

- 5 changelogs novos (S26..S30) — adiando à mão também S16..S25 no
  índice (estava parado em S15, recuperado nesta consolidação).
- 3 ADRs novos (ADR-016, ADR-017, ADR-018).
- C4 container ganha Prometheus, `/metrics`, `VistoriaReaderAdapter`,
  `/agenda` (calendário mensal), RBAC fino para VISTORIADOR e bulk
  endpoints.
- README com 3 endpoints novos (`:bulk-block` / `:bulk-update` /
  `:bulk-delete`) + `/metrics` + Prometheus UI + rota `/agenda`.
- Nota de processo sobre o desvio inicial do ciclo (FE implementou
  fora de ordem, foi revertido, ciclo rodou correto).

Próximo agente é o **QI** (Sprint 31) — começo do ciclo 7.

## Pedidos abertos para o ciclo 7

### QI (Sprint 31)

- **Alert rule do Prometheus para DLQ size > 0** — agora possível
  porque `/metrics` está em pé desde S27. Pendência mais antiga (S16)
  finalmente acessível.
- Validar `pnpm test:e2e` pós-ciclo 6 (36 specs Playwright; ciclo 6
  destravou 4 `test.fixme` da agenda + adicionou 2 specs em S26).
- Mock estável do IBGE para tests determinísticos (talvez via MSW)
  — pendente desde S21.
- (Opcional) `pnpm dev:all` + screenshot do `/agenda` autenticado
  como admin e como vistoriador para fechar a validação manual que o
  FE deixou pendente.

### BE (Sprint 32)

- **Publicar `vistoria.routed`** per agent-sync S13 — pendência mais
  antiga do projeto (2 ciclos sem tratar). Única seta cinza no C4.
- **Detector de sobreposição na agenda** — UI permite criar 2 slots
  no mesmo horário; nada valida no BE.
- Endpoint dedicado de reset de senha (evita plain-text no PATCH
  `/users/:id`) — pendência desde S25.
- (Bônus) Endpoint HTTP que use `InternoProvider.consultar` para
  exercitar a port BE→IN entregue no S28.

### IN (Sprint 33)

- Dedup-by-eventId no consumer quando reabertura legítima da SAGA
  virar real (ADR-015).
- (Bônus) Quando o BE publicar `vistoria.routed`, validar
  end-to-end o caminho do orchestrator.

### FE (Sprint 34)

- Cookie httpOnly + persistência server-side do refresh (depende de
  ADR + BE expor) — pendência desde o ciclo 3.
- **Testes unitários de Users e Cobertura** (Agenda agora tem desde
  S29; Users e Cobertura seguem em aberto).
- Confirm de delete na lista de coberturas — pendência desde S24.

## Validação

- Cross-check manual de cada changelog contra seu handoff. Sem
  contradições.
- Links internos validados (`docs/`, ADRs, README).
- Mermaid do C4 ajustado e revisado.
- ADR-017 e ADR-018 cruzam-se (port motiva options no forRoot) — links
  bidirecionais.

## Known issues que ficam de pé (cumulativo)

1. BE ainda não publica `vistoria.routed`.
2. Refresh em `localStorage` (XSS).
3. DLX sem alarme em DLQ — agora atacável (Prometheus de pé).
4. Sem dedup-by-eventId.
5. Slot da agenda não detecta sobreposição.
6. Sem testes unitários de Users/Cobertura no FE.
7. Senha plain-text em POST/PATCH `/users`.
8. `event-flow.md` desatualizado.
9. Lint warning em `button.tsx`.
10. Cidade/bairro como strings livres no BE.
11. IBGE pode estar fora do ar.
12. Lista de coberturas sem confirm de delete.
13. Test runner do `api-contracts` quebrado.
14. `InternoProvider.consultar()` sem endpoint HTTP no BE.

## Nota de processo

A regra **"QI→BE→IN→FE→DOC, nunca pular — vale também para features
isoladas"** está reforçada na feedback memory do projeto após o
desvio inicial do ciclo 6. Próximos pedidos de produto devem ser
acolhidos abrindo um sprint do QI, mesmo quando "é só uma tela".

## Próximo Sprint

**Sprint 31 — QI**: começo do ciclo 7.
