# Sprint 26 — Changelog

**Período**: 2026-05-26
**Agente solo**: QI (abertura do ciclo 6)
**Tema**: Critérios + contratos da agenda nova (calendário mensal) + esteira Prometheus iniciada.

## Itens entregues

### 1. Handoff QI estabelecendo escopo do ciclo

[SPRINT-26-QI.md](../handoffs/SPRINT-26-QI.md): critérios de aceitação
detalhados para BE/FE/IN e contratos Zod dos endpoints novos que o BE
implementaria no S27 (`:bulk-block`, `:bulk-update`, `:bulk-delete`,
RBAC vistoriador, `/metrics`).

### 2. Specs Playwright novas

- [`e2e/users-cobertura-ui.spec.ts`](../../e2e/users-cobertura-ui.spec.ts)
  — pendente herdado do S25. Browser real: cria vistoriador → abre
  `/users/:id` → cadastra cobertura via UF/cidade IBGE → mensagem
  amigável em duplicata (não vaza 409 cru).
- [`e2e/agenda-calendar-ui.spec.ts`](../../e2e/agenda-calendar-ui.spec.ts)
  — **contrato executável** da agenda nova. 4 cenários (calendário +
  drawer, ações em massa, bloquear período, deep-link) com
  `test.fixme()` à espera do FE implementar.

Total Playwright após o sprint: **36 testes em 10 arquivos** (era 30 em
8).

### 3. Prometheus mínimo no docker-compose

- [`infra/prometheus/prometheus.yml`](../../infra/prometheus/prometheus.yml)
  com scrape configs para `vistoria-api`
  (`host.docker.internal:3000/metrics`) e `rabbitmq:15692`.
- [`infra/docker-compose.yml`](../../infra/docker-compose.yml) ganha
  service `prom/prometheus:v2.55.0` com healthcheck (`/-/healthy`),
  volume persistente, `extra_hosts: host-gateway`.
- `infra/.env.example`: `PROMETHEUS_PORT=9090`.
- Target `vistoria-api` fica **DOWN** até BE expor `/metrics` no S27 —
  esperado.

### 4. Decisões de produto (`AskUserQuestion`)

- Visualização: **calendário mensal estilo Google** (badges contando
  slots por dia, click abre detalhes do dia).
- Recursos: bloqueio em lote por período, ações em massa, KPIs com
  mini-gráfico, **incluindo RBAC para vistoriador acessar a própria
  agenda**.
- Escopo Sprint 26: agenda + pendentes do S25 (cobertura E2E browser +
  esteira Prometheus).

## ADRs criados

Nenhum no QI; candidatos surgem nos sprints seguintes do ciclo (ver
SPRINT-30).

## Breaking changes

Nenhum — só infra + specs.

## Métricas

- 2 specs Playwright novas (+ 6 testes).
- 1 service novo no docker-compose (Prometheus).
- 1 arquivo de scrape config.
- 0 mudanças de código de aplicação.

## Nota de processo

O ciclo 6 foi aberto após um **desvio de protocolo** corrigido
imediatamente: na sessão de produto, o FE chegou a implementar a tela
nova fora de ordem (sem QI/BE/IN). Foi revertido, e a Sprint 26
abriu corretamente como QI. Detalhes no [SPRINT-30](./SPRINT-30.md).

## Próximo sprint

**Sprint 27 — BE**: 3 bulk endpoints + RBAC vistoriador + `/metrics`

- contracts + audit + unit tests.
