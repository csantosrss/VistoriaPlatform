# Sprint 18 — Changelog

**Período**: 2026-05-21
**Agente solo**: IN
**Tema**: Sprint pequena e cirúrgica — fechar 2 ajustes forward-compat herdados.

## Itens entregues

### `IVistoriaProvider.cancelar` agora aceita `CancelarDto`

[`packages/integrations/src/types/provider.ts`](../../packages/integrations/src/types/provider.ts):

- `cancelar(externalId: string)` → `cancelar(dto: CancelarDto)` onde `CancelarDto = { externalId, tenantId, motivo? }`.
- Resolve a issue herdada da Sprint 13: `InternoProvider.cancelar` publicava `vistoria.status.changed` com `tenantId: ""` causando 404 silencioso no consumer BE.

Implementações:

- `InternoProvider.cancelar(dto)` propaga `tenantId` e `motivo` (com fallback) para o writer.
- `RedeVistoriasProvider.cancelar(dto)` envia `{ reason: dto.motivo }` no body do POST do parceiro quando motivo presente.
- `ConceitualProvider.cancelar(dto)` idem com `{ motivo }`.
- `BaseHttpProvider` (assinatura abstrata).

### `vistoriadorId?` opcional em events + DTOs

[`packages/api-contracts/src/vistoria/events.ts`](../../packages/api-contracts/src/vistoria/events.ts):

- `VistoriaRoutedEventSchema` ganhou `vistoriadorId: z.string().uuid().optional()`.

[`packages/integrations/src/types/provider.ts`](../../packages/integrations/src/types/provider.ts):

- `AgendamentoDto` ganhou `vistoriadorId?: string`.

[`packages/integrations/src/orchestration/agendamento-orchestrator.service.ts`](../../packages/integrations/src/orchestration/agendamento-orchestrator.service.ts):

- Repassa `event.vistoriadorId` para o `AgendamentoDto` que vai aos providers.

Providers atuais **ignoram** o campo. Reservado para quando BE começar a popular (após integração routing↔agenda). Zero impacto no comportamento atual.

## Testes

33 unit (mantém). `providers.spec.ts` (InternoProvider.cancelar) atualizado para a nova assinatura e valida `tenantId` real + `motivo` propagado.

## Breaking changes

- **`IVistoriaProvider.cancelar(externalId)` → `cancelar(dto)`**. Breaking minor de port; único caller hoje era o teste unitário; nenhuma chamada em produção. Quando BE/FE quiserem cancelar via provider, assinatura nova é o caminho.
- Schemas em `@vistoria/api-contracts` adicionados como **opcionais** → não breaking.

## Métricas

- 6 arquivos alterados em `packages/integrations/src/`.
- 1 arquivo alterado em `packages/api-contracts/src/vistoria/events.ts`.
- 33 unit (mantém — 1 teste substituído, 0 novos).

## Known issues fechados nesta sprint

- ~~`InternoProvider.cancelar` sem tenantId~~ → resolvido.
- ~~Sem prep para `vistoriadorId` em routed event~~ → resolvido.

## Próximo sprint

**Sprint 19 — FE**: telas de Users + Agenda.
