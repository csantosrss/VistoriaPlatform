---
agent: BE
sprint: "12"
date: 2026-05-20
---

# Handoff — Sprint 12 (BE) → Sprint 13 (IN)

## Resumo

BE fechou os 4 itens pendentes herdados do handoff `SPRINT-11-QI`:

1. `ProviderRoutingService.decide(...)` é chamado **na criação** de Vistoria — vistoria nasce já em `ROTEADA` com `providerId` e `motivo` (reason da decisão) persistidos na primeira transição.
2. Handler RMQ `vistoria.status.changed` consome o evento que o IN publica desde a Sprint 08, aplica a transição na SAGA com **idempotência** (compara `status` atual vs `newStatus`) e bloqueia transições partindo de estado terminal.
3. `GET /api/v1/vistorias/:id/transicoes` — timeline ordenada por `createdAt` ASC.
4. `POST /api/v1/auth/refresh` — refresh token JWT stateless com claim `type: "access" | "refresh"`. Decisão em [ADR-014](../decisions/ADR-014-refresh-token-stateless.md).
5. `GET /api/v1/vistorias/stats` — agregado `{ total, byStatus }` via `groupBy(status)`. Substitui as 3 chamadas paralelas que o dashboard fazia.

Próximo agente é o **IN** (Sprint 13).

## Entregas

### 1. Routing na criação (`VistoriasService.create`)

[`apps/api/src/vistorias/vistorias.service.ts`](../../apps/api/src/vistorias/vistorias.service.ts):

- Antes de abrir a transação, chama `routing.decide({ tenantId, tipo, enderecoUf, enderecoCidade })` para obter `{ providerId, reason }`.
- Dentro da `$transaction`:
  - Cria vistoria **direto em `ROTEADA`** com `providerId` preenchido.
  - `vistoriaTransicao.createMany` insere **duas** linhas: `null → SOLICITADA` (executadoPor=actor) e `SOLICITADA → ROTEADA` com `motivo = reason` (executadoPor=actor).
  - `auditLog.createMany` insere `VISTORIA.CREATED` + `VISTORIA.ROUTED` (a segunda com `after = { providerId, reason }`).
- Sem chamada ao parceiro: a Sprint 12 só **decide** + persiste; o `agendar()` real continua pendente (próximo IN — ver "Para outros agentes").

`ProviderRoutingService` foi registrado como provider **local** em `VistoriasModule` (não é uma dependência de construtor — instância paralela à do `IntegrationsModule`). Decisão pragmática para evitar tornar o `IntegrationsModule.forRoot()` global; ver "Decisões táticas".

### 2. Handler RMQ `vistoria.status.changed`

[`apps/api/src/vistorias/handlers/vistoria-status-changed.handler.ts`](../../apps/api/src/vistorias/handlers/vistoria-status-changed.handler.ts):

- `@OnModuleInit` → `subscriber.subscribe('vistoria.status.changed', handle)`.
- Valida o payload com `VistoriaStatusChangedEventSchema` (novo, no `@vistoria/api-contracts`). Payload inválido → log + ack (descartado).
- Em `$transaction`:
  - Busca vistoria por `id` + `tenantId`. Não encontrada → warn + ack.
  - **Idempotência**: se `current.status === event.newStatus`, log e ack.
  - **Guard terminal**: se `current.status ∈ {CONCLUIDA, CANCELADA}`, warn e ack.
  - Caso contrário: `update` (com `concluidoEm`/`canceladoEm`/`canceladoMotivo` se aplicável), `vistoriaTransicao.create` (`motivo = event.motivo ?? \`source=${event.source}\``, `correlationId`), `auditLog.create` (`action = VISTORIA.STATUS_CHANGED`, `userId = null`, `correlationId`).

O subscriber é um serviço **local** do `apps/api` em [`apps/api/src/infrastructure/messaging/rmq-subscriber.service.ts`](../../apps/api/src/infrastructure/messaging/rmq-subscriber.service.ts), espelhando o do `@vistoria/integrations` mas com fila própria `apps-api.events` (binding `vistoria.#` no exchange `vistoria.events`). Isso preserva a fronteira IN↔BE — IN publica, BE consome, sem cross-import de módulos NestJS dinâmicos.

### 3. `GET /vistorias/:id/transicoes`

[`apps/api/src/vistorias/vistorias.controller.ts`](../../apps/api/src/vistorias/vistorias.controller.ts):

