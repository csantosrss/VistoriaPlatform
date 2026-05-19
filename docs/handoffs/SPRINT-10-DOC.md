---
agent: DOC
sprint: "10"
date: 2026-05-19
---

# Handoff — Sprint 10 (DOC) → Sprint 11 (QI)

## Resumo

DOC fechou o segundo ciclo do projeto (`QI06 → BE07 → IN08 → FE09 → DOC10`): preencheu o gap de changelog do Sprint 08 (que ficou em aberto quando FE saiu em seguida sem passar por DOC), consolidou o Sprint 09, atualizou o `c4-container.md` com as setas que saíram do estado planejado (FE→BE real + IN→RMQ via `vistoria.status.changed`), e refrescou o `README.md` raiz para refletir o painel admin funcional e os endpoints REST vivos. Zero alteração de código de negócio.

O próximo agente é o **QI**, reiniciando o loop com validação E2E ampliada do que BE+IN+FE entregaram no segundo ciclo.

## Entregas

- [`docs/changelog/SPRINT-08.md`](../changelog/SPRINT-08.md) — gap preenchido (IN entregou no Sprint 08 e o ciclo seguiu direto pro FE Sprint 09).
- [`docs/changelog/SPRINT-09.md`](../changelog/SPRINT-09.md) — consolidação do FE Sprint 09.
- [`docs/changelog/SPRINT-10.md`](../changelog/SPRINT-10.md) — changelog desta sprint.
- [`docs/changelog/README.md`](../changelog/README.md) — índice ganhou linhas SPRINT-08, SPRINT-09, SPRINT-10.
- [`docs/architecture/c4-container.md`](../architecture/c4-container.md) — setas atualizadas (FE→BE real, IN→RMQ `vistoria.status.changed`, RMQ→BE tracejada como "planejado"); nova tabela "Fluxos atuais entre containers" com o sprint de entrada e ADR de cada fluxo.
- [`README.md`](../../README.md) — bootstrap simplificado (não pede `cp` manual), credenciais de dev explícitas, seção "Painel admin (apps/web)" com 7 telas funcionais, seção "Endpoints REST (apps/api)" com 10 rotas vivas.
- 4 handoffs do segundo ciclo (`SPRINT-06-QI`, `SPRINT-07-BE`, `SPRINT-08-IN`, `SPRINT-09-FE`) validados — sem contradição ou pendência órfã.

## O que o QI precisa saber antes de começar (Sprint 11)

### Pendências top do segundo ciclo

A consolidação evidenciou um fluxo half-built que o BE precisa fechar — mas só rola após o QI confirmar que o caminho atual (FE → BE → DB) está sólido E2E:

1. **IN publica `vistoria.status.changed` desde o Sprint 08, mas BE ainda não consome.** Audit `VISTORIA.STATUS_CHANGED` fica vazio na tela `/audit` enquanto o handler não existir. Não é bug do FE nem do IN; é trabalho remanescente do BE Sprint 12. QI deve cobrir no E2E que (a) o webhook responde 204 com HMAC válido e (b) registrar o estado "evento entra na fila mas Vistoria não muda" como esperado nesta janela.
2. **`agendar()` real ainda não dispara** — caminho de saída para o parceiro depende do BE consumir o evento ou expor a chamada via DI. Mesmo bloqueio.

### Frentes diretas para QI

1. **Playwright E2E do painel admin (Sprint 09)** — adicionar specs em `apps/web/e2e/` ou na raiz:
   - Login com seed (`admin@auxiliadorapredial.com.br` / `admin123`) → dashboard carrega KPIs.
   - Criar vistoria → redirect ao detalhe → cancelar → status `CANCELADA` aparece.
   - 401 em rota protegida (limpar `localStorage.auth.access` manualmente) → redirect para `/login?next=...`.
   - `/audit` lista pelo menos os eventos `VISTORIA.CREATED` e `VISTORIA.CANCELED` gerados pelo seed/teste.
2. **Endurecer E2E do webhook (Sprint 08)** — o teste atual prova apenas que o endpoint é `@Public()`. Falta cobrir:
   - Webhook com HMAC válido → 204 + evento publicado em `vistoria.events`.
   - Webhook sem `externalId` → 204 + warn (drop silencioso).
   - Webhook com HMAC inválido → 403 (já coberto).
