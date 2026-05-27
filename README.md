# Vistoria Platform — Auxiliadora Predial

Plataforma de gestão de vistorias imobiliárias com auto-atendimento via Salesforce, roteamento inteligente entre parceiros (Rede Vistorias, Conceitual) e equipe interna.

## Stack

- **Backend** (`apps/api`): NestJS + Prisma + PostgreSQL + RabbitMQ + Redis
- **Frontend** (`apps/web`): React + Vite + Tailwind + Shadcn/UI + Tanstack Query
- **Contratos** (`packages/api-contracts`): schemas Zod compartilhados
- **Integrações** (`packages/integrations`): adapters de parceiros + Salesforce
- **Infra** (`infra/`): Docker Compose, Prometheus, Grafana, Loki

## Estrutura do Monorepo

```
vistoria-platform/
├── apps/
│   ├── api/                   → Backend NestJS (agente BE)
│   └── web/                   → Painel React (agente FE)
├── packages/
│   ├── api-contracts/         → Schemas compartilhados FE/BE
│   └── integrations/          → Adapters de parceiros (agente IN)
├── infra/                     → Docker, observabilidade (agente QI)
├── docs/
│   ├── decisions/             → ADRs
│   ├── changelog/             → Por sprint
│   ├── handoffs/              → Passagem entre agentes
│   ├── agent-sync/            → Comunicação assíncrona
│   └── architecture/          → Diagramas e specs
└── .github/workflows/         → CI
```

## Modelo de Trabalho com 5 Agentes

`QI → BE → IN → FE → DOC → QI` (validação E2E)

Detalhes completos em [AGENTS.md](./AGENTS.md). Cada pasta possui um `CLAUDE.md` com as regras e responsabilidades do agente correspondente.

## Pré-requisitos

- Node.js 20+
- pnpm 9+
- Docker + Docker Compose
- PostgreSQL (via Docker)

## Subir o stack local

Num clone limpo:

```bash
pnpm install                    # instala dependências do monorepo
pnpm dev:all                    # env:setup → docker --wait → prisma migrate → turbo dev
```

Não precisa mais copiar `.env` manualmente — `pnpm env:setup` (Sprint 06) cuida do bootstrap se os arquivos não existirem.

`pnpm dev:all` encadeia quatro passos atômicos, todos disponíveis isolados:

| Script             | O que faz                                                                                        |
| ------------------ | ------------------------------------------------------------------------------------------------ |
| `pnpm env:setup`   | Copia `.env.example → .env` em `apps/api` e `apps/web` se não existirem (idempotente)            |
| `pnpm dev:up`      | `docker compose up -d --wait` — sobe Postgres, Redis, RabbitMQ, MailHog e espera ficarem healthy |
| `pnpm dev:migrate` | `prisma migrate dev` no workspace `@vistoria/api`                                                |
| `pnpm dev`         | `turbo run dev` — API (`apps/api`, NestJS) + Web (`apps/web`, Vite) em paralelo                  |

Credenciais de dev (seed idempotente — `pnpm --filter @vistoria/api prisma:seed`): tenant `auxiliadora`, usuário `admin@auxiliadorapredial.com.br` / senha `admin123`, roles `[ADMIN, GESTOR]`.

## URLs locais

| URL                             | O que é                                                                                                                   |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| http://localhost:5173           | Painel admin React (`apps/web`)                                                                                           |
| http://localhost:3000/api/docs  | Swagger interativo do `apps/api`                                                                                          |
| http://localhost:3000/v1/health | Health check (terminus — Postgres, Redis, RabbitMQ)                                                                       |
| http://localhost:3000/metrics   | Métricas Prometheus (S27 — sem auth na rede interna; ver [ADR-016](./docs/decisions/ADR-016-metrics-endpoint-no-auth.md)) |
| http://localhost:9090           | Prometheus UI (S26 — scrape de `/metrics` da API a cada 15s)                                                              |
| http://localhost:15672          | RabbitMQ Management (`vistoria` / `vistoria`)                                                                             |
| http://localhost:8025           | MailHog UI (caixa de entrada SMTP do dev)                                                                                 |
| http://localhost:5555           | Prisma Studio (rode `pnpm --filter @vistoria/api prisma:studio`)                                                          |

Conexões TCP: Postgres `localhost:5433` (5433 e não 5432 para coexistir com Postgres nativo Windows), Redis `:6379`, RabbitMQ AMQP `:5672`, MailHog SMTP `:1025`.

## Painel admin (apps/web)

Após `pnpm dev:all`, o painel responde em http://localhost:5173 e cobre o fluxo ponta-a-ponta da SAGA. Telas funcionais:

