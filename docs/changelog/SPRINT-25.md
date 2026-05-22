# Sprint 25 — Changelog

**Período**: 2026-05-21
**Agente solo**: DOC (quinta volta do ciclo)
**Tema**: Consolidação documental do ciclo 5 (Sprint 21–24). Sem alteração de código.

## Itens entregues

### 4 changelogs do ciclo

- [SPRINT-21.md](./SPRINT-21.md) — QI: doc IBGE + E2E browser users/agenda.
- [SPRINT-22.md](./SPRINT-22.md) — BE: VistoriadorCobertura + codigoImovelExterno + providerId no User. 64 unit, 30 E2E. 3 endpoints novos.
- [SPRINT-23.md](./SPRINT-23.md) — IN: propaga `vistoriadorId` em `vistoria.status.changed` + BE handler aplica.
- [SPRINT-24.md](./SPRINT-24.md) — FE: card cobertura + autocomplete IBGE + providerId em users + codigoImovelExterno em vistorias.

### Índices atualizados

- [docs/changelog/README.md](./README.md) ganha 5 linhas (S21..S25).

### C4 Container atualizado

[docs/architecture/c4-container.md](../architecture/c4-container.md):

- Container `apps/api`: + Users + AgendaSlot + **VistoriadorCobertura** CRUD.
- Container `apps/web`: + consome IBGE (`servicodados.ibge.gov.br/api/v1/localidades`) para autocomplete de cidade.
- Tabela "Fluxos atuais" ganha 2 linhas: `/users/:id/cobertura` CRUD (S22/S24) e `apps/web → IBGE` (HTTPS, sem auth).

### README raiz atualizado

[README.md](../../README.md):

- Endpoints REST: + 3 (`GET/POST/DELETE /api/v1/users/:id/cobertura`).
- Painel admin: card de cobertura em `/users/:id`; `codigoImovelExterno` no form de vistoria; filtro novo na lista.

### Validação dos handoffs

Os 4 handoffs do ciclo 5 (`SPRINT-21-QI`, `SPRINT-22-BE`, `SPRINT-23-IN`, `SPRINT-24-FE`) revistos contra os changelogs e o estado do código. Sem contradições. Pendentes preservados.

## ADRs criados

Nenhum. As decisões do ciclo foram:

- **Decisões de produto** (S21 AskUserQuestion): cobertura embed em `/users/:id`; redundância bloqueia 409 em ambas direções; cidade via IBGE autocomplete; ciclo completo QI21→DOC25; `codigoImovelExterno` obrigatório + buscável; `providerId` required para VISTORIADOR + validado em agenda/cobertura.
- **Decisões táticas** nos respectivos handoffs.

Candidatos a ADR ainda em aberto:

- IBGE como source-of-truth para municípios (vs proxy via BE).
- Normalização de cidade/bairro no BE (`LOWER + unaccent`) quando routing futuro cruzar cobertura.
- Refresh em `localStorage` vs cookie httpOnly (herdado do ciclo 3).
- Outbox pattern quando `vistoria.routed` perder mensagens.

DOC só registra a existência destes candidatos.

## Breaking changes

Nenhum. DOC nunca toca código.

## Métricas

- 5 changelogs novos (S21..S25).
- 1 diagrama atualizado (`c4-container.md`).
- 1 README atualizado.
- 4 handoffs do ciclo 5 validados.
- 0 ADRs novos.

## Known issues que ficam de pé

Lista cumulativa repassada ao ciclo 6:

1. BE ainda não publica `vistoria.routed` — agent-sync S13 segue.
2. Refresh em `localStorage` (XSS).
3. DLX declarado, sem alarme em DLQ > 0 (espera Prometheus).
4. Sem dedup-by-eventId no consumer (ADR-015).
5. Slot da agenda não detecta sobreposição.
6. Senha plain-text em POST/PATCH /users.
7. `event-flow.md` desatualizado (handlers conceituais; topologia real diverge).
8. Lint warning em `button.tsx` (cosmético).
9. Cidade/bairro como strings livres no BE — `"São Paulo"` ≠ `"Sao Paulo"` quando routing cruzar.
10. IBGE pode estar fora do ar — FE faz fallback parcial; proxy/cache no BE adiado.
11. Lista de coberturas no FE não tem confirm para deletar.
12. Sem testes unitários de Users/Agenda/Cobertura no FE.

## Pedidos abertos

Repassados via [SPRINT-25-DOC.md](../handoffs/SPRINT-25-DOC.md):

- **QI (Sprint 26)**: E2E browser para fluxo `/users/:id` → cadastrar cobertura → aparecer na lista; validar pipeline pós-ciclo 5; iniciar esteira Prometheus.
- **BE (Sprint 27)**: publicar `vistoria.routed`; endpoint dedicado de reset de senha; normalizar cidade/bairro no service quando routing cruzar.
- **IN (Sprint 28)**: dedup-by-eventId quando reabertura virar real; port BE→IN para `consultar()` do `InternoProvider`.
- **FE (Sprint 29)**: cookie httpOnly + persistência server-side do refresh; confirm de delete na lista de coberturas; testes unitários para Cobertura.

## Próximo sprint

**Sprint 26 — QI**: começo do ciclo 6.
