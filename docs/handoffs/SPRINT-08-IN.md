---
agent: IN
sprint: "08"
date: 2026-05-19
---

# Handoff — Sprint 08 (IN) → Sprint 09 (FE)

## Resumo

IN fechou a ponte entre os webhooks dos parceiros e a SAGA da Vistoria. Foi
criado um **port** (`VistoriaStatusWriterPort`) com implementação default que
publica em RMQ (`vistoria.status.changed`), uma camada de **provider routing**
que decide qual parceiro atende cada Vistoria, e o `WebhookController` foi
elevado de "apenas valida HMAC + Zod" para "mapeia status do parceiro → enum
unificado e dispara a transição via port". Tudo isso sem importar nada do
`apps/api/` (boundary de IN respeitado, conforme [ADR-013](../decisions/ADR-013-vistoria-status-writer-port.md)).

## Itens Entregues

### Port + DI

- IN-019 — `packages/integrations/src/ports/vistoria-status-writer.port.ts`
  - Interface `VistoriaStatusWriterPort.update(input: VistoriaStatusUpdate)`
  - Token de DI `VISTORIA_STATUS_WRITER` (string)
  - Tipo `VistoriaStatusUpdate` com `vistoriaId`, `tenantId`, `newStatus`,
    `motivo?`, `source` (`ProviderId`), `correlationId?`, `rawPayload?`
- IN-020 — `packages/integrations/src/ports/index.ts` (barrel)

### Implementação default (RMQ)

- IN-021 — `packages/integrations/src/messaging/rmq-vistoria-status-writer.service.ts`
  - `RmqVistoriaStatusWriter` (Injectable + `OnModuleInit` + `OnApplicationShutdown`)
  - Publica em `vistoria.events` (topic) com routing-key `vistoria.status.changed`
  - Reusa a mesma exchange do `RmqSubscriber` (ADR-001 / ADR-006)
  - Sem `RABBITMQ_URL` apenas loga warn (compatível com `dev` sem broker)
  - Encerra channel/connection em shutdown

### Provider routing

- IN-022 — `packages/integrations/src/routing/provider-routing.service.ts`
  - `ProviderRoutingService.decide({ tenantId, tipo, enderecoUf, ... })`
  - Regras: `preferredProviderId` > `SAIDA → interno` > tabela UF → fallback `interno`
  - Tabela UF inicial: SP/RJ/MG/PR/RS → `rede-vistorias`; DF/GO/MT/AM/PA → `conceitual`
  - Retorna `{ providerId, reason }` para auditoria
- IN-023 — `packages/integrations/src/routing/index.ts` (barrel)

### `mapStatus` estático nos providers

- IN-024 — `RedeVistoriasProvider.mapStatus(partnerStatus)` (estático)
- IN-025 — `ConceitualProvider.mapStatus(partnerStatus)` (estático)

Antes era acoplado à instância; o `WebhookController` precisava chamar sem
depender de DI completa do provider, então foi promovido a estático
(`Record`-based — ADR-009).

### `WebhookController` reescrito

- IN-026 — `packages/integrations/src/webhooks/webhook.controller.ts`
  - Injeta `VistoriaStatusWriterPort` via `@Inject(VISTORIA_STATUS_WRITER)`
  - Para cada parceiro: chama `provider.receberWebhook(body)` (valida com Zod),
    mapeia o status, busca `externalId` (Rede Vistorias) ou `idExterno`
    (Conceitual) e dispara `statusWriter.update(...)`
  - Lê `x-correlation-id` e `x-tenant-id` dos headers e propaga
  - Webhook sem `externalId`/`idExterno` é descartado com warn (não dá pra
    mapear para Vistoria — sem isso o BE não saberia qual linha atualizar)
  - Decorator `@Public()` local (sem importar do `apps/api`) — bypassa o
    JwtGuard global do BE Sprint 07; autenticação real é o HMAC do parceiro

### Wiring no `IntegrationsModule`

- IN-027 — `packages/integrations/src/integrations.module.ts`
  - Registra `RmqVistoriaStatusWriter` + alias `VISTORIA_STATUS_WRITER` →
    `useExisting`. Consumidores podem trocar via DI se quiserem uma
    implementação síncrona/in-process.
  - Registra `ProviderRoutingService`
  - Exporta `VISTORIA_STATUS_WRITER`, `RmqVistoriaStatusWriter` e
    `ProviderRoutingService`