- `service.listTransicoes(actor, vistoriaId)` valida que a vistoria existe no tenant (`findFirst` com `select: { id }`) e devolve transições ordenadas `createdAt ASC`.
- Contrato em `@vistoria/api-contracts` (`ListVistoriaTransicoesResponseSchema`).

### 4. `POST /auth/refresh` + refresh no login

[`apps/api/src/auth/auth.service.ts`](../../apps/api/src/auth/auth.service.ts):

- Novo `issueTokens()` privado emite **ambos** os tokens em paralelo (`Promise.all`) com claim `type: "access" | "refresh"`.
- `login()` agora devolve `{ access, expiresIn, refresh, refreshExpiresIn, user }`.
- `refresh(input)` verifica o JWT (`verifyAsync`), rejeita tokens com `type !== "refresh"`, faz lookup do usuário/tenant ativo na DB e devolve **par novo** (rotação completa).
- Decisão completa: [ADR-014](../decisions/ADR-014-refresh-token-stateless.md). Sem persistência, sem revogação — endereçado em ADR futuro junto com cookie httpOnly.

Env nova:

- `JWT_REFRESH_EXPIRES_IN` (default `7d`) em [`apps/api/src/config/env.schema.ts`](../../apps/api/src/config/env.schema.ts) e [`apps/api/.env.example`](../../apps/api/.env.example).

### 5. `GET /vistorias/stats`

`service.stats(actor)`:

- `prisma.vistoria.groupBy({ by: ['status'], where: { tenantId }, _count: { _all: true } })`.
- Pre-inicializa o `byStatus` com **todos os 9 status em 0** (`Object.values(StatusVistoria).reduce`) para o FE não precisar fazer defensive coding.
- Contrato `VistoriaStatsResponseSchema` em `@vistoria/api-contracts/vistoria/stats`.

Rota registrada **antes** de `/:id` no controller — ordem importa no NestJS para evitar que `stats` seja parseado como UUID.

### 6. Contratos compartilhados

Adições em `@vistoria/api-contracts`:

- `vistoria/transicao.ts` — `VistoriaTransicaoSchema`, `ListVistoriaTransicoesResponseSchema`.
- `vistoria/stats.ts` — `VistoriaStatsResponseSchema`.
- `vistoria/events.ts` — `VistoriaStatusChangedEventSchema` (espelha o shape do `VistoriaStatusUpdate` que IN já publica).
- `auth/refresh.ts` — `RefreshRequestSchema`, `RefreshResponseSchema`.
- `auth/login.ts` — `LoginResponseSchema` agora exige `refresh` e `refreshExpiresIn` (breaking minor — ver "Breaking changes").

### 7. Testes

- **Unit (jest, apps/api)**: 30 testes, todos verdes.
  - `vistorias.service.spec.ts` ampliado: routing na criação (com SP e SAIDA), `stats` (byStatus preenchido com zeros), `listTransicoes` (200 e 404), `cancel` (mantido).
  - `auth.service.spec.ts` ampliado: shape novo do login (`access`, `refresh`, `refreshExpiresIn`), 4 testes de `refresh` (sucesso, type errado, expirado, usuário inativo).
  - `vistoria-status-changed.handler.spec.ts` novo: transição válida, idempotência, terminal bloqueado, payload inválido, registro em `onModuleInit`.
- **E2E (Playwright, `e2e/`)**: spec `auth-and-vistorias.spec.ts` atualizada:
  - Após `create`, `status === "ROTEADA"` + `providerId` truthy (era `SOLICITADA`).
  - `actions` no audit agora inclui também `VISTORIA.ROUTED`.
  - 5 testes novos: refresh feliz (renova + acessa `/me`), refresh inválido (401), refresh com access token (401), `/vistorias/stats` (shape `total` + `byStatus`), `/vistorias/:id/transicoes` (duas transições mínimas com `motivo` na ROTEADA).
- Total Playwright: passa de 15 para **20** testes (4 admin-ui + 5 webhooks + 1 health + 10 auth-and-vistorias).
- `e2e/admin-ui.spec.ts`: assertion `"Solicitada"` → `"Roteada"` (consequência do routing inline).

## Mudanças que tocam o usuário

