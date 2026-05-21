# Sprint 13 — Changelog

**Período**: 2026-05-20
**Agente solo**: IN
**Tema**: Fechar os 3 itens abertos pelo handoff BE12. IN adiciona identidade única (`eventId`) no writer, implementa `InternoProvider` funcional e entrega o orchestrator que consome `vistoria.routed` quando BE publicar.

## Itens entregues

### 1. `eventId` no writer (ADR-015)

[`packages/integrations/src/messaging/rmq-vistoria-status-writer.service.ts`](../../packages/integrations/src/messaging/rmq-vistoria-status-writer.service.ts):

- `eventId` (opcional) entra na interface `VistoriaStatusUpdate` ([port](../../packages/integrations/src/ports/vistoria-status-writer.port.ts)).
- Sem `eventId` no input, o writer gera com `node:crypto.randomUUID()` antes do publish.
- Propaga em três lugares com o **mesmo valor**: `payload.eventId`, AMQP `messageId` (padrão de identidade) e header `eventId` (redundância intencional para inspeção em UIs de broker).

`VistoriaStatusChangedEventSchema` em `@vistoria/api-contracts/vistoria/events` ganhou `eventId: z.string().uuid().optional()` para retro-compat com publishers pré-13 (não há, mas o opcional preserva a porta).

### 2. `InternoProvider` funcional

[`packages/integrations/src/providers/interno.provider.ts`](../../packages/integrations/src/providers/interno.provider.ts):

- Sai do `NotImplementedException` herdado da Sprint 03.
- Construtor agora injeta `VISTORIA_STATUS_WRITER`.
- `agendar(dto)` loga atribuição "Vistoria atribuída à equipe interna", publica `VistoriaStatusUpdate { newStatus: "AGENDADA", source: "interno", motivo: "Atribuída à equipe interna" }` via writer e devolve `AgendamentoResult { externalId: dto.vistoriaId, status: "AGENDADA", dataAgendada: dto.dataPreferida ?? now, vistoriadorAtribuido: { nome: "Equipe Interna Auxiliadora" } }`.
- `cancelar(externalId)` publica `VistoriaStatusUpdate { newStatus: "CANCELADA", source: "interno" }`.
- `consultar()` permanece `NotImplementedException` — leitura síncrona requer port BE→IN ainda inexistente.
- `healthCheck()` inalterado (in-process). `receberWebhook()` inalterado (no-op com warn).

### 3. `AgendamentoOrchestrator`

[`packages/integrations/src/orchestration/agendamento-orchestrator.service.ts`](../../packages/integrations/src/orchestration/agendamento-orchestrator.service.ts):

- Service `@Injectable()` registrado em `IntegrationsModule.forRoot()` e exportado.
- `@OnModuleInit` → `subscriber.subscribe('vistoria.routed', handle)` usando o `RmqSubscriber` existente do `@vistoria/integrations`.
- `handle(payload, correlationId)`:
  - Valida com `VistoriaRoutedEventSchema` (novo) — payload inválido → log + ack.
  - Mapeia `providerId` → instância via switch (`rede-vistorias` / `conceitual` / `interno`).
  - Monta `AgendamentoDto` e chama `provider.agendar(dto)`. Erro do `agendar()` → log + ack (sem retry automático; DLX cuida de falhas recorrentes).
- **Dormente** até BE Sprint 16 publicar `vistoria.routed`. Quando publicar, fluxo async fecha sem mais mudanças no IN.

Schema `VistoriaRoutedEventSchema` em `@vistoria/api-contracts/vistoria/events` é **payload-thick** (carrega snapshot completo: `eventId`, `vistoriaId`, `tenantId`, `providerId`, `reason`, `tipo`, `enderecoCompleto`, `cep`, `contato`, `observacoes?`, `dataPreferida?`, `correlationId?`) — evita IN→BE read-back.

### Agent-sync para BE

[`docs/agent-sync/2026-05-20-from-in-to-be-vistoria-routed-event.md`](../agent-sync/2026-05-20-from-in-to-be-vistoria-routed-event.md):

- Pedido formal para o BE publicar `vistoria.routed` no `VistoriasService.create()` após a `$transaction`.
- Inclui shape autoritativo, sugestão de implementação reusando o `RmqPublisher` já registrado, trade-off da publicação fora da transação e ponteiro para o pattern Outbox quando necessário.

## Endpoints alterados

Nenhum HTTP. IN não toca em `apps/api`.

## Eventos RMQ

