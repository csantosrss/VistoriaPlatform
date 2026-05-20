---
agent: IN
sprint: "13"
date: 2026-05-20
---

# Handoff — Sprint 13 (IN) → Sprint 14 (FE)

## Resumo

IN fechou os 3 itens em aberto do handoff `SPRINT-12-BE`:

1. **`eventId` no writer** — `RmqVistoriaStatusWriter` agora gera (ou aceita) UUID v4 por evento e o propaga no payload, no header `eventId` e na property AMQP `messageId`. Decisão em [ADR-015](../decisions/ADR-015-dedup-eventid-writer.md).
2. **`InternoProvider` funcional** — `agendar()` e `cancelar()` deixam de ser `NotImplementedException` e publicam transições via `VistoriaStatusWriterPort`. `consultar()` permanece declarado como `NotImplemented` com mensagem que aponta para a port BE→IN ainda inexistente.
3. **`AgendamentoOrchestrator`** novo — assina `vistoria.routed` no `RmqSubscriber` do `@vistoria/integrations` e dispara `agendar()` no provider correspondente. Fica **dormente** até BE Sprint 16 publicar o evento (pedido em [`agent-sync/2026-05-20-from-in-to-be-vistoria-routed-event.md`](../agent-sync/2026-05-20-from-in-to-be-vistoria-routed-event.md)).

Próximo agente é o **FE** (Sprint 14).

## Entregas

### 1. `eventId` no writer ([ADR-015](../decisions/ADR-015-dedup-eventid-writer.md))

[`packages/integrations/src/messaging/rmq-vistoria-status-writer.service.ts`](../../packages/integrations/src/messaging/rmq-vistoria-status-writer.service.ts):

- `eventId` (opcional) entra na interface `VistoriaStatusUpdate` ([port](../../packages/integrations/src/ports/vistoria-status-writer.port.ts)).
- Quando o caller não fornece, o writer gera com `node:crypto.randomUUID()` antes do publish.
- Publicação:
  - **payload** ganha o campo `eventId`.
  - AMQP `messageId` é setado com o mesmo valor (padrão AMQP de identidade).
  - Header `eventId` também recebe o valor (redundância intencional — facilita inspeção em UIs de broker).
- `VistoriaStatusChangedEventSchema` em `@vistoria/api-contracts/vistoria/events` ganhou `eventId: z.string().uuid().optional()` para retro-compat com publishers pré-13.

Por que opcional no schema, sempre preenchido no writer: consumidores legacy (caso existam fora do nosso código) não quebram; o writer real sempre injeta.

### 2. `InternoProvider` funcional

[`packages/integrations/src/providers/interno.provider.ts`](../../packages/integrations/src/providers/interno.provider.ts):

- Construtor agora injeta `VISTORIA_STATUS_WRITER` (token DI já existente).
- `agendar(dto)`:
  - Loga atribuição "Vistoria atribuída à equipe interna".
  - Publica `VistoriaStatusUpdate { newStatus: "AGENDADA", source: "interno", motivo: "Atribuída à equipe interna" }` via writer.
  - Devolve `AgendamentoResult { externalId: vistoriaId, status: "AGENDADA", dataAgendada: dto.dataPreferida ?? now, vistoriadorAtribuido: { nome: "Equipe Interna Auxiliadora" } }`.
- `cancelar(externalId)`:
  - Publica `VistoriaStatusUpdate { newStatus: "CANCELADA", source: "interno" }`.
- `consultar()`: continua `NotImplementedException` com mensagem clara — a leitura síncrona do estado da Vistoria requer uma port BE→IN que **ainda não existe**. Não é responsabilidade desta sprint. Quando virar dor, abre-se sync IN→BE.
- `healthCheck()`: inalterado (in-process, sempre healthy).
- `receberWebhook()`: inalterado (no-op com warn — equipe interna não emite webhooks).

### 3. `AgendamentoOrchestrator`

[`packages/integrations/src/orchestration/agendamento-orchestrator.service.ts`](../../packages/integrations/src/orchestration/agendamento-orchestrator.service.ts):

