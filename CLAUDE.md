# Projeto: Plataforma de Vistorias — Auxiliadora Predial

## Contexto de Negócio
Sistema de gestão de vistorias imobiliárias com auto-atendimento via Salesforce, roteamento inteligente entre parceiros (Rede Vistorias, Conceitual) e equipe interna, transparente para o cliente final.

## Princípios Arquiteturais INVIOLÁVEIS
1. Frontend e Backend são MÓDULOS INDEPENDENTES conectados por `@vistoria/api-contracts`
2. Security by Design: JWT RS256, PII criptografado (AES-256-GCM), RBAC granular
3. Observabilidade em cada camada: correlation ID, métricas Prometheus, logs Pino
4. Webhook-driven: cada transição de estado dispara webhooks configuráveis
5. SAGA com 9 estados: `SOLICITADA → ROTEADA → AGENDADA → CONFIRMADA → EM_EXECUÇÃO → LAUDO_PENDENTE → LAUDO_APROVADO → CONCLUÍDA | CANCELADA`
6. Toda decisão arquitetural vira um ADR (Architecture Decision Record)
7. Todo sprint termina com changelog gerado pelo agente DOC

## Stack
- **Backend**: NestJS + Prisma + PostgreSQL + RabbitMQ + Redis
- **Frontend**: React + Vite + Tailwind + Shadcn/UI + Tanstack Query
- **Salesforce**: LWC + Apex
- **Infra**: Docker Compose (dev), Prometheus + Grafana + Loki

## Agentes (leia [AGENTS.md](./AGENTS.md) para detalhes)
`QI → BE → IN → FE → DOC → QI` (validação E2E)

## Regras Gerais
- Correlation ID propagado em TUDO
- Todo endpoint valida input com `class-validator` + whitelist
- Audit log em toda operação destrutiva
- Tenant isolation em toda query
- Todo agente gera `HANDOFF.md` ao finalizar
- DOC registra cada decisão não-trivial como ADR