- IN-028 — `packages/integrations/src/index.ts` re-exporta `./ports` e
  `./routing`

### Testes

- IN-029 — `routing/provider-routing.service.spec.ts` — 5 casos: override,
  SAIDA → interno, UF mapeada, normalização de UF, fallback
- IN-030 — `messaging/rmq-vistoria-status-writer.service.spec.ts` — 2 casos:
  sem canal não falha (warn) + publica no exchange/routing-key esperados
- IN-031 — `webhooks/webhook.controller.spec.ts` — 3 casos: status mapeado +
  writer chamado, 403 quando HMAC inválido, drop silencioso sem `externalId`
- IN-032 — `e2e/webhooks.spec.ts` — Playwright valida que o endpoint
  `POST /api/v1/integrations/webhooks/rede-vistorias` é público (responde 403
  da assinatura inválida, **não** 401 do JwtGuard)

Total: **23 unit tests passando** em `@vistoria/integrations` (era 13).

### Documentação

- IN-033 — [ADR-013](../decisions/ADR-013-vistoria-status-writer-port.md):
  port + RMQ event como contrato entre IN e BE
- IN-034 — `docs/decisions/README.md` atualizado (índice e categoria)

## ADRs criados

- **ADR-013** — IN escreve `Vistoria.status` via port + evento RMQ (autor IN,
  Sprint 08, status Aceita)

## Endpoints alterados

| Método | Rota                                           | Auth         | Mudança                                                                                                                                  |
| ------ | ---------------------------------------------- | ------------ | ---------------------------------------------------------------------------------------------------------------------------------------- |
| POST   | `/api/v1/integrations/webhooks/rede-vistorias` | HMAC público | Agora dispara `VistoriaStatusWriterPort.update` com status mapeado quando `externalId` está presente. Antes só validava Zod e respondia. |
| POST   | `/api/v1/integrations/webhooks/conceitual`     | HMAC público | Idem (`idExterno`).                                                                                                                      |

Status codes inalterados: `204` sucesso, `403` HMAC inválido, `400` provider
desconhecido ou Zod-fail.

## Eventos RMQ

- **Publica novo**: `vistoria.status.changed` em `vistoria.events` (topic).
  - Payload: `VistoriaStatusUpdate` (JSON)
  - Headers AMQP: `source` (ProviderId), `tenantId`
  - `correlationId` propagado em `properties.correlationId`
  - `persistent: true`
- **Assinar (BE)**: BE em sprint próximo deve registrar handler via
  `RmqSubscriber.subscribe('vistoria.status.changed', async (msg) => { ... })`
  para aplicar `Vistoria.status = msg.newStatus`, gravar `VistoriaTransicao` e
  `AuditLog`. Enquanto BE não consome, eventos vão para a queue mas não são
  processados (aceitável — DLX já cuida do que ficar acumulado).

## Database

Sem migration nesta sprint. IN não toca em Prisma (boundary).

## Pendente Para Outros Agentes

### BE (Sprint 09 ou 10)

1. **Consumir `vistoria.status.changed`** em um handler do `RmqSubscriber`:
   - Validar idempotência (Vistoria pode já estar no `newStatus`)
   - Aplicar transição via `VistoriasService` (criar método `aplicarTransicao`
     que valida regras de SAGA e grava `VistoriaTransicao` + `AuditLog` com
     `action="VISTORIA.STATUS_CHANGED"`, `userId=null`, `correlationId` do msg)
   - Decidir se cancelamento via webhook reabre tickets em audit log
2. **Aplicar `ProviderRoutingService.decide`** em `VistoriasService.create()`:
   hoje `providerId` fica `null` na criação. Resultado virá no campo `providerId`
   da Vistoria e em `transicao.metadata.reason`.
3. **Disparar `agendar(...)`** do provider escolhido depois que a Vistoria
   transita para `ROTEADA`. Pode ser via mais um handler do `RmqSubscriber`
   (`vistoria.roteada`) — BE publica o evento; IN reage chamando o adapter.
   (Alternativa: BE injeta `RedeVistoriasProvider`/`ConceitualProvider`
   diretamente — `IntegrationsModule` já exporta. Decidir na hora.)

### FE (Sprint 09)

- **Webhooks recebidos** é viável agora: quando o BE consumir
  `vistoria.status.changed` e gravar `AuditLog`, a tela
  `GET /api/v1/audit-logs?resourceType=Vistoria&action=VISTORIA.STATUS_CHANGED`
  passa a refletir o histórico de transições disparadas por parceiro.
  Enquanto isso, a tela pode mostrar `VISTORIA.CREATED` e `VISTORIA.CANCELED`
  do Sprint 07.
