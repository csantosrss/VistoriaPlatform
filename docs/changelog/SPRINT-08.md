# Sprint 08 — Changelog

**Período**: 2026-05-19
**Agente solo**: IN
**Tema**: Ponte entre os webhooks dos parceiros e a SAGA da Vistoria — sem importar nada de `apps/api`. IN entrega um port + implementação RMQ default, provider routing, e reescreve o `WebhookController` para mapear status do parceiro → enum unificado e disparar a transição.

> Este changelog foi consolidado pelo DOC no Sprint 10. O Sprint 09 (FE) saiu antes — sequência sequenciada do ciclo QI → BE → IN → FE → DOC.

## Itens entregues

### Port + DI

- `packages/integrations/src/ports/vistoria-status-writer.port.ts`:
  - Interface `VistoriaStatusWriterPort.update(input: VistoriaStatusUpdate)`
  - Token de DI `VISTORIA_STATUS_WRITER`
  - Tipo `VistoriaStatusUpdate` com `vistoriaId`, `tenantId`, `newStatus`, `motivo?`, `source` (`ProviderId`), `correlationId?`, `rawPayload?`
- Barrel `ports/index.ts`

### Implementação default — `RmqVistoriaStatusWriter`

- `messaging/rmq-vistoria-status-writer.service.ts` (`Injectable + OnModuleInit + OnApplicationShutdown`).
- Publica no exchange `vistoria.events` (topic, durable) com routing-key `vistoria.status.changed`.
- Headers AMQP: `source` (ProviderId), `tenantId`. `correlationId` propagado em `properties.correlationId`. `persistent: true`.
- Sem `RABBITMQ_URL` apenas loga warn (compatível com dev sem broker).
- Reusa a mesma exchange do `RmqSubscriber` (ADR-001 + ADR-006).

### Provider routing

- `routing/provider-routing.service.ts`:
  - `ProviderRoutingService.decide({ tenantId, tipo, enderecoUf, ... })`
  - Regras: `preferredProviderId` > `SAIDA → interno` > tabela UF → fallback `interno`
  - Tabela UF inicial: SP/RJ/MG/PR/RS → `rede-vistorias`; DF/GO/MT/AM/PA → `conceitual`
  - Retorna `{ providerId, reason }` para auditoria
- Barrel `routing/index.ts`

### `mapStatus` estático nos providers

- `RedeVistoriasProvider.mapStatus(partnerStatus)` e `ConceitualProvider.mapStatus(partnerStatus)` agora são estáticos (Record-based — ADR-009). O `WebhookController` faz o mapping sem instanciar o provider.

### `WebhookController` reescrito

- Injeta `VistoriaStatusWriterPort` via `@Inject(VISTORIA_STATUS_WRITER)`.
- Para cada parceiro: chama `provider.receberWebhook(body)` (valida com Zod), mapeia o status, busca `externalId` (Rede Vistorias) ou `idExterno` (Conceitual) e dispara `statusWriter.update(...)`.
- Lê `x-correlation-id` e `x-tenant-id` dos headers e propaga.
- Webhook sem `externalId`/`idExterno` é descartado com warn (sem isso o BE não consegue identificar a Vistoria).
- Decorator `@Public()` **local em IN** (não importado do `apps/api/`) — CLAUDE.md de IN proíbe a importação. O decorator é trivial (`SetMetadata("isPublic", true)`) e a duplicação é intencional e documentada.

### Wiring no `IntegrationsModule`

- Registra `RmqVistoriaStatusWriter` + alias `VISTORIA_STATUS_WRITER` → `useExisting`. Consumidores podem trocar via DI para uma implementação síncrona/in-process.
- Registra `ProviderRoutingService`.
- Exporta `VISTORIA_STATUS_WRITER`, `RmqVistoriaStatusWriter`, `ProviderRoutingService`.
- `packages/integrations/src/index.ts` re-exporta `./ports` e `./routing`.

### Testes

- `routing/provider-routing.service.spec.ts` — 5 casos: override, SAIDA → interno, UF mapeada, normalização de UF, fallback.
- `messaging/rmq-vistoria-status-writer.service.spec.ts` — 2 casos: sem canal não falha (warn), publica no exchange/routing-key esperados.
- `webhooks/webhook.controller.spec.ts` — 3 casos: status mapeado + writer chamado, 403 quando HMAC inválido, drop silencioso sem `externalId`.
- `e2e/webhooks.spec.ts` — Playwright valida que `POST /api/v1/integrations/webhooks/rede-vistorias` é público (responde 403 da assinatura inválida, **não** 401 do JwtGuard).

Total: **23 unit tests passando** em `@vistoria/integrations` (era 13).

## Endpoints alterados

