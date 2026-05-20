---
agent: QI
sprint: "11"
date: 2026-05-19
---

# Handoff — Sprint 11 (QI) → Sprint 12 (BE)

## Resumo

QI ampliou a cobertura E2E do projeto: o painel admin (Sprint 09) agora é validado ponta-a-ponta pelo navegador (login → criar/cancelar vistoria → audit), o caminho feliz dos webhooks (Sprint 08) tem três cenários novos (HMAC válido com `externalId`, sem `externalId` para drop silencioso, e a contraparte da Conceitual), e o `nest start --watch` flaky herdado do BE07 deixa de afetar CI ao trocar o `webServer` do Playwright por `build + node dist/main.js`. Total de testes E2E saiu de 8 para 15. Próximo agente é o **BE**.

## Entregas

### Playwright: webServer múltiplo + execução determinística no CI

[`playwright.config.ts`](../../playwright.config.ts):

- `webServer` agora é um **array** com dois entries (`apps/api` + `apps/web`) — antes só subia o api.
- Em CI o api roda como `pnpm --filter @vistoria/api build && pnpm --filter @vistoria/api start` (`node dist/main.js`). Isso elimina a flakiness do `nest start --watch` no pipeline. Em dev local seguimos com `pnpm --filter @vistoria/api dev` por DX, com `reuseExistingServer: true` para casar com `pnpm dev:all` já em pé.
- `apps/web` sobe via `pnpm --filter @vistoria/web dev` em ambos os modos (proxy do Vite já cobre `/api` e `/health` apontando para o api). Para CI usamos `dev` em vez de `preview` porque `preview` não tem proxy e exigiria rebuild com `VITE_API_BASE_URL` absoluto.
- `fullyParallel: false` + `workers: 1` — testes compartilham estado (audit log acumula, seed único). Sequencial dá resultados determinísticos.

### Specs E2E novas

