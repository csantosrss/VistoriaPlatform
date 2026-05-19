# C4 — Context

Visão de mais alto nível da Plataforma de Vistorias: o sistema, seus usuários e os sistemas externos que ele integra.

## Diagrama

```mermaid
flowchart TB
    subgraph Atores
        cliente["Cliente final<br/>(locatário/proprietário)"]
        gestor["Gestor /<br/>Vistoriador interno"]
        admin["Administrador<br/>plataforma"]
    end

    subgraph Sistema["Plataforma de Vistorias"]
        api["apps/api<br/>NestJS REST + RMQ"]
        web["apps/web<br/>Painel React admin"]
    end

    subgraph Externos["Sistemas externos"]
        sf["Salesforce<br/>auto-atendimento<br/>(LWC + Apex)"]
        rv["Rede Vistorias<br/>(parceiro)"]
        cc["Conceitual<br/>(parceiro)"]
        smtp["SMTP relay<br/>(MailHog em dev)"]
    end

    cliente -- "cria solicitação<br/>HTTPS" --> sf
    sf -- "POST /api/v1/vistorias<br/>JWT RS256" --> api
    gestor -- "consulta/atribui<br/>HTTPS + JWT" --> web
    admin -- "configura tenants<br/>HTTPS + JWT" --> web
    web -- "fetch JSON<br/>/api/v1/*" --> api

    api -- "POST agendar<br/>HMAC SHA-256" --> rv
    api -- "POST agendar<br/>HMAC SHA-256" --> cc
    rv -- "webhook callback<br/>HMAC verificado" --> api
    cc -- "webhook callback<br/>HMAC verificado" --> api
    api -- "envio de notificações" --> smtp
    api -- "publica eventos<br/>VISTORIA.*" --> sf
```

## Atores

| Ator                 | Como interage                                                          |
| -------------------- | ---------------------------------------------------------------------- |
| Cliente final        | Solicita vistoria pelo Salesforce (LWC). Não acessa o painel admin.    |
| Gestor / Vistoriador | Acessa `apps/web` com JWT do tenant; consulta, atribui, valida laudos. |
| Administrador        | Acessa `apps/web`; gerencia tenants, usuários, parceiros.              |

## Sistemas externos

| Sistema                 | Direção      | Protocolo                                                                                   |
| ----------------------- | ------------ | ------------------------------------------------------------------------------------------- |
| Salesforce (LWC + Apex) | Bidirecional | REST JSON com JWT RS256 entrando, eventos de SAGA saindo                                    |
| Rede Vistorias          | Bidirecional | REST com HMAC SHA-256 nos webhooks ([ADR-007](../decisions/ADR-007-webhook-hmac-sha256.md)) |
| Conceitual              | Bidirecional | REST com HMAC SHA-256 nos webhooks ([ADR-007](../decisions/ADR-007-webhook-hmac-sha256.md)) |
| SMTP relay              | Saída        | SMTP — MailHog em dev (porta 1025)                                                          |

## Convenções

- Toda chamada externa carrega `X-Correlation-Id` para rastreabilidade ponta-a-ponta.
- Autenticação inter-sistema usa JWT RS256 ([ADR-004](../decisions/ADR-004-jwt-rs256.md)).
- Webhooks recebidos são autenticados por HMAC; o handler em `packages/integrations` rejeita antes de tocar no domínio.

## Diagramas relacionados

- [c4-container.md](./c4-container.md) — detalha como os containers internos se conectam.
- [event-flow.md](./event-flow.md) — exchanges/queues RabbitMQ.
- [saga-vistoria.md](./saga-vistoria.md) — máquina de estados da Vistoria.