| Rota                        | O que faz                                                                                                                                                                                            |
| --------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/login`                    | Login real contra `POST /api/v1/auth/login` — par access + refresh; refresh transparente no `apiClient` (S14)                                                                                        |
| `/`                         | Dashboard com 4 KPIs vivos via `GET /vistorias/stats` (Solicitadas / Roteadas / Em execução / Concluídas)                                                                                            |
| `/vistorias`                | Lista paginada (20/pág) com filtros por status, tipo e `codigoImovelExterno` (S24)                                                                                                                   |
| `/vistorias/novo`           | Criação de Vistoria — entra direto em `ROTEADA` (routing inline com `providerId` desde S12)                                                                                                          |
| `/vistorias/:id`            | Detalhe completo + **timeline da SAGA** (S14) + cancelamento condicionado aos estados pré-execução                                                                                                   |
| `/audit`                    | Audit log filtrável — inclui `VISTORIA.STATUS_CHANGED` desde S12 (BE consome eventos do IN via RMQ)                                                                                                  |
| `/users`                    | Lista, criação e edição de usuários (S19); soft-delete; **card de cobertura geográfica** com autocomplete IBGE (S24)                                                                                 |
| `/agenda`                   | **Calendário mensal da agenda (S29)** — ADMIN/GESTOR escolhe vistoriador via dropdown; **VISTORIADOR puro vê a própria agenda** (RBAC do BE S27); drawer lateral, bloqueio em lote por período, KPIs |
| `/vistoriadores/:id/agenda` | Deep-link da lista de usuários para a mesma `AgendaPage` com vistoriador pré-selecionado                                                                                                             |
| `/health`                   | Status dos componentes do `apps/api` (Postgres, Redis, RabbitMQ)                                                                                                                                     |

## Endpoints REST (apps/api)

Documentação interativa em http://localhost:3000/api/docs. Conjunto vivo após o sexto ciclo:

| Método | Rota                                           | Auth                                                                                      | Entrou em |
| ------ | ---------------------------------------------- | ----------------------------------------------------------------------------------------- | --------- |
| POST   | `/api/v1/auth/login`                           | público                                                                                   | S07       |
| POST   | `/api/v1/auth/refresh`                         | refresh próprio                                                                           | S12       |
| GET    | `/api/v1/auth/me`                              | JWT                                                                                       | S07       |
| GET    | `/api/v1/vistorias`                            | JWT                                                                                       | S07       |
| GET    | `/api/v1/vistorias/stats`                      | JWT                                                                                       | S12       |
| GET    | `/api/v1/vistorias/:id`                        | JWT                                                                                       | S07       |
| GET    | `/api/v1/vistorias/:id/transicoes`             | JWT                                                                                       | S12       |
| POST   | `/api/v1/vistorias`                            | JWT                                                                                       | S07       |
| POST   | `/api/v1/vistorias/:id/cancelar`               | JWT                                                                                       | S07       |
| GET    | `/api/v1/users`                                | JWT (ADMIN/GESTOR)                                                                        | S17       |
| POST   | `/api/v1/users`                                | JWT (ADMIN/GESTOR)                                                                        | S17       |
| GET    | `/api/v1/users/:id`                            | JWT (ADMIN/GESTOR)                                                                        | S17       |
| PATCH  | `/api/v1/users/:id`                            | JWT (ADMIN/GESTOR)                                                                        | S17       |
| DELETE | `/api/v1/users/:id`                            | JWT (ADMIN/GESTOR)                                                                        | S17       |
| GET    | `/api/v1/vistoriadores/:id/agenda`             | JWT (ADMIN/GESTOR + **VISTORIADOR na própria** S27)                                       | S17       |
| POST   | `/api/v1/vistoriadores/:id/agenda`             | idem RBAC                                                                                 | S17       |
| PATCH  | `/api/v1/vistoriadores/:id/agenda/:slotId`     | idem RBAC                                                                                 | S17       |
| DELETE | `/api/v1/vistoriadores/:id/agenda/:slotId`     | idem RBAC                                                                                 | S17       |
| POST   | `/api/v1/vistoriadores/:id/agenda:bulk-block`  | idem RBAC                                                                                 | **S27**   |
| POST   | `/api/v1/vistoriadores/:id/agenda:bulk-update` | idem RBAC                                                                                 | **S27**   |
| DELETE | `/api/v1/vistoriadores/:id/agenda:bulk-delete` | idem RBAC                                                                                 | **S27**   |
| GET    | `/api/v1/users/:id/cobertura`                  | JWT (ADMIN/GESTOR)                                                                        | S22       |
| POST   | `/api/v1/users/:id/cobertura`                  | JWT (ADMIN/GESTOR)                                                                        | S22       |
| DELETE | `/api/v1/users/:id/cobertura/:coberturaId`     | JWT (ADMIN/GESTOR)                                                                        | S22       |
| GET    | `/api/v1/audit-logs`                           | JWT (ADMIN/GESTOR)                                                                        | S07       |
| POST   | `/api/v1/integrations/webhooks/rede-vistorias` | HMAC público                                                                              | S03/S08   |
| POST   | `/api/v1/integrations/webhooks/conceitual`     | HMAC público                                                                              | S03/S08   |
| GET    | `/v1/health`                                   | público                                                                                   | S02       |
| GET    | `/metrics`                                     | público em rede interna ([ADR-016](./docs/decisions/ADR-016-metrics-endpoint-no-auth.md)) | **S27**   |

## Outros comandos

```bash
pnpm build                      # build de tudo via turbo
pnpm lint                       # lint do monorepo
pnpm test                       # testes
pnpm typecheck                  # tsc --noEmit

pnpm docker:up                  # só os containers (sem migrate / sem turbo dev)
pnpm docker:down                # derruba containers (mantém volumes)
pnpm docker:reset               # down -v + up -d (reseta volumes!)
pnpm docker:logs                # tail dos containers
```

## SAGA de Vistoria

`SOLICITADA → ROTEADA → AGENDADA → CONFIRMADA → EM_EXECUÇÃO → LAUDO_PENDENTE → LAUDO_APROVADO → CONCLUÍDA | CANCELADA`

Diagramas vivos em [`docs/architecture/`](./docs/architecture/) — incluindo [C4 Context](./docs/architecture/c4-context.md), [C4 Container](./docs/architecture/c4-container.md), [SAGA](./docs/architecture/saga-vistoria.md), [ERD](./docs/architecture/erd.md), fluxos de auth, webhooks e eventos.

## Princípios Inviolávies

Veja [CLAUDE.md](./CLAUDE.md) para os 7 princípios arquiteturais e regras gerais do projeto.
