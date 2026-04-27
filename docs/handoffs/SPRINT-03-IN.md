---
agent: IN
sprint: "03"
date: 2026-04-26
---

# SPRINT-03-IN — Handoff

## Resumo

Estrutura completa de integrações com parceiros: pacote `@vistoria/api-contracts` (contratos compartilhados FE/BE/IN), pacote `@vistoria/integrations` (interface `IVistoriaProvider`, 3 adapters skeleton, webhook controller HMAC, RMQ subscriber), wire-up no `apps/api` e scaffold Salesforce DX (LWC + Apex).

## Itens Completos

### Pacote `@vistoria/api-contracts` (novo)

- IN-001 — `StatusVistoria` enum + Zod schema (9 estados da SAGA), `TipoVistoria` (ENTRADA/SAIDA), constantes `STATUS_CANCELAVEIS` / `STATUS_TERMINAIS`
- IN-002 — Schemas de webhook: `RedeVistoriasWebhookSchema`, `ConceitualWebhookSchema`
- IN-003 — Mappings imutáveis `REDE_VISTORIAS_TO_STATUS` e `CONCEITUAL_TO_STATUS`

### Pacote `@vistoria/integrations` (novo)

- IN-004 — `IVistoriaProvider` interface (5 métodos) + tipos `AgendamentoDto`, `AgendamentoResult`, `ConsultaResult`, `PartnerHealth`, `ProviderId`
- IN-005 — `BaseHttpProvider` abstrato: Axios + `axios-retry` (exponencial em 5xx/network errors), timeout configurável (default 10s), `healthCheck` genérico contra `/health` do parceiro
- IN-006 — 3 adapters concretos:
  - `RedeVistoriasProvider` — extends Base, `mapStatus` estático, `receberWebhook` com Zod validation; `agendar/consultar/cancelar` placeholder (`NotImplementedException`)
  - `ConceitualProvider` — análogo
  - `InternoProvider` — `IVistoriaProvider` direto, sem HTTP (depende de `VistoriaRepository` do BE Sprint 03+)
- IN-007 — `WebhookSignatureVerifier` (HMAC-SHA256, comparação `timingSafeEqual`)
- IN-008 — `WebhookController` em `POST /api/v1/integrations/webhooks/:provider`, valida assinatura via header específico do parceiro, dispatcha para o provider correto
- IN-009 — `RmqSubscriber` (amqplib): conecta ao exchange `vistoria.events`, fila durável `integrations.events` com DLX, bind genérico `vistoria.#`, mecanismo `subscribe(routingKey, handler)` para handlers do BE Sprint 03+
- IN-010 — `IntegrationsModule.forRoot()` registra todos os providers via factories que injetam `ConfigService`

### Salesforce DX (novo, em `salesforce/`)

- IN-011 — `sfdx-project.json` com sourceApiVersion 61.0
- IN-012 — LWC `vistoriaStatus` (props `recordId`/`vistoriaId`, busca via `@wire(getVistoria)`)
- IN-013 — `VistoriaApiService.cls` com `@AuraEnabled(cacheable=true) getVistoria(externalId)` via Named Credential `Vistoria_API`
- IN-014 — `salesforce/README.md` com convenções e roadmap

### Mudanças no `apps/api`

- IN-015 — `package.json`: adicionadas deps `@vistoria/api-contracts` e `@vistoria/integrations` (workspace)
- IN-016 — `src/config/env.schema.ts`: 7 novas env vars (`PARTNER_HTTP_TIMEOUT_MS`, `REDE_VISTORIAS_API_URL/KEY/WEBHOOK_SECRET`, `CONCEITUAL_API_URL/KEY/WEBHOOK_SECRET`)
- IN-017 — `.env.example`: mesmas 7 vars
- IN-018 — `src/app.module.ts`: importa `IntegrationsModule.forRoot()`

## Endpoints Novos

| Método | Rota                                           | Auth | Descrição                                        |
| ------ | ---------------------------------------------- | ---- | ------------------------------------------------ |
| POST   | `/api/v1/integrations/webhooks/rede-vistorias` | HMAC | Webhook de status de vistorias da Rede Vistorias |
| POST   | `/api/v1/integrations/webhooks/conceitual`     | HMAC | Webhook da Conceitual                            |

Headers de assinatura esperados:

- Rede Vistorias: `x-rv-signature` (hex SHA256 do raw body com `REDE_VISTORIAS_WEBHOOK_SECRET`)
- Conceitual: `x-conceitual-signature` (idem com `CONCEITUAL_WEBHOOK_SECRET`)

Status code: `204 No Content` em sucesso; `403 Forbidden` se assinatura inválida; `400 Bad Request` se provider desconhecido ou payload Zod-rejeitado.

## Eventos

- **Subscribe**: `RmqSubscriber` está conectado ao exchange `vistoria.events` mas sem handlers ainda. BE Sprint 03+ chamará `subscriber.subscribe('vistoria.solicitada', handler)` para reagir.
- Fila durável: `integrations.events` com DLX `vistoria.events.dlx` (a ser criado pelo QI quando provisionarem RabbitMQ em produção).

## Variáveis de Ambiente Adicionadas (em `apps/api/.env.example`)

```env
PARTNER_HTTP_TIMEOUT_MS=10000
REDE_VISTORIAS_API_URL=https://api.redevistorias.com.br
REDE_VISTORIAS_API_KEY=
REDE_VISTORIAS_WEBHOOK_SECRET=
CONCEITUAL_API_URL=https://api.conceitual.com.br
CONCEITUAL_API_KEY=
CONCEITUAL_WEBHOOK_SECRET=
```