- Service `@Injectable()` registrado em `IntegrationsModule.forRoot()` e exportado.
- `@OnModuleInit`: `subscriber.subscribe('vistoria.routed', handle)`.
- `handle(payload, correlationId)`:
  - Valida com `VistoriaRoutedEventSchema` — payload inválido → log + ack (descartado).
  - Mapeia `providerId` → instância via switch: `rede-vistorias` / `conceitual` / `interno`. ID desconhecido → log + ack.
  - Monta `AgendamentoDto` e chama `provider.agendar(dto)`.
  - Em erro do `agendar()`: log + ack (sem retry automático). Mensagens com falhas recorrentes vão ao DLX configurado no subscriber.

Schema `VistoriaRoutedEventSchema` definido em `@vistoria/api-contracts/vistoria/events` — payload "thick" (carrega snapshot completo para o IN não precisar chamar BE de volta). Detalhes do shape em [`docs/agent-sync/2026-05-20-from-in-to-be-vistoria-routed-event.md`](../agent-sync/2026-05-20-from-in-to-be-vistoria-routed-event.md).

### 4. Testes

- **Unit (jest, packages/integrations)**: 33 testes, todos verdes.
  - `providers.spec.ts` (InternoProvider): substituí o teste de "throws NotImplemented" por 4 cenários novos — `agendar()` publica AGENDADA, `cancelar()` publica CANCELADA, `consultar()` ainda NotImplemented com mensagem nova, `webhook` segue no-op.
  - `rmq-vistoria-status-writer.service.spec.ts` (+2): writer gera UUID v4 + propaga em `messageId` + header; respeita `eventId` fornecido pelo caller.
  - `agendamento-orchestrator.service.spec.ts` (novo, 6): registro do subscribe em `onModuleInit`, dispatch para rede-vistorias, dispatch para interno, descarte de payload inválido, tolerância a erro do `agendar()`, conversão de `dataPreferida` ISO → Date.
- **BE não regrediu**: `apps/api` continua passando os 30 testes da Sprint 12.

## Mudanças que tocam o usuário

- **Payload do `vistoria.status.changed`**: agora vem com `eventId` (UUID v4) sempre. Consumidores legacy (não há nos nossos repos, mas em ferramentas externas vale a nota) continuam funcionando porque o schema declara o campo como opcional. O BE consumer atual não usa o `eventId` — segue dedupando por status final.
- **`InternoProvider` parou de lançar `NotImplementedException` em `agendar()` e `cancelar()`**. Se algo no código depender desse throw (não há), vai bater silenciosamente. Tests cobrem o caminho feliz.
- **Pedido aberto ao BE**: publicar `vistoria.routed` (ver agent-sync). Sem isso, o `AgendamentoOrchestrator` fica dormente e o ciclo `ROTEADA → AGENDADA` não fecha automaticamente. **Não bloqueia o FE Sprint 14** — apenas a parte de timeline ficará mais magra até o BE publicar.

## Validação executada

| Comando                                       | Resultado                                              |
| --------------------------------------------- | ------------------------------------------------------ |
| `pnpm typecheck`                              | ✅ 6 workspaces, 0 erros                               |
| `pnpm --filter @vistoria/integrations test`   | ✅ 6 suites, 33 testes (era 27)                        |
| `pnpm --filter @vistoria/integrations lint`   | ✅ 0 warnings                                          |
| `pnpm --filter @vistoria/api test`            | ✅ 5 suites, 30 testes (sem regressão)                 |
| `pnpm --filter @vistoria/api-contracts build` | ✅ dist atualizado (novo schema `VistoriaRoutedEvent`) |

E2E não executado nesta máquina (Docker fora). CI valida no push. Não há novos cenários E2E nesta sprint — o orchestrator depende do BE publicar `vistoria.routed` para gerar tráfego real, e isso é Sprint 16.

## Para outros agentes

### BE (Sprint 16 ou patch)

