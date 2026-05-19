# C4 — Container

Containers internos da Plataforma de Vistorias e suas dependências de runtime. Refina o [c4-context.md](./c4-context.md).

## Diagrama

```mermaid
flowchart LR
    subgraph Externos
        sf["Salesforce"]
        rv["Rede Vistorias"]
        cc["Conceitual"]
    end

    subgraph Plataforma["Plataforma de Vistorias (Docker Compose em dev)"]
        web["apps/web<br/>React + Vite<br/>:5173"]
        api["apps/api<br/>NestJS<br/>:3000"]

        subgraph Packages["packages/* (monorepo)"]
            contracts["api-contracts<br/>schemas Zod"]
            integrations["integrations<br/>providers + webhooks"]
        end

        pg[("Postgres 16<br/>:5433")]
        redis[("Redis 7<br/>:6379")]
        rmq{{"RabbitMQ 3.13<br/>:5672 / mgmt :15672"}}
        mh["MailHog<br/>:1025 / UI :8025"]
    end

    web -- "REST JSON<br/>JWT" --> api

    api -.usa.-> contracts
    api -.usa.-> integrations
    web -.usa.-> contracts

    api -- "SQL via Prisma" --> pg
    api -- "cache + locks" --> redis
    api -- "publish<br/>vistoria.events" --> rmq
    integrations -- "consume<br/>via subscriber" --> rmq

    integrations -- "HTTP + HMAC" --> rv
    integrations -- "HTTP + HMAC" --> cc
    sf -- "REST + JWT" --> api
    api -- "SMTP" --> mh
    rv -- "webhook + HMAC" --> integrations
    cc -- "webhook + HMAC" --> integrations
```

## Containers

| Container                | Tecnologia                      | Responsabilidade                                          | Porta dev    |
| ------------------------ | ------------------------------- | --------------------------------------------------------- | ------------ |
| `apps/api`               | NestJS 10 + TypeScript + Prisma | Domínio, SAGA, autenticação, audit, REST API              | 3000         |
| `apps/web`               | React 19 + Vite 5 + Tailwind    | Painel admin (gestores e administradores)                 | 5173         |
| `packages/api-contracts` | Zod + tsc (ESM)                 | Schemas e enums compartilhados FE↔BE                      | —            |
| `packages/integrations`  | NestJS module + Axios + amqplib | Adapters de parceiros, webhook controller, RMQ subscriber | —            |
| Postgres 16              | container `vistoria-postgres`   | Banco principal (tenants, users, audit_logs, domínio)     | 5433         |
| Redis 7                  | container `vistoria-redis`      | Cache, locks distribuídos, futuros rate-limits            | 6379         |
| RabbitMQ 3.13            | container `vistoria-rabbitmq`   | Exchange `vistoria.events` + filas dos consumers          | 5672 / 15672 |
| MailHog                  | container `vistoria-mailhog`    | SMTP fake para dev                                        | 1025 / 8025  |

## Decisões que justificam o desenho

- Mensageria: RabbitMQ ([ADR-001](../decisions/ADR-001-rabbitmq-vs-kafka.md))
- ORM: Prisma ([ADR-003](../decisions/ADR-003-prisma-vs-typeorm.md))
- Driver AMQP no Nest: amqplib direto ([ADR-006](../decisions/ADR-006-amqplib-vs-nestjs-microservices.md))
- HTTP client: axios ([ADR-008](../decisions/ADR-008-axios-vs-fetch.md))
- Webhook signing: HMAC SHA-256 ([ADR-007](../decisions/ADR-007-webhook-hmac-sha256.md))
- Auth: JWT RS256 ([ADR-004](../decisions/ADR-004-jwt-rs256.md))
- Build do monorepo: Turborepo ([ADR-002](../decisions/ADR-002-turborepo-vs-nx.md))

## Observações operacionais

- Postgres exposto na porta **5433** no host (não 5432) para não conflitar com instalações nativas no Windows. Dentro da rede `vistoria-net`, continua em 5432.
- `apps/api` lê `.env` para `DATABASE_URL`, `RABBITMQ_URL`, `REDIS_URL`; defaults batem com o `infra/.env.example`.
- `apps/web` em dev usa proxy do Vite (`/api`, `/health`) para o `apps/api`; em produção precisa de `VITE_API_BASE_URL` absoluto.
