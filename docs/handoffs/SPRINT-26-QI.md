---
agent: QI
sprint: "26"
date: 2026-05-26
---

# Handoff — Sprint 26 (QI) → Sprint 27 (BE)

## Resumo

Abertura do ciclo 6. Três frentes:

1. **Redesign da tela de Agenda** (pedido novo do produto nesta sessão):
   substituir a tabela linear por **calendário mensal**, drawer lateral do
   dia, KPIs no topo e bloqueio em lote por período. Inclui RBAC novo
   permitindo que o vistoriador acesse a própria agenda.

2. **Pendentes do Sprint 25 acolhidos**:
   - E2E browser-based de cobertura (`users-cobertura-ui.spec.ts`) —
     entregue aqui pelo QI.
   - Início da esteira **Prometheus** — serviço no docker-compose +
     scrape config + pedido pro BE expor `/metrics`.

3. **Critérios de aceitação detalhados** para BE e FE deste ciclo, com
   contratos dos novos endpoints já desenhados.

Próximo agente é o **BE** (Sprint 27).

## Entregas deste sprint (QI)

### 1. Spec E2E browser de cobertura

`e2e/users-cobertura-ui.spec.ts` cobre o fluxo de UI:

- Login pela UI → /users → cria vistoriador → /users/:id.
- Aba/card "Áreas de cobertura" visível (só para VISTORIADOR).
- UF select (autocomplete IBGE) → cidade combobox (datalist filtrado pelo
  IBGE) → bairro livre → submit.
- Cobertura aparece na lista do card sem reload.
- Tenta duplicata → mensagem de erro amigável (texto contendo
  "redundante" ou "já cadastrad"); 409 do BE não vaza como JSON.

Status: rodável quando docker-compose + apps de pé. CI ainda não bloqueia.

### 2. Setup Prometheus no docker-compose

- Serviço `prometheus` adicionado em `infra/docker-compose.yml`
  (`prom/prometheus:v2.55`) com healthcheck e volume persistente.
- Arquivo `infra/prometheus/prometheus.yml` com scrape job
  `vistoria-api` apontando para `host.docker.internal:3000/metrics` no
  intervalo de 15s.
- `infra/.env.example` ganha `PROMETHEUS_PORT=9090`.
- `package.json` raiz: nenhum script novo nesta sprint (próximo QI
  encadeia Grafana + dashboards básicos).

**Pendência**: o `/metrics` na API ainda não existe. Documentado no
pedido para BE (§4 abaixo). Até lá, o Prometheus sobe mas registra o
target `vistoria-api` como **DOWN** — esperado e aceito.

### 3. Spec E2E (contrato) da agenda nova

`e2e/agenda-calendar-ui.spec.ts` documenta o caminho de UI que o FE
desta sprint deve fazer passar. Marcado `test.fixme()` em cada caso até
o FE entregar. Atua como contrato executável:

- Caso 1: admin escolhe vistoriador no `/agenda` → calendário mensal
  renderiza → click em um dia abre drawer → "+ Novo slot" cria → badge
  aparece na célula do calendário.
- Caso 2: drawer com slots → seleciona 2 via checkbox → "Bloquear" em
  massa → ambos viram bloqueados.
- Caso 3: header "Bloquear período" → modal com from/to → confirma →
  contagem de bloqueados no calendário aumenta.

### 4. Critérios de aceitação consolidados (este sprint)

Servem de DoD para BE, IN e FE.

#### Agenda — UI (FE entrega na Sprint 29)