- **`apps/api/.env.example`** ganhou `JWT_REFRESH_EXPIRES_IN=7d`. Quem já tem `.env` local **precisa adicionar manualmente** (sem isso o login continua funcionando — o schema tem default — mas o valor injetado fica menos explícito).
- Vistoria criada via API **já chega no FE como `ROTEADA`**, não mais `SOLICITADA`. Isso afeta:
  - O dashboard da Sprint 09 (KPI "Solicitadas" vai contar 0 — fica claro só quando o backlog ficar 100% roteado; o FE Sprint 14 deve adicionar o KPI "Roteadas").
  - O fluxo de detalhe pós-criação no painel admin (badge mostra "Roteada").
- `LoginResponse` agora tem dois campos a mais (`refresh`, `refreshExpiresIn`). Como o FE faz `LoginResponseSchema.parse(data)` em `apps/web/src/features/auth/services/auth.service.ts`, **ele rejeitaria** uma resposta sem esses campos. Mas como BE e contracts são alterados juntos, o pipeline é coerente. O FE da Sprint 09 só lê `.access` e `.user`, então a presença dos novos campos não quebra nada agora — o consumo real virá na Sprint 14.

## Validação executada

| Comando                                       | Resultado                                                            |
| --------------------------------------------- | -------------------------------------------------------------------- |
| `pnpm typecheck`                              | ✅ 6 workspaces, 0 erros                                             |
| `pnpm --filter @vistoria/api test`            | ✅ 5 suites, 30 testes (era 12)                                      |
| `pnpm --filter @vistoria/web test`            | ✅ 4 suites, 15 testes (sem regressão)                               |
| `pnpm --filter @vistoria/api lint`            | ✅ 0 warnings                                                        |
| `pnpm --filter @vistoria/api-contracts build` | ✅ dist atualizado                                                   |
| `pnpm test:e2e` (local)                       | ⚠️ Não executado nesta máquina (Docker não estava de pé). CI valida. |

## Para Outros Agentes

### IN (Sprint 13)

Sem pendência direta de BE para IN. Sugestões que IN pode atacar:

1. **Idempotência no writer** — IN publica o evento `vistoria.status.changed` mas não dedup. BE agora tem idempotência no consumer (compara `status` final), mas isso só protege contra duplicatas que resultam no mesmo status. Se IN publicar a mesma transição (`AGENDADA → EM_EXECUCAO` duas vezes), na segunda o consumer já está em `EM_EXECUCAO` e descarta — funciona como dedup _de facto_. Vale revisar se o cenário "reabertura legítima" muda esse comportamento; se sim, mover dedup para `eventId` no writer (ou no consumer com Redis SETEX). **Em aberto**.
2. **`agendar()` real** — quando o vistoria está `ROTEADA`, BE não chama o adapter do provider. Isso é responsabilidade do IN (que pode disparar `agendar()` ouvindo um evento `VISTORIA.ROUTED` que **ainda não publicamos**) ou do BE (publicar o evento aqui em vez de só audit). Ficou em aberto desde a Sprint 08. Se IN preferir o caminho async, BE Sprint 16 publica o evento; alinhe via `agent-sync`.
3. **Adapter `interno`** — fluxo síncrono (equipe da Auxiliadora). Se quiser ser realista, IN pode implementar um placeholder que apenas grava log "vistoria atribuída a operador" sem chamar HTTP externo.

### FE (Sprint 14)

Tudo abaixo já tem endpoint pronto para consumir:

1. **Refresh transparente** — adicionar interceptor no `apiClient` (axios) que, ao receber 401, lê `localStorage.getItem('auth.refresh')` e chama `POST /auth/refresh`. `persistSession` precisa passar a guardar o refresh também. Ao receber 401 do refresh, limpar sessão e ir para `/login`.
2. **Timeline da SAGA** — `GET /vistorias/:id/transicoes` devolve `{ data: VistoriaTransicao[] }`. Renderizar como linha do tempo na página de detalhe da vistoria.
3. **Dashboard via `/stats`** — substituir as 3 chamadas paralelas (`?status=SOLICITADA|EM_EXECUCAO|CONCLUIDA`) por **uma** chamada `GET /vistorias/stats`. Adicionar KPI "Roteadas" (e quaisquer outros relevantes — agora todos os 9 status vêm preenchidos).
4. **Cookie httpOnly** — fora do escopo até ter ADR. ADR-014 deixa registrado o trade-off; ADR futuro vai resolver junto com persistência server-side do refresh.
5. **Recharts** — herdada da Sprint 09. Quando o `/stats` virar parte do dashboard, dá para usar como dataset inicial.

