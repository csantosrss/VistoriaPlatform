---
agent: IN
sprint: "18"
date: 2026-05-21
---

# Handoff — Sprint 18 (IN) → Sprint 19 (FE)

## Resumo

Sprint pequena e cirúrgica. IN fechou 2 ajustes forward-compat que o BE17 e o FE19 vão precisar quando a integração com agenda virar real, sem mudar comportamento atual:

1. **`IVistoriaProvider.cancelar`** agora aceita `CancelarDto { externalId, tenantId, motivo? }` em vez de `externalId` solto. Resolve a issue do `InternoProvider.cancelar` que publicava com `tenantId: ""` (handoff S13, item 1 das known issues).
2. **`vistoriadorId?` opcional** em `VistoriaRoutedEventSchema` e `AgendamentoDto`. Reservado para quando o routing começar a consultar a agenda (sprint futura). Providers ignoram o campo se ausente — zero impacto no comportamento atual.

Próximo agente é o **FE** (Sprint 19).

## Entregas

### 1. Port `IVistoriaProvider.cancelar` atualizada

[`packages/integrations/src/types/provider.ts`](../../packages/integrations/src/types/provider.ts):

- Novo `CancelarDto { externalId: string, tenantId: string, motivo?: string }`.
- Assinatura: `cancelar(dto: CancelarDto): Promise<void>` (era `cancelar(externalId: string)`).
- Documentação no comentário do `IVistoriaProvider` referencia a Sprint 18.

Atualizações:

- [`base.provider.ts`](../../packages/integrations/src/providers/base.provider.ts) — assinatura abstrata.
- [`interno.provider.ts`](../../packages/integrations/src/providers/interno.provider.ts) — `cancelar(dto)` publica `VistoriaStatusUpdate { newStatus: "CANCELADA", source: "interno", motivo: dto.motivo ?? "Cancelado via InternoProvider.cancelar", tenantId: dto.tenantId }`. **Resolve** a publicação com `tenantId: ""` que causava 404 silencioso no consumer.
- [`rede-vistorias.provider.ts`](../../packages/integrations/src/providers/rede-vistorias.provider.ts) — quando `motivo` está presente, envia `{ reason: motivo }` no body do POST.
- [`conceitual.provider.ts`](../../packages/integrations/src/providers/conceitual.provider.ts) — idem com `{ motivo }`.

### 2. `vistoriadorId?` opcional em events e DTOs

[`packages/api-contracts/src/vistoria/events.ts`](../../packages/api-contracts/src/vistoria/events.ts):

- `VistoriaRoutedEventSchema` ganhou `vistoriadorId: z.string().uuid().optional()`.
- Doc inline explica o propósito (prep para integração routing↔agenda).

[`packages/integrations/src/types/provider.ts`](../../packages/integrations/src/types/provider.ts):

- `AgendamentoDto` ganhou `vistoriadorId?: string`.

[`packages/integrations/src/orchestration/agendamento-orchestrator.service.ts`](../../packages/integrations/src/orchestration/agendamento-orchestrator.service.ts):

- Repassa `event.vistoriadorId` para o `AgendamentoDto` que vai aos providers.

Hoje providers **ignoram** o campo (`InternoProvider`, `RedeVistoriasProvider`, `ConceitualProvider` não leem `dto.vistoriadorId`). Quando o produto pedir, basta o provider relevante passar a usar.

### 3. Testes

- **Unit (`packages/integrations`)**: 33 testes — mantém. `providers.spec.ts` (InternoProvider.cancelar) atualizado para chamar a nova assinatura `cancelar({ externalId, tenantId, motivo })` e validar que o writer recebe `tenantId` real + `motivo` propagado.
- **BE não regrediu**: 49 testes seguem verdes.

## Breaking changes

- **`IVistoriaProvider.cancelar(externalId)` → `cancelar(dto: CancelarDto)`**. Breaking minor de port. Único caller hoje é o teste unitário do `InternoProvider`; nenhuma chamada em produção (BE não chama `cancelar()` em nenhum lugar). Quando BE/FE quiserem cancelar via provider (não confundir com `POST /vistorias/:id/cancelar` que é interno e não toca em providers), assinatura nova é o caminho.
- **`LoginResponseSchema`, demais schemas** — sem mudança.

Schemas em `@vistoria/api-contracts` adicionados como **opcionais** (`vistoriadorId?`) → não breaking.