- **Atualizado**: `vistoria.status.changed` agora carrega `eventId` no payload + `messageId` AMQP + header. Consumidor (BE) **não usa ainda** — segue dedupando por status final. Forward-compat para dedup-by-eventId.
- **Novo consumer**: `AgendamentoOrchestrator` assina `vistoria.routed` no exchange `vistoria.events` via `RmqSubscriber` do `@vistoria/integrations`. Dormente até BE publicar.

## Database

Sem migration. IN não toca em Prisma.

## ADRs criados

- **ADR-015** — [`eventId` no writer como identidade de dedup forward-compat](../decisions/ADR-015-dedup-eventid-writer.md): UUID v4 gerado pelo writer (se ausente), propagado em payload + `messageId` AMQP + header. Schema mantém opcional para retro-compat. Forward-compat para consumer evoluir para dedup-by-eventId quando reabertura legítima da SAGA virar caso real ou IN começar a duplicar de host diferente.

## Testes

- **Unit (`packages/integrations`)**: 33 testes (era 27). Cobertura nova:
  - `providers.spec.ts` (InternoProvider): substituiu o teste de NotImplemented por 4 cenários — `agendar()` publica AGENDADA, `cancelar()` publica CANCELADA, `consultar()` segue NotImplemented com mensagem nova, `webhook` mantém no-op.
  - `rmq-vistoria-status-writer.service.spec.ts` (+2): writer gera UUID v4 + propaga em `messageId` e header; respeita `eventId` fornecido pelo caller.
  - `agendamento-orchestrator.service.spec.ts` (novo, 6): registro do subscribe em `onModuleInit`, dispatch para rede-vistorias/interno, descarte de payload inválido, tolerância a erro do `agendar()`, conversão de `dataPreferida` ISO → Date.
- **BE não regrediu**: `apps/api` segue verde com 30 testes.

## Breaking changes

Nenhum. Adições compatíveis. `eventId` é opcional no schema; writer sempre preenche mas consumidor legacy ignora.

## Métricas

- 14 arquivos commitados, +805 / −24 LoC
- 33 unit tests (era 27)
- 1 ADR (ADR-015)
- 1 agent-sync formal (IN → BE)
- 0 mudanças em `apps/api` (boundary respeitado)

## Decisões táticas (sem ADR)

- **`eventId` opcional no schema, sempre preenchido no writer** — proteção forward-compat sem quebrar publishers fora do nosso radar.
- **`InternoProvider` publica via `VistoriaStatusWriterPort`** em vez de chamar uma futura "VistoriaRepositoryPort". Simetria com Rede Vistorias/Conceitual + zero acoplamento com domínio do BE.
- **Orchestrator usa o `RmqSubscriber` existente do `@vistoria/integrations`** (que estava sem consumidores reais até esta sprint). Fila `integrations.events` segue com binding `vistoria.#`; novos handlers entram sem mudar infra.
- **Payload thick em `VistoriaRoutedEvent`** — IN evita read-back de BE. Trade-off: payload ~ 0,5 KB; aceitável em LAN.
- **Sem retry automático no orchestrator** quando `agendar()` falha — log + ack. Evolução futura com `nack(requeue)` + delay queue quando dor aparecer.

## Known issues que ficam de pé

1. **`InternoProvider.cancelar(externalId)` não conhece o `tenantId`** — assinatura da port `IVistoriaProvider.cancelar(externalId)` não passa tenant. Hoje publicamos com `tenantId: ""`. BE consumer faz `findFirst({ id, tenantId: "" })` → 404 silencioso. Se cancelar via interno virar caminho real, mudar a assinatura (breaking de port — sync com BE).
2. **Orchestrator dormente até BE publicar `vistoria.routed`** — pedido aberto em agent-sync.
3. **Sem dedup-by-eventId no consumer** — ADR-015 documenta; evolução futura.
4. **DLX em produção** — pendente desde Sprint 03.

## Pedidos abertos

Detalhados em [SPRINT-13-IN.md](../handoffs/SPRINT-13-IN.md):

- **BE (Sprint 16 ou patch)**: publicar `vistoria.routed` per agent-sync. Sem isso o ciclo `ROTEADA → AGENDADA` não fecha automaticamente.
- **FE (Sprint 14)**: sem novas dependências do IN — pendências do BE12 seguem válidas (refresh, timeline, dashboard via stats, KPI Roteadas).
- **DOC (Sprint 15)**: ADR-015 no índice + diagrama da SAGA com setas BE↔IN no C4.

## Próximo sprint

**Sprint 14 — FE**: refresh transparente, timeline da SAGA, dashboard via `/stats`, KPI "Roteadas".
