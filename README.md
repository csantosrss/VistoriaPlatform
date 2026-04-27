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

## Comandos

```bash
# Instalar dependências do monorepo
pnpm install

# Rodar dev de todos os apps
pnpm dev

# Build de tudo
pnpm build

# Lint, testes, typecheck
pnpm lint
pnpm test
pnpm typecheck
```

## SAGA de Vistoria

`SOLICITADA → ROTEADA → AGENDADA → CONFIRMADA → EM_EXECUÇÃO → LAUDO_PENDENTE → LAUDO_APROVADO → CONCLUÍDA | CANCELADA`

## Princípios Inviolávies

Veja [CLAUDE.md](./CLAUDE.md) para os 7 princípios arquiteturais e regras gerais do projeto.