3. **`nest start --watch` flaky** — herdado do BE Sprint 07: "Found 0 errors" sem subir o Node. Workaround atual: `pnpm build && pnpm --filter @vistoria/api start`. Investigar num PR isolado.
4. **CI**:
   - Confirmar que `pnpm --filter @vistoria/web build` continua no pipeline (já entrou no Sprint 06).
   - Considerar cache de `~/.cache/ms-playwright` se o e2e job estiver lento.
   - Provisionar `VITE_API_BASE_URL` no deploy estático quando hosting for definido.
5. **DLX `vistoria.events.dlx` em produção** — pendente desde o Sprint 03; segue.

### Boundary

QI continua restrito a `infra/`, `scripts/`, `.github/workflows/`, `e2e/`, `playwright.config.ts`. Lógica de negócio, schemas, componentes React e adapters de parceiro são de BE/IN/FE.

## Pendente Para Outros Agentes

### BE (Sprint 12)

1. Handler `vistoria.status.changed` no `RmqSubscriber` (idempotência + `VistoriasService.aplicarTransicao` + `AuditLog`).
2. Aplicar `ProviderRoutingService.decide(...)` em `VistoriasService.create()` — hoje `Vistoria.providerId` fica `null`.
3. Disparar `agendar(...)` do provider escolhido quando Vistoria transita para `ROTEADA` (via handler ou DI direta — `IntegrationsModule` já exporta).
4. Endpoint `GET /api/v1/vistorias/:id/transicoes` para o detalhe renderizar timeline da SAGA.
5. Refresh token (`POST /api/v1/auth/refresh`).
6. Migração `localStorage` → cookie httpOnly + CSRF (decisão pendente de ADR).
7. Endpoint agregado `GET /api/v1/vistorias/stats` para o dashboard substituir 3 chamadas paralelas.

### IN (Sprint 13)

- Sem pendência direta — quando BE consumir o evento, IN só revisa se quer adicionar idempotência no writer ou um `agendar()` reativo (consumir `vistoria.roteada` publicado pelo BE).
- ADR sobre `ProviderRouting` configurável em DB (vs hard-coded) quando o business pedir.

### FE (Sprint 14)

- Timeline da SAGA em `/vistorias/:id` quando BE entregar `/transicoes`.
- Refresh transparente no `api-client.ts` quando BE entregar `/auth/refresh`.
- Trocar `localStorage` por cookie quando BE expuser.
- Recharts no dashboard (gráfico de vistorias por status/dia) — pendência herdada do Sprint 04.

### DOC (Sprint 15)

- ADR sobre cookie httpOnly vs localStorage assim que BE bater o martelo.
- ADR sobre `ProviderRouting` configurável quando IN decidir.
- ADR sobre refresh-token strategy quando BE definir.
- ERD pode crescer com `Imovel`, `Comodo`, `LaudoItem`, `ProviderRouting` se BE entregar.
- Novo C4 se topologia mudar (ex.: introdução de Salesforce real).

## Known Issues registrados (DOC não corrige)

1. **`/audit` filtrado por `VISTORIA.STATUS_CHANGED` fica vazio** — IN publica, BE ainda não consome. Item BE Sprint 12.
2. **`agendar()` real ainda não roda** — caminho de saída pendente do BE.
3. **Sem timeline da SAGA em `/vistorias/:id`** — endpoint de transições ausente.
4. **Token JWT expira em 15min sem refresh** — FE redireciona em 401 com `?next=`.
5. **`localStorage` para token** — segue como placeholder herdado do Sprint 04.
6. **`nest start --watch` ocasionalmente "Found 0 errors" sem subir o Node** — workaround documentado.
7. **Lint warning estético em `apps/web/src/components/ui/button.tsx`** — `buttonVariants` exportado com o componente (padrão Shadcn). Cosmético.

## Decisões Que Viram ADR

Nenhuma nesta sprint. DOC apenas documenta o que outros agentes decidiram. ADR-013 (IN Sprint 08) já cobre o caminho RMQ.

Candidatos a ADR (não decididos ainda — DOC só registra a existência):

- localStorage vs cookie httpOnly (BE Sprint 12 decide).
- `ProviderRouting` configurável vs hard-coded (IN, quando business pedir).
- Refresh-token strategy (BE Sprint 12 decide).

## Próximo Sprint

**Sprint 11 — QI**: Playwright E2E ampliado para painel admin (Sprint 09) e webhook caminho feliz (Sprint 08); investigação do `nest start --watch` flaky.
