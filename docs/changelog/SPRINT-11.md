# Sprint 11 — Changelog

**Período**: 2026-05-19
**Agente solo**: QI
**Tema**: Ampliar a cobertura E2E do projeto e endurecer o CI. Validar ponta-a-ponta o painel admin (Sprint 09) e os webhooks (Sprint 08), eliminar a flakiness do `nest start --watch` no CI, e enxugar o overhead recorrente do Chromium nas execuções de Playwright.

## Itens entregues

### Playwright: webServer múltiplo + execução determinística

[`playwright.config.ts`](../../playwright.config.ts):

- `webServer` virou **array**: sobe `apps/api` **e** `apps/web` (antes só o api). Sem isso os testes de UI ficavam dependendo de servidor manual.
- Em CI o api roda como `pnpm --filter @vistoria/api build && pnpm --filter @vistoria/api start` (`node dist/main.js`). Elimina a flakiness do `nest start --watch` que ocasionalmente terminava com "Found 0 errors" sem subir o Node. Dev local mantém `nest dev` por DX.
- `apps/web` sobe via `pnpm --filter @vistoria/web dev` (proxy do Vite cobre `/api` e `/health`).
- `fullyParallel: false` + `workers: 1` — testes compartilham estado (audit acumula); sequencial dá resultado determinístico.

### Specs E2E novas

- [`e2e/admin-ui.spec.ts`](../../e2e/admin-ui.spec.ts) — 4 cenários browser-based:
  1. Login pela UI carrega dashboard com KPIs (Solicitadas, Em execução, Concluídas).
  2. Criar vistoria → detalhe → cancelar → badge "Cancelada" + toast de sucesso.
  3. Rota protegida sem token → redirect para `/login` (testa `RequireAuth`).
  4. `/audit` lista pelo menos um evento `VISTORIA.*`.
- [`e2e/webhooks.spec.ts`](../../e2e/webhooks.spec.ts) — +3 cenários:
  1. Rede Vistorias com HMAC válido + `externalId` → 204.
  2. Rede Vistorias sem `externalId` → 204 (drop silencioso, conforme handoff IN08).
  3. Conceitual com HMAC válido + `idExterno` → 204.

Assinatura HMAC dos novos testes usa secrets determinísticos em [`apps/api/.env.example`](../../apps/api/.env.example): `REDE_VISTORIAS_WEBHOOK_SECRET` e `CONCEITUAL_WEBHOOK_SECRET` passam de vazios para `dev-{provider}-webhook-secret-do-not-use-in-prod`.

### CI endurecido

[`.github/workflows/ci.yml`](../../.github/workflows/ci.yml):

- Job `e2e` agora roda `pnpm --filter @vistoria/api prisma:seed` após `dev:migrate`. Sem isso o admin do dev não existia e `auth-and-vistorias.spec.ts` (BE07) só passava por sorte.
- **Cache do Chromium** do Playwright em `~/.cache/ms-playwright` indexado por `hashFiles('pnpm-lock.yaml')`. Cache hit roda só `playwright install-deps chromium` (libs de runtime); cache miss faz `playwright install --with-deps chromium` completo. Reduz overhead recorrente de ~150MB de download a praticamente zero quando não há mudança de dep.

## Métricas

- 6 arquivos commitados (1 spec novo, 2 specs alterados, `playwright.config.ts`, `ci.yml`, `apps/api/.env.example`)
- 15 testes Playwright (era 8) — 4 admin-ui + 5 webhooks + 1 health + 4 auth-and-vistorias
- 0 alteração em `apps/api/src/` ou `apps/web/src/` (boundary respeitado — QI não toca código de negócio)
- 0 ADRs novos (decisões desta sprint são táticas — documentadas no handoff)

## ADRs criados

Nenhum. Decisões táticas registradas no [handoff SPRINT-11-QI.md](../handoffs/SPRINT-11-QI.md):

- Manter `vite dev` (não `preview`) no CI para reaproveitar o proxy `/api`.
- Trocar `webServer` do api para `build + start` em CI em vez de investigar `nest --watch` agora — pragmatismo; ROI baixo para o esforço de debug.
- Secrets de webhook determinísticos no `.env.example` claramente marcados "do-not-use-in-prod".

## Breaking changes

- `apps/api/.env.example` ganhou 2 valores default para os webhook secrets. Quem já tinha `apps/api/.env` local **precisava copiar manualmente** as duas linhas para os 3 testes novos de webhook passarem localmente. Sem isso, dev seguia funcional.

## Known issues que ficam de pé

1. **`nest start --watch` ocasionalmente "Found 0 errors" sem subir o Node** — herdada do BE07. CI mitigado nesta sprint; dev local com workaround. Root cause não investigado a fundo.
2. **Sem `RABBITMQ_URL` o `RmqVistoriaStatusWriter` é no-op** — herdada do IN08. E2E de webhook depende de `dev:up` ter subido o RabbitMQ; sem stack, controller responde 204 mas publicação não acontece (só log).
3. **Idempotência do webhook** — IN não dedup. BE precisa comparar status antes de aplicar (item BE Sprint 12).
4. **DLX `vistoria.events.dlx` em produção** — pendente desde Sprint 03.

## Pedidos abertos

Detalhados em [SPRINT-11-QI.md](../handoffs/SPRINT-11-QI.md):

- **BE (Sprint 12)** top-priority: handler `vistoria.status.changed` (IN publica desde S08, BE ainda não consome), `ProviderRoutingService.decide` na criação, `GET /vistorias/:id/transicoes`, `POST /auth/refresh`, `GET /vistorias/stats`.
- **IN (Sprint 13)**: sem pendência direta — quando BE consumir o evento e validar idempotência E2E, IN avalia se vale dedup no writer.
- **FE (Sprint 14)**: pendências herdadas do Sprint 09 (timeline, refresh, cookie, recharts).
- **DOC (Sprint 15)**: consolidar changelog SPRINT-11..14 + ADRs que BE/IN produzirem; atualizar `c4-container.md` removendo "(planejado)" da seta RabbitMQ → api quando BE consumir.

## Próximo sprint

**Sprint 12 — BE**: 5 itens herdados acima.