### DOC (Sprint 15)

- Consolidar changelogs **SPRINT-11..14** (QI11, BE12, IN13, FE14).
- Atualizar `docs/architecture/c4-container.md` — remover o "(planejado)" da seta `RabbitMQ → apps/api` (agora há um consumer real).
- Considerar diagrama Mermaid da SAGA com as transições típicas (`SOLICITADA → ROTEADA → AGENDADA → CONFIRMADA → EM_EXECUCAO → LAUDO_PENDENTE → LAUDO_APROVADO → CONCLUIDA` e CANCELADA como saída transversal).
- ADR-014 já criada por BE12 — só validar.

## Breaking changes

- **API**: `POST /auth/login` agora retorna 2 campos a mais (`refresh`, `refreshExpiresIn`). FE atual ignora — só efeito após Sprint 14.
- **API**: `POST /vistorias` agora retorna `status: "ROTEADA"` + `providerId` preenchido (era `"SOLICITADA"` + `null`). Quebra qualquer cliente que dependa de `status === "SOLICITADA"` imediatamente após criar — E2E foi atualizado, painel admin se ajusta automaticamente (badge), mas vale aviso para integrações Salesforce futuras (IN).
- **Contracts**: `LoginResponseSchema` ganhou dois campos `z.string().min(20)` obrigatórios. **Versão minor** segundo a convenção de `packages/api-contracts/CLAUDE.md`, mas semanticamente é breaking — FE strict-parser quebraria se ficar dessincronizado.
- **DB**: nenhuma migration nesta sprint (nenhum schema novo).

## Decisões táticas

- **`ProviderRoutingService` registrado como provider local de `VistoriasModule`** em vez de globalizar `IntegrationsModule.forRoot()`. Motivo: a classe não tem deps de construtor (só `Logger`), e instância paralela é trivial e barata; evita mexer em código do IN sem motivo arquitetural. Se no futuro a routing virar stateful (cache de regras por tenant, por exemplo), conversamos.
- **Subscriber próprio em `apps/api`** (fila `apps-api.events`) em vez de reusar o `RmqSubscriber` do `@vistoria/integrations`. Motivo: o subscriber do IN existe para consumir eventos do próprio domínio do IN; o BE consumir o mesmo serviço criaria acoplamento bidirecional. Filas separadas com bindings sobrepostos é o padrão recomendado para RabbitMQ.
- **Audit `VISTORIA.STATUS_CHANGED` com `userId = null`** conforme handoff QI11 — eventos do broker não têm ator humano. Adicionado `_source` e `_motivo` no campo `after` para auditoria forense.
- **`createMany` em transições/audit logs do `create`** em vez de dois `create` separados. Reduz roundtrips e mantém atomicidade.

## Known Issues

Herdadas (mantêm-se abertas):

1. **`nest start --watch` ocasionalmente "Found 0 errors" sem subir o Node** — herdada BE07/QI11. CI mitigado; dev local ainda precisa de workaround quando ocorrer.
2. **Sem `RABBITMQ_URL` o `RmqSubscriber` é no-op** — paralelo ao writer do IN. Vale documentar quando o handler do BE falha silenciosamente em dev sem broker.
3. **DLX `vistoria.events.dlx` em produção** — pendente Sprint 03.

Novas (introduzidas nesta sprint):

4. **Refresh stateless sem revogação** — ver ADR-014. Não é bug; é trade-off documentado. Próximo passo: ADR de persistência + cookie httpOnly.
5. **Vistorias antigas no banco com `status = "SOLICITADA"`** ficam em backlog. Sem migration: quem foi criada antes do BE12 não é roteada retroativamente. Se isso virar dor, vale um job one-off de re-routing — fica em aberto.
6. **Reentrada na SAGA bloqueada por estado terminal** — handler bloqueia transições saindo de `CONCLUIDA`/`CANCELADA`. Se o produto quiser reabrir vistorias canceladas, mexer no guard (também impacta o `cancel`).

## Próximo Sprint

**Sprint 13 — IN**: avaliar idempotência no writer + adapter `interno` + opcional `agendar()` real disparado por `VISTORIA.ROUTED`.

Decisões abertas que IN precisa fechar:

- Se vai publicar `VISTORIA.ROUTED` ou esperar o BE expor um evento explícito.
- Se idempotência permanece no consumer (BE) ou migra para o writer (IN).
