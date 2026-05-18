# ADR-006: amqplib direto (vs @nestjs/microservices) para publisher RabbitMQ

## Status

Aceita

## Contexto

Necessidade de publicar eventos de domínio no RabbitMQ a partir do backend, com `routingKey` por tipo de evento e payloads JSON persistentes. Há duas escolas no ecossistema NestJS.

## Decisão

**`amqplib` 0.10.x** com um `RmqPublisher` próprio em `apps/api/src/infrastructure/messaging/`.

## Alternativas Consideradas

- **`@nestjs/microservices` `ClientProxy` com `Transport.RMQ`**: integra-se com o framework, expõe `ClientProxy.emit()` e `ClientProxy.send()`. Porém, o foco é RPC (req/reply); usar para event-driven com topic exchanges custosamente requer overrides.
- **`@golevelup/nestjs-rabbitmq`**: lib comunitária poderosa com decorators (`@RabbitSubscribe`), exchanges declarativos, plugin-friendly. Excelente alternativa a considerar quando os subscribers (IN) ganharem complexidade.

## Consequências

- **Positivas**: controle total sobre exchange (topic durable), routingKey, persistence, headers. Sem mágica do framework. Curva de aprendizado mínima.
- **Negativas**: cada novo padrão (RPC, work queues) exigirá código próprio. Reconexão automática precisa ser implementada antes de produção.
- **Riscos / TODO Sprint próximo**:
  - Reconexão exponencial em desconexão
  - Dead-letter queue declarada explicitamente
  - Métricas Prometheus de publish success/failure
  - Avaliar `@golevelup/nestjs-rabbitmq` se quantidade de subscribers crescer

## Agente Autor

BE

## Data

2026-04-26

## Sprint

S02

## Referências

- Sync original: `docs/agent-sync/SPRINT-02-BE-TO-DOC.md`
- Publisher: `apps/api/src/infrastructure/messaging/rmq-publisher.service.ts`
- Subscriber correspondente (IN): `packages/integrations/src/messaging/rmq-subscriber.service.ts`