| Método | Rota                                           | Auth         | Mudança                                                                                               |
| ------ | ---------------------------------------------- | ------------ | ----------------------------------------------------------------------------------------------------- |
| POST   | `/api/v1/integrations/webhooks/rede-vistorias` | HMAC público | Agora dispara `VistoriaStatusWriterPort.update` com status mapeado quando `externalId` está presente. |
| POST   | `/api/v1/integrations/webhooks/conceitual`     | HMAC público | Idem (`idExterno`).                                                                                   |

Status codes inalterados: `204` sucesso, `403` HMAC inválido, `400` provider desconhecido ou Zod-fail.

## Eventos RMQ

- **Publica novo**: `vistoria.status.changed` em `vistoria.events` (topic).
  - Payload: `VistoriaStatusUpdate` (JSON)
  - Headers AMQP: `source`, `tenantId`
  - `correlationId` em `properties.correlationId`
  - `persistent: true`
- **Consumo no BE**: ainda **pendente** (Sprint 11+ BE). Enquanto BE não consome, eventos ficam na queue (DLX já mitigado pelo subscriber existente).

## Database

Sem migration. IN não toca em Prisma (boundary).

## ADRs criados

- **ADR-013** — [Vistoria Status Writer Port](../decisions/ADR-013-vistoria-status-writer-port.md): IN escreve `Vistoria.status` via port + evento RMQ ao invés de HTTP interno ou import direto do `apps/api`. Implementação default em RMQ; pode ser trocada via DI por versão síncrona se algum cenário exigir.

## Breaking changes

Nenhum. Tudo é acréscimo dentro de `packages/integrations`. Schemas em `@vistoria/api-contracts` inalterados.

## Métricas

- 11 arquivos novos em `packages/integrations/src/` (ports, routing, messaging, controller reescrito, specs)
- 23 unit tests passando (era 13)
- 1 ADR (ADR-013)
- 0 mudanças em `apps/api` (boundary respeitado)

## Decisões tomadas (sem rendimento de ADR)

- **`mapStatus` estático** ao invés de método de instância — permite o `WebhookController` mapear sem instanciar o provider; é só pragmatismo de teste e desacoplamento.
- **Decorator `@Public()` duplicado em IN** — boundary contra import de `apps/api/`. Documentado no controller.
- **Tabela UF→provider hard-coded** — heurística inicial auditável; vira ADR quando o business pedir flexibilidade (configurável por tenant em DB).
- **Webhook sem `externalId`/`idExterno` é descartado** com warn — alternativa seria criar a Vistoria pelo webhook (anti-padrão: parceiro viraria source-of-truth do nosso domínio).

## Known issues que ficam de pé

1. **Idempotência fica a cargo do BE** — IN não verifica se o status já é o informado. Em transições rápidas (webhook duplicado), o BE precisa comparar `vistoria.status === input.newStatus` antes de aplicar.
2. **Ordem fora de sequência** — dois webhooks de status conflitantes em sequência rápida podem chegar fora de ordem. Mitigação prevista: BE valida a SAGA antes de aplicar; transições inválidas viram audit `VISTORIA.TRANSICAO_REJEITADA`.
3. **Sem `RABBITMQ_URL` o writer é no-op** (apenas warn). Em dev sem broker o webhook continua respondendo 204, mas a transição não acontece. Aceitável porque `dev:all` já sobe o RabbitMQ.
4. **`agendar()` real ainda não é chamado** — IN entregou a entrada (webhook → SAGA), o caminho de saída (Vistoria roteada → API do parceiro) depende de BE publicar `vistoria.roteada` (a fazer no Sprint 11+ do BE).
5. **`ProviderRoutingService.decide.reason` não é persistido** — IN retorna `reason`, BE precisa decidir onde guardar (sugestão: `VistoriaTransicao.motivo` na primeira transição para `ROTEADA`).

## Pedidos abertos

Detalhados em [SPRINT-08-IN.md](../handoffs/SPRINT-08-IN.md). Resumo:

- **BE (Sprint 11+)**: registrar handler `vistoria.status.changed` no `RmqSubscriber`, aplicar `ProviderRoutingService.decide` em `VistoriasService.create()`, disparar `agendar(...)` quando Vistoria transita para `ROTEADA`.
- **FE (Sprint 09)**: nada novo a pedir — quando o BE consumir o evento, a tela `/audit` filtrando por `action=VISTORIA.STATUS_CHANGED` reflete automaticamente. Atendido pelo Sprint 09 (FE plugou a tela genérica de audit).
- **QI (Sprint 11)**: ampliar o E2E de webhook (hoje só prova `@Public()`; falta cobrir caminho feliz com HMAC válido + evento publicado).
- **DOC (Sprint 10)**: consolidar este changelog + atualizar `c4-container.md` para mostrar a seta IN → RMQ. Feito nesta sprint.

## Próximo sprint

**Sprint 09 — FE**: plugar todas as telas planejadas nos endpoints reais do BE Sprint 07 + tela de audit que cobre o evento do IN Sprint 08. Detalhes em [SPRINT-09.md](./SPRINT-09.md).
