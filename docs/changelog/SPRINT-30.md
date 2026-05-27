# Sprint 30 — Changelog

**Período**: 2026-05-26
**Agente solo**: DOC (sexta volta do ciclo)
**Tema**: Consolidação documental do ciclo 6 (Sprint 26–29). Sem alteração de código.

## Itens entregues

### 4 changelogs do ciclo

- [SPRINT-26.md](./SPRINT-26.md) — QI: critérios da agenda, Prometheus
  mínimo, 2 specs Playwright novas.
- [SPRINT-27.md](./SPRINT-27.md) — BE: 3 bulk endpoints + RBAC
  vistoriador + `/metrics`. 78 testes em 9 suites (+14).
- [SPRINT-28.md](./SPRINT-28.md) — IN: `VistoriaReaderPort` +
  `IntegrationsModule.forRoot(options)` + adapter BE; pendente do
  S13 resolvido.
- [SPRINT-29.md](./SPRINT-29.md) — FE: `AgendaPage` com calendário
  mensal, drawer, KPIs, bulk consumers, RBAC para vistoriador.

### Índice atualizado

[docs/changelog/README.md](./README.md) ganha 15 linhas (S16..S30 —
estava parado em S15).

### C4 Container atualizado

[docs/architecture/c4-container.md](../architecture/c4-container.md):

- Container `apps/api`: + `/metrics` Prometheus + `VistoriaReaderAdapter`
  - RBAC para VISTORIADOR na agenda + bulk endpoints.
- Container `apps/web`: + rota `/agenda` (calendário mensal).
- Container `packages/integrations`: + `VistoriaReaderPort`.
- Container novo: **Prometheus 2.55** (`vistoria-prometheus:9090`).
- Diagrama Mermaid: + flecha `prom -- scrape /metrics --> api` e
  flecha tracejada `api -. implementa VistoriaReaderAdapter .-> integrations`.
- 2 linhas novas na tabela "Fluxos atuais":
  `apps/web → apps/api` (bulk endpoints) e `Prometheus → apps/api`
  (scrape).

### README raiz atualizado

[README.md](../../README.md):

- Tabela de URLs locais: + `/metrics` (BE) e Prometheus UI (`:9090`).
- Tabela de rotas do painel: `/vistoriadores/:id/agenda` agora aponta
  como deep-link da `AgendaPage`; **`/agenda` nova** documentada com
  RBAC.
- Tabela de endpoints REST: + 3 bulk (`:bulk-block`, `:bulk-update`,
  `:bulk-delete`) + `/metrics`; coluna "Auth" da agenda atualizada
  para indicar RBAC novo.

### 3 ADRs novos

- [ADR-016](../decisions/ADR-016-metrics-endpoint-no-auth.md) —
  `/metrics` Prometheus sem auth (network policy).
- [ADR-017](../decisions/ADR-017-vistoria-reader-port.md) —
  `VistoriaReaderPort` simétrico ao writer ADR-013.
- [ADR-018](../decisions/ADR-018-integrations-module-options.md) —
  `IntegrationsModule.forRoot(options)` como padrão pra adapters
  BE-side.

### Validação dos handoffs

Os 4 handoffs do ciclo 6 (`SPRINT-26-QI`, `SPRINT-27-BE`,
`SPRINT-28-IN`, `SPRINT-29-FE`) revistos contra os changelogs e o
estado do código. Sem contradições. Pendentes preservados.

## Nota de processo — desvio inicial corrigido

O ciclo 6 começou com um **desvio de protocolo**: na sessão de produto,
ao pedido "preciso de uma tela melhor para incluir e visualizar as
agendas", o FE foi implementado direto, **sem QI/BE/IN**. O usuário
identificou ("tem que passar por todos") e o desvio foi corrigido:

1. Código FE revertido (`git restore` + `rm` dos arquivos novos);
   `apps/api/src/main.ts` pré-existente preservado.
2. Sprint 26 aberta corretamente como **QI**, com critérios formais.
3. Ciclo rodou completo: QI → BE → IN → FE → DOC.
4. Feedback memory atualizada para reforçar: a regra
   "QI→BE→IN→FE→DOC, nunca pular" vale **também para features
   isoladas** (não só sprints inteiras).

O resultado final do ciclo é exatamente a feature pedida pelo
produto, mas com:

- Critérios de aceitação documentados (não viraram suposição do FE).
- Endpoints atómicos no BE (`$transaction`), em vez de N requests
  paralelos no FE.
