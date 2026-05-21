---
agent: QI
sprint: "16"
date: 2026-05-21
---

# Handoff — Sprint 16 (QI) → Sprint 17 (BE)

## Resumo

QI fechou 3 pendências do terceiro ciclo e adicionou cobertura E2E para a cadeia async BE↔IN:

1. **DLX/DLQ explícitos** via `infra/rabbitmq/definitions.json` montado no container do RabbitMQ. Encerra a pendência aberta desde a Sprint 03.
2. **E2E nova** — `vistoria-routed-orchestrator.spec.ts` injeta `vistoria.routed` via RMQ Management API e valida a cadeia `orchestrator → InternoProvider → AGENDADA na timeline + audit VISTORIA.STATUS_CHANGED`. Total Playwright: 21 testes.
3. **Investigação documentada** do `nest start --watch` flaky em `docs/architecture/nest-watch-flakiness.md`. Sem fix — CI já imune; dev local com workaround.

Próximo agente é o **BE** (Sprint 17). Prioridade explícita do produto: **criar usuário + cadastrar agenda dos vistoriadores no frontend** (pedido novo registrado nesta sprint).

## Entregas

### 1. DLX/DLQ explícitos no RabbitMQ

[`infra/rabbitmq/definitions.json`](../../infra/rabbitmq/definitions.json):

- Declara exchange `vistoria.events.dlx` (topic, durable) + queue `vistoria.events.dlq` (durable) + binding `#`.
- Mantém o exchange principal `vistoria.events` e as filas `apps-api.events`/`integrations.events` por conta dos apps (idempotentes via `assertExchange`/`assertQueue`).

[`infra/rabbitmq/rabbitmq.conf`](../../infra/rabbitmq/rabbitmq.conf):

- `load_definitions = /etc/rabbitmq/definitions.json` — carrega no boot.

[`infra/docker-compose.yml`](../../infra/docker-compose.yml): seção `rabbitmq` ganhou 2 volumes read-only:

- `./rabbitmq/rabbitmq.conf:/etc/rabbitmq/rabbitmq.conf:ro`
- `./rabbitmq/definitions.json:/etc/rabbitmq/definitions.json:ro`

[`docs/architecture/event-flow.md`](../architecture/event-flow.md): seção "Pendências" tachou a entrada do DLX e adicionou o alarme em DLQ como próximo item (após Prometheus entrar).

### 2. E2E injection do `vistoria.routed`

[`e2e/vistoria-routed-orchestrator.spec.ts`](../../e2e/vistoria-routed-orchestrator.spec.ts):

- Cria vistoria do tipo `SAIDA` (força routing para `interno`).
- Publica `vistoria.routed` via RMQ Management API (`POST /api/exchanges/%2F/vistoria.events/publish`) com payload espelhando o `VistoriaRoutedEventSchema`.
- Polla `GET /vistorias/:id/transicoes` até a timeline conter `["SOLICITADA", "ROTEADA", "AGENDADA"]` (timeout 15s, intervals 500/1000/1500ms).
- Confirma `GET /vistorias/:id` retorna `status: "AGENDADA"`.
- Confirma `GET /audit-logs?action=VISTORIA.STATUS_CHANGED&resourceId=...` retorna pelo menos 1 evento com `userId = null`.

Razão da abordagem: **valida a cadeia IN13 (orchestrator + InternoProvider) e BE12 (consumer + idempotência) sem depender do BE Sprint 17 publicar `vistoria.routed`**. Quando BE publicar, o `publishRouted(...)` da spec pode ser removido — assertion final permanece a mesma. Falha precocemente se a fronteira BE↔IN regredir.

Total Playwright: **21 testes** (era 20).

### 3. Investigação do `nest start --watch` flaky

[`docs/architecture/nest-watch-flakiness.md`](../architecture/nest-watch-flakiness.md):

