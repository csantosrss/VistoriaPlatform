# Architecture

Diagramas e specs vivos do projeto. Mantidos pelo agente DOC. Use Mermaid sempre que possível para que o GitHub renderize inline.

## Diagramas Vivos

- [x] [c4-context.md](./c4-context.md) — C4 Context (sistema + atores + parceiros + Salesforce)
- [x] [c4-container.md](./c4-container.md) — C4 Container (apps/api, apps/web, RMQ, Postgres, Redis, parceiros)
- [x] [saga-vistoria.md](./saga-vistoria.md) — SAGA state machine (9 estados de Vistoria)
- [x] [webhook-flow.md](./webhook-flow.md) — Fluxo de webhook (parceiro → API)
- [x] [auth-flow.md](./auth-flow.md) — Sequência de autenticação JWT RS256
- [x] [event-flow.md](./event-flow.md) — Exchanges/queues RabbitMQ
- [x] [status-mapping.md](./status-mapping.md) — Mapeamento status parceiro → SAGA
- [x] [erd.md](./erd.md) — ERD do schema atual (Tenant, User, AuditLog)

## Convenções

- Todo diagrama referenciado por um ADR deve estar versionado aqui
- Preferir Mermaid; PNG/SVG apenas quando o Mermaid não der conta
- Nomear arquivos com kebab-case e prefixo do tipo: `c4-context.md`, `saga-vistoria.md`, `erd.md`

## Como adicionar um diagrama

1. Crie o arquivo `.md` aqui
2. Cite-o no ADR ou changelog que o motivou
3. Se substituir um diagrama anterior, marque o antigo como "Superseded by ..."
