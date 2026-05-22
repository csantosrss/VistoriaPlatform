---
agent: DOC
sprint: "25"
date: 2026-05-21
---

# Handoff — Sprint 25 (DOC) → Sprint 26 (QI)

## Resumo

DOC fechou o quinto ciclo (S21..S24) sem tocar código:

- 5 changelogs (S21..S25).
- Índice de changelog atualizado.
- `c4-container.md` ganha 2 linhas de fluxo (`/users/:id/cobertura` e `apps/web → IBGE`) + container `apps/web` ganha nota sobre IBGE.
- README com 3 endpoints novos (cobertura) + atualização do "Conjunto vivo após o quinto ciclo".
- 0 ADRs no ciclo (decisões via AskUserQuestion).

Próximo agente é o **QI** (Sprint 26) — começo do ciclo 6.

## Pedidos abertos para o ciclo 6

### QI (Sprint 26)

- Validar `pnpm test:e2e` pós-ciclo 5 (30 specs Playwright; ciclo 5 ajustou 4 specs existentes + criou 1 novo).
- E2E browser para fluxo `/users/:id` → cadastrar cobertura (UF + cidade via IBGE) → aparecer na lista.
- Iniciar esteira Prometheus/Grafana — pendência de alarme em DLQ size > 0 vem desde S16.
- (Opcional) Mock estável do IBGE para tests determinísticos (talvez via MSW).

### BE (Sprint 27)

- **Publicar `vistoria.routed`** per agent-sync S13 — única seta cinza no C4.
- Endpoint dedicado de reset de senha (evita plain-text no PATCH `/users/:id`).
- Quando routing futuro cruzar cobertura, **normalizar cidade/bairro** (`LOWER + unaccent`) no service.

### IN (Sprint 28)

- Dedup-by-eventId no consumer quando reabertura legítima da SAGA virar real (ADR-015).
- Port BE→IN para `consultar()` do `InternoProvider`.

### FE (Sprint 29)

- Cookie httpOnly + persistência server-side do refresh (depende de ADR + BE expor).
- Confirm de delete na lista de coberturas.
- Testes unitários para `cobertura/` (e Users/Agenda — pendência desde S19).

## Validação

- Cross-check manual de cada changelog contra seu handoff. Sem contradições.
- Links internos validados (`docs/`).
- Mermaid sem alteração (fluxo async já estava S15-completo; ciclo 5 não tocou broker).

## Known issues que ficam de pé (cumulativo)

1. BE ainda não publica `vistoria.routed` — única seta cinza do C4.
2. Refresh em `localStorage`.
3. DLX sem alarme em DLQ.
4. Sem dedup-by-eventId.
5. Slot da agenda não detecta sobreposição.
6. Senha plain-text em POST/PATCH `/users`.
7. `event-flow.md` desatualizado.
8. Lint warning em `button.tsx`.
9. Cidade/bairro como strings livres no BE.
10. IBGE pode estar fora do ar — fallback parcial no FE.
11. Lista de coberturas sem confirm de delete.
12. Sem testes unitários de Users/Agenda/Cobertura no FE.

## Próximo Sprint

**Sprint 26 — QI**: começo do ciclo 6.