- RBAC fino (vistoriador puro vê a própria agenda) que o desvio
  inicial não cobria.
- Specs Playwright cobrindo o caminho.
- 3 ADRs registrando padrões que ficaram em jogo (port BE→IN,
  options no `forRoot`, `/metrics` sem auth).

## Breaking changes

Nenhum tocando consumidores externos:

- **`IVistoriaProvider.consultar(externalId)`** → `consultar(externalId, tenantId)` — breaking minor da port em `packages/integrations`, mas sem callers reais; documentado em [ADR-017](../decisions/ADR-017-vistoria-reader-port.md).

DOC nunca toca código.

## Métricas

- 6 changelogs novos (S16..S30) — recuperando o atraso desde S15;
  ciclos 4, 5 e 6 cobertos.
- 1 diagrama atualizado (`c4-container.md`).
- 1 README atualizado.
- 3 ADRs novos (ADR-016, ADR-017, ADR-018).
- 4 handoffs do ciclo 6 validados.
- 1 nota de processo (desvio corrigido).

## Known issues que ficam de pé

Lista cumulativa repassada ao ciclo 7:

1. BE ainda não publica `vistoria.routed` — agent-sync S13 segue.
2. Refresh em `localStorage` (XSS).
3. DLX declarado, sem alarme em DLQ > 0 — agora destravável com
   Prometheus em pé (ciclo 7 pode criar alert rule).
4. Sem dedup-by-eventId no consumer (ADR-015 — sai do papel quando
   reabertura virar real).
5. **Slot da agenda não detecta sobreposição** — UI permite criar 2
   slots no mesmo horário; nada valida no BE.
6. Sem testes unitários de Users/Cobertura no FE (Agenda agora tem,
   S29).
7. Senha plain-text em POST/PATCH /users (pendente desde S25).
8. `event-flow.md` desatualizado (handlers conceituais; topologia
   real diverge).
9. Lint warning em `button.tsx` (cosmético).
10. Cidade/bairro como strings livres no BE.
11. IBGE pode estar fora do ar — FE faz fallback parcial.
12. Lista de coberturas no FE não tem confirm para deletar.
13. Test runner do `api-contracts` quebrado (preexistente,
    `webhooks.spec.ts` falha na resolução de `.js`).
14. `InternoProvider.consultar()` agora funcional **mas sem endpoint
    HTTP no BE** — capacidade ligada na DI, sem rota.

**Resolvidos no ciclo 6**:

- ~~`/metrics` ainda não existe~~ → entregue em S27.
- ~~Bulk endpoints da agenda~~ → entregues em S27.
- ~~Port BE→IN para `consultar()` do `InternoProvider`~~ → entregue
  em S28.

**Bugs latentes do ciclo 6 (acertados depois)**:

- `/metrics` ficou em `/v1/metrics` por causa do `defaultVersion: "1"`
  global do `main.ts`. Detectado no primeiro `pnpm dev:all` pós-S30
  (S31 QI), corrigido em **S32 BE** com `VERSION_NEUTRAL`. Adendo
  em [ADR-016](../decisions/ADR-016-metrics-endpoint-no-auth.md).
- `AgendaService.assertVistoriador` exige `providerId` para
  **qualquer** operação (inclusive GET) — vistoriador legado sem
  `providerId` bloqueia /agenda. Detectado no mesmo `pnpm dev:all`.
  Workaround aplicado (PATCH em `vistoriador1.providerId = "interno"`);
  correção definitiva (relaxar regra no `list()` + FE expor mensagem
  do BE) fica como pedido aberto para o próximo ciclo regular.

## Pedidos abertos

Repassados via [SPRINT-30-DOC.md](../handoffs/SPRINT-30-DOC.md):

- **QI (Sprint 31)**: alert rule do Prometheus para DLQ size > 0
  (now possível); validar pipeline pós-ciclo 6; mock IBGE estável.
- **BE (Sprint 32)**: publicar `vistoria.routed` (já há 2 ciclos
  pendente); detector de sobreposição na agenda; reset de senha
  dedicado.
- **IN (Sprint 33)**: dedup-by-eventId quando reabertura virar real;
  endpoint HTTP no BE que use `InternoProvider.consultar` (opcional).
- **FE (Sprint 34)**: cookie httpOnly + persistência server-side do
  refresh; testes unitários para Users e Cobertura; confirm de delete
  na lista de coberturas.

## Próximo sprint

**Sprint 31 — QI**: começo do ciclo 7.
