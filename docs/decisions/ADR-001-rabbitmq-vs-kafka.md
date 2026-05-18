# ADR-001: RabbitMQ como message broker (vs Kafka)

## Status

Aceita

## Contexto

A SAGA de Vistoria emite eventos de domínio (`VISTORIA.SOLICITADA`, `VISTORIA.ROTEADA`, `VISTORIA.CONCLUIDA`, etc) consumidos por (a) integrações com parceiros, (b) Salesforce, (c) webhook dispatcher, (d) auditoria. Volume esperado: centenas a baixos milhares de mensagens/dia por tenant.

Requisitos:

- Roteamento por tipo de evento
- Retry com dead-letter
- Painel de inspeção em dev e produção
- Latência baixa por mensagem (não streaming de alto throughput)
- Self-hosting on-prem possível (alguns clientes pedem)

## Decisão

**RabbitMQ 3.13** (image `rabbitmq:3.13-management`) com exchange topic `vistoria.events` durable.

## Alternativas Consideradas

- **Apache Kafka**: superior para event streaming de alto volume e replay histórico de longo prazo, mas operacionalmente pesado (Zookeeper/KRaft, partições, consumer groups, schema registry). Volumetria do projeto não justifica a complexidade.
- **AWS SQS / SNS**: vendor lock-in. Inviabiliza self-hosting on-prem.
- **Redis Streams**: Redis já é dependência, mas falta DLQ nativa robusta e UI de inspeção é precária.

## Consequências

- **Positivas**: TTL, DLQ, exchanges (topic/direct/fanout) prontos. UI de management na porta 15672 para debug. Bibliotecas NestJS (`@nestjs/microservices` + `amqplib`) maduras. Footprint pequeno em dev.
- **Negativas**: replay histórico longo (semanas/meses) não é o forte — caso necessário no futuro, considerar Kafka ou event sourcing dedicado.
- **Riscos**: clustering RabbitMQ tem nuances de partição de rede (split-brain). Para produção, planejar quorum queues ou cluster com `pause_minority`.

## Agente Autor

QI

## Data

2026-04-26

## Sprint

S01

## Referências

- Sync original: `docs/agent-sync/SPRINT-01-QI-TO-DOC.md`
- Stack base: [`infra/docker-compose.yml`](../../infra/docker-compose.yml)
- Publisher: `apps/api/src/infrastructure/messaging/rmq-publisher.service.ts`
- Subscriber: `packages/integrations/src/messaging/rmq-subscriber.service.ts`