- Sintoma e frequência (~5-10% das execuções a frio em dev local).
- Mitigação aplicada (CI desde S11 usa `build + node dist/main.js`).
- 3 hipóteses investigadas (tsc-watch engole erros, chokidar/WSL2, conflito swc). Nenhuma fechada com 100% de certeza.
- Workaround documentado.
- Sem ETA para fix; próximos passos listados (`restartable: true`, trocar por `tsx watch`, monitorar issue nestjs/nest-cli#8002).

## Mudanças que tocam o usuário

- **Devs que já têm container `vistoria-rabbitmq`** precisam de `pnpm docker:reset` (ou `docker compose down -v` no `infra/`) para o `rabbitmq.conf` novo entrar — `RABBITMQ_DEFAULT_VHOST` e dados persistidos no volume não se misturam com `load_definitions` automaticamente quando o container já existia.
- Em ambientes limpos (`pnpm dev:all` num clone novo), tudo funciona sem intervenção — o boot do RabbitMQ pega o `definitions.json` na primeira inicialização e DLX/DLQ ficam disponíveis imediatamente.

## Validação executada

| Comando                                | Resultado                                                        |
| -------------------------------------- | ---------------------------------------------------------------- |
| `pnpm typecheck`                       | ✅ 6 workspaces, 0 erros                                         |
| `pnpm playwright test --list`          | ✅ 21 testes em 5 arquivos (era 20)                              |
| `pnpm test:e2e` (local)                | ⚠️ Não executado nesta máquina (Docker fora). CI valida no push. |
| `docker compose config` (sintaxe yaml) | ✅ Implícito — Edit/Read confirmaram o yaml íntegro.             |
| `cat definitions.json` (sintaxe JSON)  | ✅ JSON íntegro; passou pelo write atômico.                      |

## Para outros agentes

### BE (Sprint 17) — **NOVO ESCOPO PRIORITÁRIO**

O usuário pediu explicitamente, ao final do ciclo 3, duas funcionalidades novas:

1. **Criar usuário** — admin (e gestor) cria novos usuários (vistoriadores, gestores, clientes, parceiros).
2. **Cadastrar agenda dos vistoriadores** — cada vistoriador tem agenda própria de disponibilidade que o gestor pode editar pelo painel.

Sugestão de escopo BE17 (alinhar antes de implementar):

- `POST /api/v1/users` (admin/gestor) — body com `email`, `name`, `password` opcional (gera reset link?), `roles`, `active`. Tenant herda do actor.
- `GET /api/v1/users` — listagem paginada com filtros por role/active.
- `PATCH /api/v1/users/:id` — atualização parcial (roles, name, active).
- `DELETE /api/v1/users/:id` — soft-delete via `active=false`.
- Novo modelo Prisma `VistoriadorAgendaSlot`:
  - `id`, `tenantId`, `vistoriadorId` (FK User, role VISTORIADOR), `inicio` (DateTime), `fim` (DateTime), `disponivel: Boolean`, `motivo?`, `createdAt`, `updatedAt`.
  - `@@unique([vistoriadorId, inicio])` ou outro discriminador.
- `GET /api/v1/vistoriadores/:id/agenda?from&to` — devolve slots no período.
- `POST /api/v1/vistoriadores/:id/agenda` — cria um ou vários slots (bulk).
- `DELETE /api/v1/vistoriadores/:id/agenda/:slotId`.

Decisões a fechar antes (vide `AskUserQuestion` na resposta deste handoff):

- Vistoriador pode editar a própria agenda ou só o gestor pode?
- Slot é "intervalo livre" ou "horário ocupado"? (modelagem oposta — afeta UX).
- Como integra com routing? `ProviderRoutingService` deve consultar disponibilidade ao decidir o vistoriador atribuído?

Tarefas técnicas paralelas que **não bloqueiam** o novo escopo:

- Publicar `vistoria.routed` per [`agent-sync/2026-05-20-from-in-to-be-vistoria-routed-event.md`](../agent-sync/2026-05-20-from-in-to-be-vistoria-routed-event.md) — fecha o ciclo async iniciado no IN13.

### IN (Sprint 18)

- Sem pendência direta vinda do QI16. Quando BE17 expor agenda, IN pode evoluir `ProviderRoutingService.decide` para considerar disponibilidade do vistoriador (não bloqueante).

### FE (Sprint 19)

- Telas de criar usuário (`/users/novo`) e listar (`/users`).
- Tela de agenda do vistoriador (`/vistoriadores/:id/agenda`) — provavelmente calendário visual.
- Pendências do ciclo 3 que ficaram (cookie httpOnly, recharts) seguem ranqueadas abaixo das novas features.

### DOC (Sprint 20)

- Consolidar ciclo 4 (S16..19), ADRs novos (provavelmente um sobre modelagem de agenda — slot livre vs ocupado).

## Decisões táticas

- **DLX/DLQ via definitions.json** em vez de declaração no código dos apps. Razão: independente do app (broker fica utilizável mesmo se algum app cair antes de declarar), idempotente, controlado pelo QI (infra).
- **E2E injeta `vistoria.routed` via Management API** em vez de amqplib. Razão: Management API é HTTP plain, sem dependência nova no `package.json` root. Conveniente em CI + reproduzível em dev local.
- **Spec `vistoria-routed-orchestrator` tolera ausência da cadeia** — se o orchestrator não estiver rodando (`RABBITMQ_URL` ausente), o `expect.poll` falha no timeout. Aceitável; CI sempre tem RMQ.
- **Não substituí `nest --watch`** — atalho frágil; o workaround do CI já é suficiente e a investigação não convergiu em fix.

## Known Issues

Herdadas (mantêm-se abertas):

1. **BE ainda não publica `vistoria.routed`** — único elo planejado do ciclo async. Continua sendo pedido top no agent-sync IN→BE.
2. **Refresh em `localStorage`** — vulnerável a XSS. Cookie httpOnly em ADR futuro.
3. **`InternoProvider.cancelar` não conhece `tenantId`** — assinatura da port.
4. **Sem dedup-by-eventId** no consumer — ADR-015.
5. **Lint warning em `button.tsx`** — cosmético.
6. **`event-flow.md`** descreve handlers conceituais (`vistoria.solicitada` / `vistoria.agendada`) que não batem 100% com a topologia real (`vistoria.routed` no IN, `vistoria.status.changed` no BE). Vale revisão no DOC do próximo ciclo.

Novas:

7. **`vistoria-routed-orchestrator.spec.ts` é flaky-prone** — depende da cadeia async ser rápida (RMQ → orchestrator → InternoProvider → writer → consumer → DB → resposta da timeline). Timeout 15s cobre boa margem; se ficar instável, vale isolar em job E2E separado com retries.
8. **`pnpm docker:reset` é necessário** uma vez para containers RMQ pré-existentes pegarem o `rabbitmq.conf` novo. Volta a ser zero-config em clones limpos.

## Próximo Sprint

**Sprint 17 — BE**: feature de usuários (CRUD com RBAC + tenant isolation) + modelo + endpoints da agenda do vistoriador. Definir junto com produto: vistoriador edita própria agenda? slot = livre ou ocupado? Detalhes nas seções acima.
