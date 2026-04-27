---
from: QI
to: DOC
sprint: "01"
date: 2026-04-26
topic: "Decisões arquiteturais para registrar como ADR"
---

# Sync QI → DOC — Sprint 01

Olá DOC. Durante o setup de infraestrutura, duas decisões não-triviais foram tomadas que precisam virar ADR. Abaixo o material bruto para você consolidar nos arquivos `docs/decisions/ADR-001-*.md` e `docs/decisions/ADR-002-*.md`.

---

## ADR-001: RabbitMQ como message broker (vs Kafka)

### Contexto

A SAGA de Vistoria emite eventos de domínio (`VISTORIA.SOLICITADA`, `VISTORIA.ROTEADA`, `VISTORIA.CONCLUIDA`, etc) que são consumidos por (a) integrações com parceiros, (b) Salesforce, (c) webhook dispatcher, (d) auditoria. Volume esperado é moderado (centenas a baixos milhares de mensagens/dia por tenant), com requisitos de:

- Roteamento por tipo de evento
- Retry com dead-letter
- Painel de inspeção em dev e produção
- Latência baixa por mensagem (não streaming de alto throughput)

### Decisão

**RabbitMQ 3.13 (image `rabbitmq:3.13-management`).**

### Alternativas Consideradas

- **Apache Kafka**: superior para event streaming de alto volume e replay histórico de longo prazo, mas operacionalmente pesado (Zookeeper/KRaft, partições, consumer groups, schema registry). Volumetria do projeto não justifica a complexidade.
- **AWS SQS / SNS**: vendor lock-in. Inviabiliza self-hosting on-prem (requisito de algumas imobiliárias parceiras).
- **Redis Streams**: já temos Redis, mas falta DLQ nativa robusta e UI de inspeção é precária.

### Consequências

- **Positivas**: TTL, DLQ, exchanges (topic/direct/fanout) prontos. UI de management na porta 15672 para debug. Bibliotecas NestJS (`@nestjs/microservices` + `amqplib`) maduras. Footprint pequeno em dev.
- **Negativas**: replay histórico longo (semanas/meses) não é o forte — caso seja necessário no futuro, considerar Kafka ou soluções de event sourcing dedicadas.
- **Riscos**: clustering RabbitMQ tem nuances de partições de rede (split-brain). Para produção, planejar quorum queues ou cluster com `pause_minority`.

### Autor

QI

### Sprint

S01

---

## ADR-002: Turborepo como orquestrador de monorepo (vs Nx)

### Contexto

O monorepo tem `apps/*` (api, web), `packages/*` (config, api-contracts, integrations) e `infra/`. Precisamos de:

- Cache local e remoto de tasks
- `dependsOn` entre pacotes (ex.: web depende de contracts)
- Pipelines paralelas (lint/test/typecheck simultâneos onde não há dependência)
- Curva de aprendizado baixa
- Boa integração com pnpm workspaces

### Decisão

**Turborepo 2.x (`turbo`).**

### Alternativas Consideradas

- **Nx**: mais opinionated, gera scaffolding automático, com plugins ricos para NestJS e React. Porém, traz "Nx-isms" (project graph, executors, generators) que adicionam carga cognitiva e podem dificultar a extração futura de pacotes para fora do monorepo.
- **Lerna**: descontinuado em prática (mantido por outros, mas estagnado). Sem cache moderno.
- **Bazel**: industrial, excessivo para este escopo.

### Consequências

- **Positivas**: configuração mínima (`turbo.json`), respeita os scripts existentes em cada `package.json`. Cache local automático e remote-cache plugável (Vercel, GitHub Actions). Sai do caminho.
- **Negativas**: sem geradores de scaffolding (cada agente cria sua estrutura manualmente — alinhado com nosso protocolo de agentes especializados, então não é problema).
- **Riscos**: cache hit miss em CI até as keys estarem bem ajustadas. Vamos monitorar nos primeiros sprints.

### Autor

QI

### Sprint

S01

---

## Solicitação ao DOC

1. Criar `docs/decisions/ADR-001-rabbitmq-vs-kafka.md` e `docs/decisions/ADR-002-turborepo-vs-nx.md` usando o `ADR-TEMPLATE.md`
2. Linkar ambos no `docs/changelog/SPRINT-01.md` quando consolidar o sprint
3. Considerar diagrama Mermaid em `docs/architecture/event-flow.md` mostrando como os eventos da SAGA fluem pelo RabbitMQ até os consumidores (BE → IN → Salesforce)
