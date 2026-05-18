# Sprint 03 — Changelog

**Período**: 2026-04-26
**Agente solo**: IN
**Commit**: `4208e22` — `feat(integrations): IVistoriaProvider, webhooks, RMQ subscriber [sprint-03-in]`

## Tema

Estrutura de integrações com parceiros: pacote de contratos compartilhados, interface de provider, 3 adapters skeleton, webhook controller HMAC, RMQ subscriber, scaffold Salesforce DX.

## Itens entregues

### `packages/api-contracts` (novo)

- `StatusVistoriaSchema` (Zod enum, 9 estados da SAGA), `TipoVistoriaSchema` (ENTRADA/SAIDA)
- Constantes `STATUS_CANCELAVEIS`, `STATUS_TERMINAIS`
- Webhooks: `RedeVistoriasWebhookSchema`, `ConceitualWebhookSchema`
- Mappings imutáveis: `REDE_VISTORIAS_TO_STATUS`, `CONCEITUAL_TO_STATUS`

### `packages/integrations` (novo, NestJS module)

- `IVistoriaProvider` (5 métodos: agendar, consultar, cancelar, receberWebhook, healthCheck)
- Tipos: `AgendamentoDto`, `AgendamentoResult`, `ConsultaResult`, `PartnerHealth`, `ProviderId`
- `BaseHttpProvider` (axios + axios-retry exponencial + timeout)
- 3 adapters concretos:
  - `RedeVistoriasProvider` (BaseHttpProvider + status mapping + Zod webhook)
  - `ConceitualProvider` (idem)
  - `InternoProvider` (sem HTTP, depende de `VistoriaRepository` futuro)
- `WebhookSignatureVerifier` HMAC-SHA256 com `timingSafeEqual`
- `WebhookController` em `POST /api/v1/integrations/webhooks/:provider`
- `RmqSubscriber` (amqplib): conecta exchange `vistoria.events`, fila durável `integrations.events` com DLX, API `subscribe(routingKey, handler)`
- `IntegrationsModule.forRoot()` com factories injetando `ConfigService`

### Salesforce DX scaffold (novo)

- `salesforce/sfdx-project.json` (apiVersion 61.0)
- LWC `vistoriaStatus` (props + `@wire(getVistoria)`)
- Apex `VistoriaApiService` com `@AuraEnabled(cacheable=true)` via Named Credential `Vistoria_API`

### `apps/api` (alterações)

- Deps `@vistoria/api-contracts` + `@vistoria/integrations` (workspace)
- 7 novas env vars: `PARTNER_HTTP_TIMEOUT_MS`, `REDE_VISTORIAS_*` (URL/KEY/WEBHOOK*SECRET), `CONCEITUAL*\*` (mesmas 3)
- `IntegrationsModule.forRoot()` importado no `AppModule`

### Endpoints novos

| Método | Rota                                           | Auth                          |
| ------ | ---------------------------------------------- | ----------------------------- |
| POST   | `/api/v1/integrations/webhooks/rede-vistorias` | HMAC `x-rv-signature`         |
| POST   | `/api/v1/integrations/webhooks/conceitual`     | HMAC `x-conceitual-signature` |

### Eventos

- Subscribe: queue `integrations.events` bind ao routing pattern `vistoria.#` no exchange `vistoria.events`. Sem handlers ainda — BE Sprint próximo registra via `subscriber.subscribe(...)`.

### Tests

- `webhooks.spec.ts`: 5 (mappings + validação Zod)
- `signature-verifier.spec.ts`: 8 (positivo + tampering + edge cases hex/length/timing)
- `providers.spec.ts`: 5 (mappings completos + InternoProvider behaviors)

## ADRs criados

- [ADR-007](../decisions/ADR-007-webhook-hmac-sha256.md) — HMAC-SHA256 para webhooks
- [ADR-008](../decisions/ADR-008-axios-vs-fetch.md) — axios + axios-retry
- [ADR-009](../decisions/ADR-009-status-mapping-record.md) — Status mapping como Record

## Breaking changes

Nenhuma — primeiro entregável de IN. (`apps/api` ganhou deps workspace mas isso é aditivo.)

## Métricas

- ~50 arquivos novos
- 18 testes passando (5+8+5)
- 5 novos pacotes resolvidos (axios + axios-retry + transitive)
- 2 endpoints HTTP novos

## Known issues encerrados

- ESM/CJS mismatch entre `@vistoria/api-contracts` (ESM) e Jest no `@vistoria/integrations` (CJS) — resolvido com `moduleNameMapper` apontando para `src/`.
- `InternoProvider` métodos throwing síncronos quebravam `await ... .rejects.toThrow()` — marcados como `async`.
- Faltavam peer/dev deps em integrations (`@nestjs/config`, `@nestjs/swagger`, `express`).

## Pendência aberta

- **Webhook signature verification** depende de raw body. Mitigação atual: fallback `JSON.stringify(body)`. Ação pendente para QI/BE: middleware `app.use(json({ verify: ... }))` em `apps/api/src/main.ts`. Documentado em [ADR-007](../decisions/ADR-007-webhook-hmac-sha256.md).

## Próximo sprint

**Sprint 04 — FE**: bootstrap `apps/web` (React + Vite + Tailwind + Shadcn + Tanstack Query), layout admin, página de health (consumindo endpoint do BE), login skeleton.
