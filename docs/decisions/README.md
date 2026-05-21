# Architecture Decision Records (ADRs)

Decisões arquiteturais não-triviais da Plataforma de Vistorias. Toda decisão segue o template em [`ADR-TEMPLATE.md`](./ADR-TEMPLATE.md).

## Status legend

- **Aceita** — em vigor
- **Proposta** — em discussão (não-implementada)
- **Rejeitada** — considerada e descartada
- **Substituída por ADR-XXX** — superseded

## Índice

| #                                                   | Título                                                | Autor | Sprint | Status |
| --------------------------------------------------- | ----------------------------------------------------- | ----- | ------ | ------ |
| [001](./ADR-001-rabbitmq-vs-kafka.md)               | RabbitMQ como message broker (vs Kafka)               | QI    | S01    | Aceita |
| [002](./ADR-002-turborepo-vs-nx.md)                 | Turborepo como orquestrador de monorepo (vs Nx)       | QI    | S01    | Aceita |
| [003](./ADR-003-prisma-vs-typeorm.md)               | Prisma como ORM (vs TypeORM)                          | BE    | S02    | Aceita |
| [004](./ADR-004-jwt-rs256.md)                       | JWT RS256 assimétrico (vs HS256)                      | BE    | S02    | Aceita |
| [005](./ADR-005-zod-vs-class-validator.md)          | Zod para validação de env vars (vs class-validator)   | BE    | S02    | Aceita |
| [006](./ADR-006-amqplib-vs-nestjs-microservices.md) | amqplib direto (vs @nestjs/microservices)             | BE    | S02    | Aceita |
| [007](./ADR-007-webhook-hmac-sha256.md)             | HMAC-SHA256 para webhooks (vs assinatura assimétrica) | IN    | S03    | Aceita |
| [008](./ADR-008-axios-vs-fetch.md)                  | axios + axios-retry (vs node-fetch + p-retry)         | IN    | S03    | Aceita |
| [009](./ADR-009-status-mapping-record.md)           | Mappings parceiro→enum como Record (vs strategy)      | IN    | S03    | Aceita |
| [010](./ADR-010-react-router-v6.md)                 | React Router v6 (vs Tanstack Router)                  | FE    | S04    | Aceita |
| [011](./ADR-011-shadcn-copypaste.md)                | Shadcn-style copy-paste (vs MUI/Mantine)              | FE    | S04    | Aceita |
| [012](./ADR-012-tailwind-3.md)                      | Tailwind 3.4 (vs Tailwind 4)                          | FE    | S04    | Aceita |
| [013](./ADR-013-vistoria-status-writer-port.md)     | IN escreve Vistoria.status via port + evento RMQ      | IN    | S08    | Aceita |
| [014](./ADR-014-refresh-token-stateless.md)         | Refresh token JWT stateless com claim `type`          | BE    | S12    | Aceita |
| [015](./ADR-015-dedup-eventid-writer.md)            | `eventId` no writer como identidade de dedup          | IN    | S13    | Aceita |

## Por categoria

### Arquitetura geral

- ADR-001 (mensageria), ADR-002 (monorepo), ADR-006 (publisher RMQ)

### Backend

- ADR-003 (ORM), ADR-004 (auth), ADR-005 (validação config), ADR-014 (refresh token stateless)

### Integrações / Segurança de webhooks

- ADR-007 (HMAC), ADR-008 (HTTP client), ADR-009 (status mapping), ADR-013 (port + RMQ event para escrita de status), ADR-015 (eventId/idempotência no writer)

### Frontend

- ADR-010 (router), ADR-011 (UI kit), ADR-012 (CSS engine)

## Como propor uma nova ADR

1. Identifique a decisão como não-trivial (escolha de tecnologia, padrão arquitetural, tradeoff de performance/segurança, mudança em contratos compartilhados)
2. Crie um sync no `docs/agent-sync/SPRINT-XX-AGENT-TO-DOC.md` com a discussão bruta
3. DOC consolida em ADR seguindo o template
4. Se uma ADR for substituída no futuro, marcar status "Substituída por ADR-XXX" e criar a nova com referência cruzada