- [`e2e/admin-ui.spec.ts`](../../e2e/admin-ui.spec.ts) — 4 cenários browser-based:
  1. Login pela UI carrega dashboard com KPIs (`Solicitadas`, `Em execução`, `Concluídas`).
  2. Criar vistoria → detalhe → cancelar → badge muda para `Cancelada` + mensagem de sucesso.
  3. Rota protegida sem token redireciona para `/login` (testa `RequireAuth`).
  4. `/audit` lista pelo menos um evento `VISTORIA.*` (depende de o teste #2 ter rodado antes — Playwright sequencial garante).
- [`e2e/webhooks.spec.ts`](../../e2e/webhooks.spec.ts) — 3 cenários novos somando aos 2 existentes:
  1. Rede Vistorias com HMAC válido + `externalId` → **204**.
  2. Rede Vistorias com HMAC válido sem `externalId` → **204** (drop silencioso, conforme handoff IN08).
  3. Conceitual com HMAC válido + `idExterno` → **204**.

A assinatura HMAC dos testes usa secrets determinísticos definidos em [`apps/api/.env.example`](../../apps/api/.env.example) — `REDE_VISTORIAS_WEBHOOK_SECRET` e `CONCEITUAL_WEBHOOK_SECRET` saíram de vazios para `dev-{provider}-webhook-secret-do-not-use-in-prod`.

### Seed no CI

[`.github/workflows/ci.yml`](../../.github/workflows/ci.yml):

- Job `e2e` agora roda `pnpm --filter @vistoria/api prisma:seed` após `dev:migrate`. Sem isso o admin de dev não existe e a spec de auth quebra. O seed é idempotente.

### Cache do Chromium no CI

Job `e2e`:

- Step novo `Cache do Chromium do Playwright` indexado por hash do `pnpm-lock.yaml`.
- Quando há cache hit, roda apenas `playwright install-deps chromium` (libs de runtime do Ubuntu — não cacheáveis). Quando há miss, roda o `playwright install --with-deps chromium` completo (script `pnpm test:e2e:install`).
- Reduz o overhead recorrente de ~150MB de download a praticamente zero quando não há mudança de dependência.

## Mudanças que tocam o usuário

- `apps/api/.env.example` ganhou 2 valores default para os webhook secrets. Quem já tem `apps/api/.env` local **deve copiar manualmente** as duas linhas (ou apagar o `.env` e deixar o `env:setup` recriar) para que os 3 testes novos de webhook passem localmente.

## Validação executada

| Comando                       | Resultado                                                            |
| ----------------------------- | -------------------------------------------------------------------- |
| `pnpm typecheck`              | ✅ 6 workspaces, 0 erros                                             |
| `pnpm playwright test --list` | ✅ 15 testes em 4 arquivos (era 8 em 3)                              |
| `pnpm test:e2e` (local)       | ⚠️ Não executado — Docker não estava de pé na máquina QI. CI valida. |

## O Que o BE Precisa Saber Antes de Começar (Sprint 12)

### Handler `vistoria.status.changed` (top priority)

IN publica desde Sprint 08, BE ainda não consome. Sem isso o E2E de webhook prova apenas que o controller responde 204 — não confirma a transição de Vistoria. Quando o handler existir, o teste `webhooks.spec.ts › HMAC válido + externalId presente → 204` pode ser ampliado para também consultar `GET /api/v1/audit-logs?action=VISTORIA.STATUS_CHANGED&resourceId=<vistoriaId>` e validar a transição.

Sugestões de implementação:

- Registrar o handler em `apps/api/src/messaging/rmq-subscriber.module.ts` (subscriber já existe desde Sprint 03).
- Idempotência: comparar `vistoria.status === input.newStatus` antes de aplicar — IN entrega webhooks duplicados sem fazer dedup.
- Persistir o `reason` do `ProviderRoutingService.decide(...)` em `VistoriaTransicao.motivo` na primeira transição para `ROTEADA` (pedido pelo IN).
- Audit log com `action = "VISTORIA.STATUS_CHANGED"`, `userId = null`, `correlationId` do header AMQP.

### Outros pendentes herdados

1. **`agendar()` real ainda não dispara** — caminho de saída para o parceiro.
2. **`GET /api/v1/vistorias/:id/transicoes`** — timeline da SAGA pedida pelo FE.
3. **Refresh token** — `POST /api/v1/auth/refresh`.
4. **Migração para cookie httpOnly** — decisão pendente de ADR.
5. **`GET /api/v1/vistorias/stats`** — endpoint agregado para o dashboard parar de fazer 3 chamadas paralelas.

### Quando criar endpoint novo

Adicionar spec em `e2e/<dominio>.spec.ts`. Status code esperado + shape do payload é o mínimo. Para fluxos interessantes (SAGA, RMQ), usar o pattern de `auth-and-vistorias.spec.ts` (login → create → assert → cleanup-via-cancel se necessário).

## Pendente Para Outros Agentes

### IN (Sprint 13)

- Sem pendência direta. Quando BE consumir o evento e validar idempotência ponta-a-ponta, IN avalia se quer adicionar idempotência no writer também.

### FE (Sprint 14)

- Pendências herdadas do Sprint 09 (timeline, refresh transparente, cookie, recharts). Sem nada novo desta sprint.

### DOC (Sprint 15)

- Consolidar changelog SPRINT-11..14 + ADRs novas que BE/IN produzirem.
- Quando o handler do RMQ entrar (BE Sprint 12), atualizar `c4-container.md` removendo o "(planejado)" da seta `RabbitMQ → apps/api`.

## Known Issues

### Documentadas (DOC só registra)

1. **`nest start --watch` ocasionalmente "Found 0 errors" sem subir o Node** — herdada do BE07. **Status nesta sprint**: contida no CI (Playwright agora usa `build + node dist/main.js`), permanece em dev local com workaround `pnpm --filter @vistoria/api build && pnpm --filter @vistoria/api start` quando atacar. Root cause não investigado a fundo — recomendado quando virar dor recorrente; até lá o workaround vale.
2. **Sem `RABBITMQ_URL` o `RmqVistoriaStatusWriter` é no-op** (warn) — herdada do IN08. O E2E de webhook acima depende de `dev:up` ter subido o RabbitMQ. Se rodar o api isoladamente sem stack, os 3 testes novos de webhook passam mesmo assim (controller responde 204; só a publicação no broker não acontece — visível em log).
3. **Idempotência do webhook** — IN não dedup. BE precisa comparar status antes de aplicar (item BE Sprint 12). E2E atual não cobre webhook duplicado; vale adicionar quando o handler existir.
4. **DLX `vistoria.events.dlx` em produção** — pendente desde Sprint 03; segue.

### Detectadas durante esta sprint

5. **CI nunca tinha rodado o E2E completo de auth/vistorias** — `auth-and-vistorias.spec.ts` (BE07) depende do seed do admin, mas o job `e2e` não chamava `prisma:seed`. Corrigido nesta sprint. Suspeita: BE07 validou local e o pipeline passou apenas porque o spec de "login com senha errada" tolera ausência de usuário (também retorna 401). Vale conferir o resultado da primeira execução do CI após o commit desta sprint para confirmar que os 4 testes de `auth-and-vistorias` agora passam.
6. **`webServer` antes só subia o api** — testes de UI exigiam o web também. Resolvido.

## Decisões Que Viram ADR

Nenhuma. Decisões desta sprint são táticas:

- Manter `vite dev` (não `preview`) no CI para reaproveitar o proxy `/api`. Decisão única arquitetural (`VITE_API_BASE_URL` continua opcional em dev).
- Trocar webServer do api para `build + start` em CI ao invés de investigar `nest --watch` agora — pragmatismo; ROI baixo para o esforço de debug.
- Secrets de webhook determinísticos no `.env.example` — claramente marcados "do-not-use-in-prod". Padrão é o mesmo do JWT key (placeholder em dev, obrigatório em prod).

## Próximo Sprint

**Sprint 12 — BE**: handler `vistoria.status.changed` + `ProviderRoutingService.decide` na criação + endpoint de transições + refresh token + endpoint agregado de stats. Detalhes acima.
