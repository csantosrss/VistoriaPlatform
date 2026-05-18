# Fluxo de Eventos — RabbitMQ

Como eventos da SAGA fluem através do exchange `vistoria.events`.

## Topologia

```mermaid
flowchart LR
    subgraph apps_api ["apps/api (BE)"]
        SAGA["VistoriaSagaService\n(BE Sprint 03+)"]
        PUB["RmqPublisher"]
        SAGA --> PUB
    end

    subgraph rmq ["RabbitMQ (vistoria-rabbitmq)"]
        EX{{"Exchange topic\nvistoria.events\n(durable)"}}
        Q1["Queue\nintegrations.events\n(durable + DLX)"]
        DLX{{"vistoria.events.dlx"}}
        DLQ["DLQ\nintegrations.events.dlq"]
        EX -- "vistoria.#" --> Q1
        Q1 -. nack .-> DLX
        DLX --> DLQ
    end

    subgraph integrations ["packages/integrations (IN)"]
        SUB["RmqSubscriber"]
        H1["Handler:\nvistoria.solicitada"]
        H2["Handler:\nvistoria.agendada"]
        SUB --> H1
        SUB --> H2
    end

    subgraph external ["Externos"]
        SF["Salesforce\n(via WebhookDispatcher)"]
        AUDIT["AuditLogService\n(BE)"]
    end

    PUB -- publish --> EX
    Q1 --> SUB
    H1 --> SF
    H2 --> SF
    PUB -.->|registra| AUDIT
```

## Sequência típica: solicitação de vistoria

```mermaid
sequenceDiagram
    participant Web as apps/web
    participant API as apps/api
    participant Saga as VistoriaSagaService
    participant Pub as RmqPublisher
    participant Ex as Exchange vistoria.events
    participant Sub as RmqSubscriber
    participant Prov as RedeVistoriasProvider
    participant Part as Parceiro (Rede Vistorias)

    Web->>API: POST /api/v1/vistorias
    API->>Saga: createAndRoute(input)
    Saga->>Saga: status = SOLICITADA → ROTEADA
    Saga->>Pub: publish('vistoria.roteada', {...})
    Pub->>Ex: routingKey=vistoria.roteada\ncorrelationId=...
    Ex->>Sub: deliver to integrations.events queue
    Sub->>Prov: handler('vistoria.roteada', payload)
    Prov->>Part: POST /inspections (HTTP)
    Part-->>Prov: { externalId, scheduledAt }
    Prov->>API: PATCH /api/v1/vistorias/:id (interno)\nstatus=AGENDADA
    Note over API,Sub: Nova transição emite\nvistoria.agendada
```

## Routing keys publicadas

Cada transição da SAGA gera um evento com `routingKey = "vistoria.<status_destino>"`:

| Status         | Routing key               |
| -------------- | ------------------------- |
| SOLICITADA     | `vistoria.solicitada`     |
| ROTEADA        | `vistoria.roteada`        |
| AGENDADA       | `vistoria.agendada`       |
| CONFIRMADA     | `vistoria.confirmada`     |
| EM_EXECUCAO    | `vistoria.em_execucao`    |
| LAUDO_PENDENTE | `vistoria.laudo_pendente` |
| LAUDO_APROVADO | `vistoria.laudo_aprovado` |
| CONCLUIDA      | `vistoria.concluida`      |
| CANCELADA      | `vistoria.cancelada`      |

A queue `integrations.events` faz bind com pattern `vistoria.#` (todas). Subscribers individuais filtram pela routing key dentro do `RmqSubscriber.subscribe(routingKey, handler)`.

## Garantias

- **Durabilidade**: exchange e queue declarados `durable=true`; mensagens com `persistent=true`
- **At-least-once**: handler que falhar gera nack sem requeue → DLX. Handler **deve ser idempotente** (e.g., usar `correlationId` ou hash do payload para deduplicação em Redis)
- **Ordem**: RabbitMQ não garante ordem global em topic exchanges. Para eventos sequenciais por vistoria, a SAGA do BE garante que o status atual no DB é a verdade — handlers consomem o evento, leem estado atual e reagem

## Pendências

- DLX (`vistoria.events.dlx`) e DLQ (`integrations.events.dlq`) ainda não declaradas explicitamente — apenas `deadLetterExchange` no `assertQueue`. **QI Sprint próximo**: declaração explícita + alarme em mensagens não-consumidas
- Métricas Prometheus de publish/consume — ver TODO em [ADR-006](../decisions/ADR-006-amqplib-vs-nestjs-microservices.md)
