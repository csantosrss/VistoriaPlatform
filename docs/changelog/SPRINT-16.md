# Sprint 16 — Changelog

**Período**: 2026-05-21
**Agente solo**: QI
**Tema**: Fechar 3 pendências do terceiro ciclo (DLX/DLQ no RabbitMQ, cobertura E2E do orchestrator BE↔IN, investigação do `nest start --watch` flaky).

## Itens entregues

### DLX/DLQ explícitos no RabbitMQ

[`infra/rabbitmq/definitions.json`](../../infra/rabbitmq/definitions.json) + [`infra/rabbitmq/rabbitmq.conf`](../../infra/rabbitmq/rabbitmq.conf) montados em `/etc/rabbitmq/` no container. Declara no boot:

- Exchange `vistoria.events.dlx` (topic, durable).
- Queue `vistoria.events.dlq` (durable).
- Binding `#` (todas mensagens dead-lettered).

Encerra a pendência aberta desde a Sprint 03. Exchange principal `vistoria.events` e as filas `apps-api.events`/`integrations.events` continuam sendo declarados pelos próprios apps (idempotentes).

### E2E nova — `vistoria-routed-orchestrator.spec.ts`

[`e2e/vistoria-routed-orchestrator.spec.ts`](../../e2e/vistoria-routed-orchestrator.spec.ts):

- Cria vistoria do tipo `SAIDA` (força routing para `interno`).
- Injeta `vistoria.routed` via RMQ Management API (sem amqplib novo no root).
- Polla `GET /vistorias/:id/transicoes` até a timeline conter `SOLICITADA → ROTEADA → AGENDADA` (timeout 15s).
- Confirma `GET /vistorias/:id` retorna `status: "AGENDADA"`.
- Confirma `GET /audit-logs?action=VISTORIA.STATUS_CHANGED` retorna ≥1 evento com `userId = null`.

Valida a cadeia IN13 (orchestrator + InternoProvider) + BE12 (consumer + idempotência) **sem depender do BE Sprint 17+ publicar `vistoria.routed`**. Quando BE publicar, `publishRouted(...)` da spec pode ser removido — assertion final permanece.

Total Playwright: 21 testes (era 20).

### Investigação `nest start --watch`

[`docs/architecture/nest-watch-flakiness.md`](../architecture/nest-watch-flakiness.md):

- Sintoma e frequência (~5-10% das execuções a frio em dev local).
- Mitigação aplicada em CI desde S11 (`build + node dist/main.js`).
- 3 hipóteses investigadas (tsc-watch engole erros, chokidar/WSL2, conflito swc).
- Sem fix — workaround documentado, CI imune.

[`docs/architecture/event-flow.md`](../architecture/event-flow.md) — seção "Pendências" tachou o DLX e listou alarme em DLQ como próximo (após Prometheus).

## Métricas

- 7 arquivos commitados.
- 21 testes Playwright (era 20).
- 0 ADRs novos.
- 0 alterações em `apps/api/src/` ou `apps/web/src/` (boundary QI respeitado).

## Breaking changes

Nenhum. Devs que já tinham container `vistoria-rabbitmq` pré-S16 precisam de `pnpm docker:reset` uma vez para o `rabbitmq.conf` entrar — clones limpos zero-config.

## Known issues que ficam de pé

1. BE ainda não publica `vistoria.routed` — agent-sync S13 segue.
2. Refresh em `localStorage` — espera ADR + BE expor cookie.
3. DLX declarado, mas sem alarme em DLQ size > 0 (espera Prometheus).
4. `vistoria-routed-orchestrator.spec.ts` é flaky-prone — timeout 15s cobre boa margem; se aparecer dor, isolar em job E2E separado.

## Próximo sprint

**Sprint 17 — BE**: escopo novo de produto (Users CRUD + AgendaSlot CRUD).