| Critério                                                                                                      | Aceite                                                                  |
| ------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| Substituir tabela linear por calendário mensal 7×6                                                            | Botões mês +/– / Hoje funcionam; dia clicado fica destacado.            |
| Badges por dia mostrando contagem de livres (verde) e bloqueados (vermelho)                                   | Visíveis em todos os dias com slot; dia sem slot não mostra badge.      |
| Drawer lateral do dia com lista de slots, checkbox-all, edição inline e form "+ Novo slot" com defaults 8h–9h | Funciona em desktop como painel adjacente, em mobile como overlay.      |
| Barra de ações em massa (Bloquear / Liberar / Remover) ao selecionar slots                                    | Mostra progresso `done/total`; lista até 5 erros se houver falha.       |
| Modal "Bloquear período" com from/to/motivo                                                                   | Mostra contagem prévia dos slots livres que serão atingidos.            |
| 4 KPIs no topo (Slots no mês / Disponíveis % / Bloqueados / mini-gráfico por dia da semana)                   | Cards Shadcn; mini-gráfico em CSS puro (sem dep nova de Recharts).      |
| Rota `/agenda` para vistoriador logado consultar/editar a própria agenda                                      | Sem dropdown; calendário direto. Só visível para `roles ⊇ VISTORIADOR`. |
| Rota `/agenda` para ADMIN/GESTOR com dropdown de vistoriador                                                  | Mesma página, dropdown popula via `useUsers({ role: 'VISTORIADOR' })`.  |
| Deep-link `/vistoriadores/:id/agenda` da lista de usuários continua funcionando                               | Renderiza mesma página com `vistoriadorId` pré-selecionado.             |
| Item "Agenda" no sidebar (`AdminLayout`)                                                                      | Ícone `CalendarDays`, entre Vistorias e Usuários.                       |

#### Agenda — Backend (BE entrega na Sprint 27)

| Critério                                                                                                 | Aceite                                                                                                              |
| -------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `POST /api/v1/vistoriadores/:id/agenda:bulk-block`                                                       | Body `{ from, to, motivo? }`. Bloqueia em transação Prisma todos os slots `disponivel=true` no intervalo do tenant. |
| `POST /api/v1/vistoriadores/:id/agenda:bulk-update`                                                      | Body `{ ids: uuid[], disponivel?, motivo? }`. Aplica patch em transação. Máx 200 IDs.                               |
| `DELETE /api/v1/vistoriadores/:id/agenda:bulk-delete`                                                    | Body `{ ids: uuid[] }`. Remove em transação. Máx 200 IDs.                                                           |
| Guard RBAC: VISTORIADOR autorizado quando `vistoriadorId == user.userId`                                 | Mantém ADMIN/GESTOR irrestrito. Negative test (`vistoriador ≠ me`) retorna 403.                                     |
| Audit log para os 3 bulk endpoints (`AGENDA.BULK_BLOCKED`, `AGENDA.BULK_UPDATED`, `AGENDA.BULK_DELETED`) | Cada execução grava 1 audit_log com `affectedCount`.                                                                |
| Resposta dos bulk endpoints inclui `{ affectedCount, ids: uuid[] }`                                      | FE usa para confirmar progresso.                                                                                    |
| `@vistoria/api-contracts`: schemas Zod novos + barrel update                                             | Sem breaking change (apenas adição).                                                                                |
| Unit tests cobrindo: tenant isolation, RBAC vistoriador, contagem de afetados, transação atômica         | Cobertura BE não cai abaixo do baseline atual.                                                                      |

#### Agenda — Integração (IN nesta sprint)

Nada a fazer no IN. Bulk endpoints são internos da agenda e não disparam
eventos de SAGA. Anotar no HANDOFF IN do ciclo.

#### Observabilidade — BE (Sprint 27)

| Critério                                                                                       | Aceite                                                                                               |
| ---------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| Endpoint `GET /metrics` na porta da API                                                        | Formato Prometheus text. Exposto sem auth (rede interna; revisão de exposição vira ADR no DOC).      |
| Métricas mínimas: `http_requests_total`, `http_request_duration_seconds`, `nodejs_*` (default) | Labels `method`, `route`, `status_code`. Usar `@willsoto/nestjs-prometheus` ou `prom-client` direto. |
| Health check `/health` segue verde após adição                                                 | Sem regressão no QI.                                                                                 |

## Para outros agentes

### BE (Sprint 27)

Implementar todos os critérios da seção "Agenda — Backend" e
"Observabilidade — BE" acima. Pontos de atenção:

- Endpoints `:bulk-*` devem ser **atómicos** (Prisma `$transaction`). Se 1
  slot falhar, rollback total. Resposta `409` ou `422` com mensagem
  descritiva.