Em dev, vazias — providers continuam instanciáveis mas requisições reais falham com 401 do parceiro. Em produção, QI deve injetar via secret manager.

## Database Changes

Nenhuma. Sprint 03 IN não toca em Prisma.

## Validação Executada

| Comando                                          | Resultado                                         |
| ------------------------------------------------ | ------------------------------------------------- |
| `pnpm install` (com TEMP→D:)                     | ✅ 960 pacotes (5 novos: axios, axios-retry, etc) |
| `pnpm --filter @vistoria/api-contracts build`    | ✅ `dist/` populado                               |
| `pnpm --filter @vistoria/api-contracts test`     | ✅ 5 testes (3 schemas + 2 mapping)               |
| `pnpm --filter @vistoria/integrations typecheck` | ✅ 0 erros                                        |
| `pnpm --filter @vistoria/integrations test`      | ✅ 13 testes (8 signature + 5 mapping/provider)   |
| `pnpm --filter @vistoria/integrations build`     | ✅ `dist/` populado                               |
| `pnpm --filter @vistoria/api typecheck`          | ✅ 0 erros                                        |
| `pnpm --filter @vistoria/api build`              | ✅ nest build OK                                  |
| `pnpm --filter @vistoria/api test`               | ✅ 8 testes (do BE Sprint 02) ainda passando      |
| `pnpm lint` em todos os 3 pacotes                | ✅ 0 errors / 0 warnings                          |

## Pendente Para Outros Agentes

### BE (Sprint 03+) — agente próximo

1. Criar entidades de domínio em `apps/api/src/domain/vistoria/` (`Vistoria`, `Imovel`, `Comodo`, `FotoVistoria`)
2. SAGA state machine usando o enum `StatusVistoria` de `@vistoria/api-contracts`
3. Use cases que injetam os providers de IN:
   ```ts
   constructor(
     private readonly redeVistorias: RedeVistoriasProvider,
     private readonly conceitual: ConceitualProvider,
     private readonly interno: InternoProvider,
   ) {}
   ```
4. Plug handlers no `RmqSubscriber`:
   ```ts
   subscriber.subscribe(
     "vistoria.solicitada",
     this.routeVistoriaUseCase.handle,
   );
   ```
5. Implementar a parte interna de `InternoProvider.agendar/consultar/cancelar` consumindo `VistoriaRepository`
6. Endpoint `GET /api/v1/vistorias/:id` (consumido pelo Apex Salesforce em `VistoriaApiService.cls`)

### FE (Sprint 04)

- Tela admin de visualização de webhooks recebidos (consultar `audit_logs` filtrado)
- Tela de configuração de parceiros (read-only, valores das env vars)

### QI (validação E2E + observabilidade)

- Adicionar ao `infra/docker-compose.yml` mock servers (`webhook.site` ou `mockoon`) para webhook integration tests
- CI: garantir que o build do api-contracts roda **antes** do build de integrations e api (turbo `dependsOn: ["^build"]` já está, mas confirmar ordem real no CI)
- Provisionar Named Credential `Vistoria_API` no sandbox Salesforce
- Criar DLX `vistoria.events.dlx` no RabbitMQ (declaração explícita ou via `assertExchange` no boot)

### DOC

- Sync enviado em `docs/agent-sync/SPRINT-03-IN-TO-DOC.md`

## Known Issues

1. **Salesforce não foi validado** — não há Salesforce CLI/sandbox neste ambiente. Estrutura segue convenções DX padrão; QI deve rodar `sf project deploy validate` no sandbox antes do primeiro merge.
2. **`InternoProvider` lança `NotImplementedException` em todos os métodos de mutação** — isso é o esperado para Sprint 03; BE Sprint 03+ injeta `VistoriaRepository`.
3. **Webhook signature verification depende do raw body**, mas o NestJS por default já fez `JSON.parse` no payload no momento que chega ao controller. Mitigação implementada: o controller tenta `req.rawBody` primeiro (precisa middleware no `main.ts`); se não existir, faz `JSON.stringify(body)` como fallback (funciona em dev mas pode falhar com payloads que tenham whitespace/ordem específica). **Ação para QI/BE**: configurar middleware no `main.ts` que preserve o raw body via `app.use(json({ verify: (req, res, buf) => { (req as any).rawBody = buf; } }))`.

## Próximos Passos do Próprio IN (Sprint 04+)

1. Implementar adapters reais (Rede Vistorias, Conceitual) quando BE liberar a entidade `Vistoria`
2. Circuit breaker (opossum) para evitar cascading failures de parceiros
3. Métricas Prometheus de latência/erro por provider (exporter no health endpoint do api)
4. LWC para criar nova vistoria a partir de Salesforce
5. Apex Trigger em `Imovel__c` (ao mudar status para "DESOCUPADO" → criar vistoria de saída automática)
6. Tests Apex (cobertura ≥75%)

## Breaking Changes

Nenhuma — primeiro entregável de IN.

## Decisões Que Viram ADR

Notificação enviada ao DOC em `docs/agent-sync/SPRINT-03-IN-TO-DOC.md`:

- ADR-007: HMAC-SHA256 vs assinatura assimétrica para webhooks de parceiros
- ADR-008: axios + axios-retry vs node-fetch + p-retry
- ADR-009: Mappings de status como Record imutável (vs strategy pattern)
