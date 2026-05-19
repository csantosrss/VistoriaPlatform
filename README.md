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

```bash
pnpm install                    # instala dependências do monorepo
cp infra/.env.example infra/.env       # opcional — só pra customizar
cp apps/api/.env.example apps/api/.env # obrigatório antes do dev:all

pnpm dev:all                    # docker --wait → prisma migrate → turbo dev
```

`pnpm dev:all` encadeia três passos atômicos, todos disponíveis isolados:

| Script             | O que faz                                                                                        |
| ------------------ | ------------------------------------------------------------------------------------------------ |
| `pnpm dev:up`      | `docker compose up -d --wait` — sobe Postgres, Redis, RabbitMQ, MailHog e espera ficarem healthy |
| `pnpm dev:migrate` | `prisma migrate dev` no workspace `@vistoria/api`                                                |
| `pnpm dev`         | `turbo run dev` — API (`apps/api`, NestJS) + Web (`apps/web`, Vite) em paralelo                  |

## URLs locais

| URL                             | O que é                                                          |
| ------------------------------- | ---------------------------------------------------------------- |
| http://localhost:5173           | Painel admin React (`apps/web`)                                  |
| http://localhost:3000/api/docs  | Swagger interativo do `apps/api`                                 |
| http://localhost:3000/v1/health | Health check (terminus — Postgres, Redis, RabbitMQ)              |
| http://localhost:15672          | RabbitMQ Management (`vistoria` / `vistoria`)                    |
| http://localhost:8025           | MailHog UI (caixa de entrada SMTP do dev)                        |
| http://localhost:5555           | Prisma Studio (rode `pnpm --filter @vistoria/api prisma:studio`) |

Conexões TCP: Postgres `localhost:5433` (5433 e não 5432 para coexistir com Postgres nativo Windows), Redis `:6379`, RabbitMQ AMQP `:5672`, MailHog SMTP `:1025`.

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
