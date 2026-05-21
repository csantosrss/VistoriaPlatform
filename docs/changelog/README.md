# Changelog

Histórico de sprints da Plataforma de Vistorias. Cada sprint produz um arquivo consolidado pelo agente DOC ao final, listando: itens entregues, ADRs, breaking changes, métricas e roteiro do próximo sprint.

## Sprints

| #                           | Tema                                                                     | Agente | Data       |
| --------------------------- | ------------------------------------------------------------------------ | ------ | ---------- |
| [SPRINT-01](./SPRINT-01.md) | Setup de qualidade e infra (Docker, CI, hooks)                           | QI     | 2026-04-26 |
| [SPRINT-02](./SPRINT-02.md) | Bootstrap NestJS + Prisma + auth JWT + health                            | BE     | 2026-04-26 |
| [SPRINT-03](./SPRINT-03.md) | Integrações: providers, webhooks HMAC, RMQ subscriber, Salesforce        | IN     | 2026-04-26 |
| [SPRINT-04](./SPRINT-04.md) | Painel admin React + Tailwind + Shadcn                                   | FE     | 2026-04-27 |
| [SPRINT-05](./SPRINT-05.md) | Documentação consolidada (C4 + ERD, README, validação handoffs)          | DOC    | 2026-05-19 |
| [SPRINT-06](./SPRINT-06.md) | E2E Playwright + bootstrap .env + CI endurecida + rename commitlint      | QI     | 2026-05-19 |
| [SPRINT-07](./SPRINT-07.md) | Auth real + CRUD Vistorias + audit endpoint + seed dev                   | BE     | 2026-05-19 |
| [SPRINT-08](./SPRINT-08.md) | Port de status writer + provider routing + webhook→SAGA via RMQ          | IN     | 2026-05-19 |
| [SPRINT-09](./SPRINT-09.md) | Telas reais do painel admin plugadas no BE (auth, vistorias, audit)      | FE     | 2026-05-19 |
| [SPRINT-10](./SPRINT-10.md) | Consolidação documental do segundo ciclo (changelogs 08–09, C4, README)  | DOC    | 2026-05-19 |
| [SPRINT-11](./SPRINT-11.md) | E2E ampliada (admin UI + webhooks) + CI endurecida + cache do Chromium   | QI     | 2026-05-19 |
| [SPRINT-12](./SPRINT-12.md) | Routing inline + handler RMQ + transições + refresh token + stats        | BE     | 2026-05-20 |
| [SPRINT-13](./SPRINT-13.md) | eventId no writer + InternoProvider funcional + orchestrator routed      | IN     | 2026-05-20 |
| [SPRINT-14](./SPRINT-14.md) | Refresh transparente + timeline SAGA + dashboard via /stats              | FE     | 2026-05-20 |
| [SPRINT-15](./SPRINT-15.md) | Consolidação documental do terceiro ciclo (changelogs 11–14, C4, README) | DOC    | 2026-05-20 |

## Convenções

- Cada sprint tem **um agente solo** (QI → BE → IN → FE → DOC, depois loop com QI fazendo validação E2E)
- `breaking changes` listado explicitamente; vazio significa "nenhuma"
- Métricas: arquivos commitados, testes passando, dependências adicionadas, endpoints/eventos novos, tamanho de build (FE)
- ADRs sempre referenciados com link absoluto

## Como contribuir

- Apenas o agente DOC consolida changelogs
- Outros agentes devem deixar `docs/handoffs/SPRINT-XX-AGENT.md` ricos o suficiente para que o DOC consiga gerar o changelog sem investigar o código