- **Publicar `vistoria.routed`** no `VistoriasService.create()`. Shape do payload + sugestão de implementação em [`docs/agent-sync/2026-05-20-from-in-to-be-vistoria-routed-event.md`](../agent-sync/2026-05-20-from-in-to-be-vistoria-routed-event.md). Sem migrations; reusa o `RmqPublisher` já registrado.
- (Opcional) Evoluir o dedup do `vistoria-status-changed.handler.ts` para usar `eventId` quando reabertura de SAGA virar caso real (ADR-015 explica).

### FE (Sprint 14)

Sem novas dependências do IN. Pendências do BE12 continuam válidas:

- Consumir `GET /vistorias/:id/transicoes` para a timeline da SAGA.
- Consumir `GET /vistorias/stats` para substituir as 3 chamadas paralelas do dashboard.
- Implementar refresh transparente com o `POST /auth/refresh`.
- Adicionar KPI "Roteadas" (consequência do routing inline do BE12 — vistorias novas chegam em `ROTEADA`).

### DOC (Sprint 15)

- Adicionar **ADR-014** (refresh, BE12) e **ADR-015** (eventId, IN13) ao changelog do ciclo.
- Documentar no `c4-container.md` o fluxo async: BE publica `vistoria.routed` → IN orchestrator → providers → IN writer publica `vistoria.status.changed` → BE consumer.
- Mermaid da SAGA com as setas de evento entre BE↔IN ajuda muito.

## Decisões táticas

- **`eventId` opcional no schema, sempre preenchido no writer** — proteção contra publishers fora do nosso radar. Custa nada e mantém retro-compat.
- **`InternoProvider` publica via `VistoriaStatusWriterPort`** em vez de chamar uma "VistoriaRepositoryPort" direto. Motivo: simetria com Rede Vistorias/Conceitual (todos os providers terminam publicando o mesmo evento) e zero acoplamento com domínio do BE.
- **Orchestrator usa o `RmqSubscriber` existente do `@vistoria/integrations`** (que estava sem consumidores reais até esta sprint). Fila `integrations.events` continua com binding `vistoria.#`; novos handlers entram sem mudar a infraestrutura.
- **Payload thick em `VistoriaRoutedEvent`** — IN evita read-back de BE. Inconveniente: paylod ~ 0,5 KB; trade-off aceitável (rede LAN). Reavaliar se a SAGA crescer com mais dados sensíveis.
- **Sem retry automático no orchestrator quando `agendar()` falha** — fica para uma evolução com `nack(requeue)` + delay queue. Hoje o erro vai ao log e a mensagem é ack'd para evitar tight-loop com providers fora do ar.

## Known Issues

Herdadas (mantêm-se abertas):

1. **DLX `vistoria.events.dlx` em produção** — pendente desde Sprint 03.
2. **`nest start --watch` flaky** — mitigado em CI, dev local com workaround.
3. **Sem `RABBITMQ_URL`** os serviços do broker (writer + subscriber + orchestrator) ficam dormentes — eventos não saem nem entram. Comportamento esperado; é desejável **não** quebrar o boot do api em dev sem stack.

Novas:

4. **`InternoProvider.cancelar(externalId)` não conhece o `tenantId`** — interface da port `IVistoriaProvider.cancelar(externalId)` não passa tenant. Hoje publicamos com `tenantId: ""`. BE consumer faz `findFirst({ id, tenantId: ""})` → 404 silencioso. Se cancelar via interno virar caminho real, mudar a assinatura para `cancelar(externalId, tenantId)` (breaking de port — sync com BE).
5. **Orchestrator dormente até BE publicar `vistoria.routed`** — pedido aberto em agent-sync. Sem isso, o ciclo `ROTEADA → AGENDADA` não fecha automaticamente; ainda funciona manualmente via webhook do parceiro real.
6. **Sem dedup-by-eventId no consumer** — ADR-015 documenta; evolução futura quando necessário.

## Próximo Sprint

**Sprint 14 — FE**: refresh transparente, timeline da SAGA, dashboard via `/stats`, KPI "Roteadas".

Decisões abertas que FE pode tomar:

- Onde armazenar o refresh (localStorage hoje, cookie httpOnly em ADR futuro).
- Como renderizar a timeline (vertical com ícones por status? horizontal compacta?).
- Se vai usar `recharts` agora ou adiar.