- Demais telas (login, lista, detalhe, criação) — escopo do Sprint 09 já
  alinhado no handoff do BE Sprint 07. Sem nada novo a pedir.

### QI (Sprint 10)

- Provisionar a DLX `vistoria.events.dlx` em produção quando RabbitMQ subir
  (já era pendente do Sprint 03; permanece).
- **Endurecer o E2E de webhook**: o teste atual (`e2e/webhooks.spec.ts`) só
  prova que o endpoint é `@Public()` — não cobre o caminho feliz com HMAC
  válido nem o efeito colateral (evento publicado / Vistoria transitada).
  Quando BE consumir o evento e atualizar o registro, dá pra ampliar.
- Considerar fixture de provider routing em `apps/api/prisma/seed.ts` (tabela
  UF→provider configurável em DB no futuro, mas hoje é hard-coded em IN).

### DOC (Sprint 11)

- Consolidar ADR-013 no [README de decisões](../decisions/README.md) — feito.
- Atualizar `docs/architecture/c4-container.md` para mostrar a seta nova:
  `IntegrationsModule → RabbitMQ (vistoria.status.changed) → apps/api`.
- Eventualmente, ADR sobre a tabela de provider routing (hard-coded vs
  configurável em DB vs configurável por tenant). Hoje é hard-coded; quando o
  business pedir mais flexibilidade, vira ADR.

## Decisões Tomadas

- **Port + RMQ event** ao invés de HTTP interno ou import direto — ver
  [ADR-013](../decisions/ADR-013-vistoria-status-writer-port.md). Implementação
  pode ser trocada via DI para uma versão síncrona se algum cenário exigir.
- **`mapStatus` estático** nos providers — permite que o `WebhookController`
  faça o mapping sem instanciar o provider (já vinha por DI; é só pragmatismo
  de teste e desacoplamento).
- **Decorator `@Public()` duplicado em IN** (não importado de `apps/api`) —
  CLAUDE.md de IN proíbe importar do `apps/api/`. O decorator é um
  `SetMetadata("isPublic", true)` trivial; a duplicação é intencional e
  documentada no próprio arquivo do controller.
- **Tabela UF→provider hard-coded** — heurística inicial auditável; suficiente
  para o piloto. Quando virar exigência do negócio, promover para DB e ADR.
- **Webhook sem `externalId`/`idExterno` é descartado** com warn — sem isso o
  BE não consegue identificar a Vistoria. Alternativa seria criar a Vistoria
  no momento (anti-padrão: parceiro virou source-of-truth do nosso domínio).

## Known Issues

1. **Idempotência fica a cargo do BE**: IN não verifica se o status já é o
   informado. Em transições rápidas (webhook duplicado), o BE precisa
   verificar `vistoria.status === input.newStatus` antes de aplicar.
2. **Ordem fora de sequência**: dois webhooks de status conflitantes em
   sequência rápida podem chegar fora de ordem no consumidor. Mitigação
   prevista: BE valida a SAGA antes de aplicar (transições inválidas viram
   `VistoriaTransicaoRejeitada` no audit, sem mudar o status).
3. **Sem `RABBITMQ_URL` o writer é no-op** (apenas warn). Em dev sem broker o
   webhook continua respondendo 204, mas a transição não acontece. Aceitável
   porque `dev:all` do Sprint 06 já sobe o RabbitMQ.
4. **`agendar()` real ainda não é chamado** — IN entregou o caminho de
   entrada (webhook → SAGA), mas o caminho de saída (Vistoria roteada → API
   do parceiro) depende de BE publicar o evento `vistoria.roteada` (a fazer
   no Sprint 09/10 do BE).
5. **Provider routing não persiste o `reason`** — hoje `ProviderRoutingService`
   retorna `reason` mas BE precisa decidir onde guardar (sugestão:
   `VistoriaTransicao.motivo` na primeira transição para `ROTEADA`).

## Próximo Sprint

**Sprint 09 — FE**: plugar as telas nos endpoints do BE Sprint 07. Detalhes no
handoff do BE Sprint 07. Nada novo a pedir do FE sobre o que IN entregou nesta
sprint (a tela de Webhooks recebidos só ganha conteúdo real quando BE consumir
`vistoria.status.changed`).