- Para `:bulk-block` o filtro é por janela temporal **completa do slot**
  (slot inteiramente dentro de `[from, to]`). Slot que cruza o limite
  fica de fora e o BE devolve uma lista `excluded: [{ id, reason }]`.
- RBAC: a regra "VISTORIADOR pode ver/editar a própria agenda" precisa
  refletir no `@nestjs/swagger` (descrição do endpoint).
- `/metrics`: usar `prom-client` direto se preferir manter deps mínimas.

Contratos esperados (Zod):

```ts
// bulk-block
const BulkBlockRequest = z.object({
  from: z.string().datetime(),
  to: z.string().datetime(),
  motivo: z.string().max(500).optional(),
});
const BulkOpResponse = z.object({
  affectedCount: z.number().int().nonnegative(),
  ids: z.array(z.string().uuid()),
  excluded: z
    .array(z.object({ id: z.string().uuid(), reason: z.string() }))
    .optional(),
});

// bulk-update
const BulkUpdateRequest = z.object({
  ids: z.array(z.string().uuid()).min(1).max(200),
  disponivel: z.boolean().optional(),
  motivo: z.string().max(500).nullable().optional(),
});

// bulk-delete
const BulkDeleteRequest = z.object({
  ids: z.array(z.string().uuid()).min(1).max(200),
});
```

### IN (Sprint 28)

Nada novo da agenda. Manter pedidos abertos do S25 (dedup-by-eventId,
port BE→IN para `consultar()` do `InternoProvider`).

### FE (Sprint 29)

Atender critérios de "Agenda — UI" acima. Quando o BE entregar os
`:bulk-*`, substituir o N-requests por 1 chamada. Quando o RBAC do
vistoriador chegar, criar rota `/agenda` para o role VISTORIADOR (sem
dropdown). Reaproveitar o spec `agenda-calendar-ui.spec.ts` que já está
escrito — destravar os `fixme` à medida que entrega.

### DOC (Sprint 30)

- ADR sobre exposição do `/metrics` (auth vs network policy).
- Atualizar `c4-container.md` com Prometheus.
- Atualizar README raiz com endpoints novos da agenda + observabilidade.
- Validar handoffs do ciclo 6.

## Validação executada

| Comando                       | Resultado                                                                                              |
| ----------------------------- | ------------------------------------------------------------------------------------------------------ |
| `pnpm playwright test --list` | ✅ 36 testes em 10 arquivos (era 30 — +6: 2 `users-cobertura-ui` + 4 `agenda-calendar-ui` em `fixme`). |
| `pnpm typecheck`              | ✅ sem mudança de TS de runtime, apenas specs Playwright.                                              |
| `pnpm test:e2e`               | ⚠️ não executado local (Docker fora). CI valida no push.                                               |
| `docker compose config`       | ✅ Prometheus service válido.                                                                          |

## Known Issues

Cumulativos:

1. BE ainda não publica `vistoria.routed` — agent-sync S13 segue.
2. Refresh em `localStorage`.
3. DLX declarado, sem alarme em DLQ size > 0 (Prometheus em pé permite atacar isso na Sprint 27+).
4. Sem dedup-by-eventId.
5. Slot da agenda não detecta sobreposição.
6. Sem testes unitários de Users/Agenda/Cobertura no FE.
7. Senha em texto plano em `POST /users`.
8. `event-flow.md` desatualizado.
9. Lint warning em `button.tsx`.
10. Cidade/bairro como strings livres no BE.
11. IBGE pode estar fora do ar — FE faz fallback parcial.
12. Lista de coberturas no FE não tem confirm para deletar.

Novas:

13. **`/metrics` ainda não existe** — Prometheus marca target como DOWN
    até BE entregar (planejado Sprint 27).
14. **Bulk endpoints da agenda ainda não existem** — FE Sprint 29 vai
    usar N-requests temporariamente se chegar antes do BE (espera-se BE
    primeiro pela ordem do ciclo).

## Próximo Sprint

**Sprint 27 — BE**: 3 bulk endpoints + RBAC vistoriador + `/metrics` +
contracts + audit + unit tests.