## Métricas

- 6 arquivos alterados em `packages/integrations/src/`.
- 1 arquivo alterado em `packages/api-contracts/src/vistoria/events.ts`.
- 33 unit tests (mantém — 1 substituído, 0 novos).
- 1 ADR? Não — decisão é cosmética (parametrização da port).

## Decisões táticas (sem ADR)

- **Port com DTO em vez de positional args** — alinha com o resto da codebase (`agendar(dto)`, `update(input)`); facilita evoluções futuras (adicionar campo opcional sem mexer em callers).
- **`vistoriadorId` opcional em vez de obrigatório** — não obriga o BE a popular antes da integração agenda-routing existir. Quando passar a popular, providers que se importam (`interno`, talvez `rede-vistorias`) leem; quem não se importa ignora.
- **`motivo` opcional propagado para parceiros HTTP** — Rede Vistorias e Conceitual já tinham contratos REST que aceitam motivo de cancelamento; mapeamos para `reason`/`motivo` conforme o parceiro.

## Para outros agentes

### FE (Sprint 19) — telas de Users + Agenda

Sem dependência da Sprint 18. Pendentes do S17 BE seguem como entregáveis principais:

1. **`/users`** — lista paginada, filtros por role/active, busca `q`. Botão "Novo usuário" abre form com email, name, password, roles[], active.
2. **`/users/:id`** — detalhe + edit + soft-delete.
3. **`/vistoriadores/:id/agenda`** — calendário visual com slots. Pode aproveitar lib externa (`react-big-calendar`) ou grid CSS simples (recomendado para v1 — menor superfície de UX).

Sugestões técnicas:

- Reusar pattern de `features/<nome>/{components,hooks,services,schemas}` (estabelecido S04).
- React Hook Form + Zod com `CreateUserRequestSchema`, `UpdateUserRequestSchema`, `CreateAgendaSlotsRequestSchema` etc.
- Para o calendário: `disponivel = true` em verde, `disponivel = false` em vermelho/cinza; click em célula vazia cria; click em slot abre edit.
- Atalho na sidebar/menu admin para "Usuários" e "Agenda".

### BE (Sprint 21+)

- **Publicar `vistoria.routed`** — agent-sync da S13 segue válido. Quando publicar, pode opcionalmente preencher `vistoriadorId` se um caminho de pré-atribuição entrar.
- Integração routing↔agenda — quando virar pedido, port BE→IN para consulta de disponibilidade ou cache em Redis pode ajudar.

### DOC (Sprint 20)

- Consolidar S16..S19.
- ADR opcional sobre o modelo de slot com flag `disponivel` (se ficar dúvida do "porquê não separar tabelas").
- Atualizar `c4-container.md` com endpoints novos do BE17 e telas do FE19. Tirar a última seta cinza quando BE publicar `vistoria.routed` (não nesta sprint).

## Validação executada

| Comando                                       | Resultado                                   |
| --------------------------------------------- | ------------------------------------------- |
| `pnpm typecheck`                              | ✅ 6 workspaces, 0 erros                    |
| `pnpm --filter @vistoria/integrations test`   | ✅ 6 suites, 33 testes (mantém)             |
| `pnpm --filter @vistoria/integrations lint`   | ✅ 0 warnings                               |
| `pnpm --filter @vistoria/api test`            | ✅ 49 testes (S17, sem regressão)           |
| `pnpm --filter @vistoria/api-contracts build` | ✅ dist atualizado (vistoriadorId opcional) |

## Known Issues

Mantém-se a lista do S17 menos os 2 itens fechados aqui:

- ~~`InternoProvider.cancelar` sem tenantId~~ → **resolvido nesta sprint** via `CancelarDto`.
- ~~Sem prep para `vistoriadorId` em routed event~~ → **resolvido nesta sprint** (campo opcional).

Mantém em aberto:

1. **BE ainda não publica `vistoria.routed`** — agent-sync S13.
2. **Refresh em `localStorage`** — vulnerável a XSS.
3. **DLX sem alarme em DLQ size > 0** — espera Prometheus.
4. **Slot não detecta sobreposição** (S17 BE) — aceitável v1.
5. **Lint warning em `button.tsx`** — cosmético.

## Próximo Sprint

**Sprint 19 — FE**: telas de Users + Agenda do vistoriador (calendário). Detalhes na seção FE acima.
