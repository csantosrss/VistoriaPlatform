# Agentes e Protocolo de Comunicação

## Os 5 Agentes

### QI — Quality & Infrastructure
- **Pode:** Docker, CI/CD, testes E2E, migrations, observabilidade, scripts de dev
- **Não pode:** lógica de negócio, componentes React, adapters de parceiros
- **Ordem:** primeiro (setup) e último (validação) de cada sprint

### BE — Backend Engineer
- **Pode:** NestJS modules, Prisma, SAGA, motor de regras, DTOs, use cases, unit tests
- **Não pode:** React, HTTP clients para parceiros, Docker/CI, Salesforce
- **Ordem:** 2º no sprint

### IN — Integração
- **Pode:** adapters de parceiros, Salesforce LWC/Apex, HTTP clients, webhook handlers
- **Não pode:** alterar domain/use-cases, alterar SAGA, criar telas React admin
- **Ordem:** 3º no sprint

### FE — Frontend Engineer
- **Pode:** React, Shadcn/UI, Tanstack Query, forms, dashboards, mobile-responsive
- **Não pode:** tocar em `apps/api`, implementar lógica de negócio, criar LWC Salesforce
- **Ordem:** 4º no sprint

### DOC — Documentador
- **Pode:** criar ADRs, changelogs, diagramas, atualizar READMEs, validar handoffs
- **Não pode:** alterar código de negócio, corrigir bugs, implementar features
- **Ordem:** 5º no sprint (antes da validação final do QI)

## Protocolo de Comunicação Inter-Agentes

### 1. HANDOFF.md (obrigatório ao finalizar o trabalho)
Cada agente, ao terminar sua parte do sprint, gera `docs/handoffs/SPRINT-XX-AGENT-YY.md`:

```yaml
agent: BE
sprint: "02"
completed_items: [V-008, V-009, V-010]
new_endpoints:
  - "POST /api/v1/vistorias"
  - "GET /api/v1/vistorias/:id"
new_events: [VISTORIA.CRIADA, VISTORIA.ROTEADA]
env_vars_added: [SAGA_TIMEOUT_MS]
database_changes:
  migrations: ["20260416_add_vistoria_table"]
  new_tables: [Vistoria, VistoriaTransicao]
pending_for:
  IN: "Implementar IVistoriaProvider.agendar() consumindo POST /vistorias"
  FE: "Consumir GET /vistorias com filtros de status e período"
breaking_changes: []
decisions_made:
  - id: "ADR-003"
    title: "Uso de Prisma ao invés de TypeORM"
known_issues: []
```

### 2. Agent-Sync (comunicação assíncrona)
Quando um agente precisa alinhar algo com outro FORA da ordem normal, cria:
`docs/agent-sync/YYYY-MM-DD-from-XX-to-YY-topic.md`

Exemplo: IN precisa de um novo campo no DTO que BE criou. Em vez de alterar direto, cria um sync-request.

### 3. ADR (Architecture Decision Record)
Decisões não-triviais são documentadas em `docs/decisions/ADR-NNN-titulo.md`:

```markdown
# ADR-NNN: Título da Decisão

## Status
Proposta | Aceita | Rejeitada | Substituída por ADR-XXX

## Contexto
O que motivou a decisão?

## Decisão
O que foi decidido?

## Alternativas Consideradas
- Opção A: ... (por que não)
- Opção B: ... (por que não)

## Consequências
- Positivas: ...
- Negativas: ...
- Riscos: ...

## Agente Autor
BE, IN, QI, FE ou DOC

## Data
YYYY-MM-DD

## Sprint
SXX
```

### 4. Changelog de Sprint
Ao final de cada sprint, DOC consolida `docs/changelog/SPRINT-XX.md`:
- Itens entregues
- ADRs criados
- Breaking changes
- Métricas (LoC, cobertura, endpoints)
- Próximo sprint
