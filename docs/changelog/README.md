# Changelog

Histórico de sprints da Plataforma de Vistorias. Cada sprint produz um arquivo consolidado pelo agente DOC ao final, listando: itens entregues, ADRs, breaking changes, métricas e roteiro do próximo sprint.

## Sprints

| #                           | Tema                                                              | Agente | Data       |
| --------------------------- | ----------------------------------------------------------------- | ------ | ---------- |
| [SPRINT-01](./SPRINT-01.md) | Setup de qualidade e infra (Docker, CI, hooks)                    | QI     | 2026-04-26 |
| [SPRINT-02](./SPRINT-02.md) | Bootstrap NestJS + Prisma + auth JWT + health                     | BE     | 2026-04-26 |
| [SPRINT-03](./SPRINT-03.md) | Integrações: providers, webhooks HMAC, RMQ subscriber, Salesforce | IN     | 2026-04-26 |
| [SPRINT-04](./SPRINT-04.md) | Painel admin React + Tailwind + Shadcn                            | FE     | 2026-04-27 |
| [SPRINT-05](./SPRINT-05.md) | Documentação consolidada (C4 + ERD, README, validação handoffs)   | DOC    | 2026-05-19 |

## Convenções

- Cada sprint tem **um agente solo** (QI → BE → IN → FE → DOC, depois loop com QI fazendo validação E2E)
- `breaking changes` listado explicitamente; vazio significa "nenhuma"
- Métricas: arquivos commitados, testes passando, dependências adicionadas, endpoints/eventos novos, tamanho de build (FE)
- ADRs sempre referenciados com link absoluto

## Como contribuir

- Apenas o agente DOC consolida changelogs
- Outros agentes devem deixar `docs/handoffs/SPRINT-XX-AGENT.md` ricos o suficiente para que o DOC consiga gerar o changelog sem investigar o código
