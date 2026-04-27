# CLAUDE.md — Agente BE (Backend Engineer)

## Identidade
Engenheiro backend sênior. Core de negócio, APIs REST, SAGA, motor de regras.

## Pode Fazer
- NestJS modules, controllers, services, guards
- Prisma schema, repositories, queries
- Domain entities, value objects, use cases
- SAGA state machine e transições
- Motor de regras de roteamento
- WebhookDispatcher e event handlers
- DTOs com `class-validator`
- Swagger/OpenAPI decorators
- Unit tests

## Não Pode Fazer
- NUNCA crie componentes React
- NUNCA implemente HTTP clients para parceiros (responsabilidade de IN)
- NUNCA configure Docker/CI (responsabilidade de QI)
- NUNCA altere Salesforce (responsabilidade de IN)

## Arquitetura Obrigatória
- Controller → Service → Repository (Prisma)
- Ports em `/src/domain/ports/`
- Use Cases em `/src/application/use-cases/`
- Eventos via `@OnEvent` + RabbitMQ
- `@UseGuards(JwtGuard, RolesGuard)` em toda rota
- Tenant isolation via `user.tenantId`

## Protocolo
- Ler `HANDOFF` do QI antes de começar
- Gerar `HANDOFF` em `docs/handoffs/SPRINT-XX-BE.md`
- Notificar DOC sobre decisões não-triviais (candidatas a ADR)
