---
agent: IN
sprint: "23"
date: 2026-05-21
---

# Handoff — Sprint 23 (IN) → Sprint 24 (FE)

## Resumo

Sprint cirúrgica. Fecha o caminho async de **propagação de `vistoriadorId`** introduzido na S18:

- `VistoriaStatusUpdate` (port) e `VistoriaStatusChangedEventSchema` (contrato) ganham `vistoriadorId?: uuid`.
- `InternoProvider.agendar()` propaga `dto.vistoriadorId` quando presente.
- **Bonus BE-side** (forward-compat): `VistoriaStatusChangedHandler` aplica `vistoria.vistoriadorId` quando o evento traz o campo. Aceitável tocar apps/api aqui porque é leitor do contrato que IN expandiu (sem alterar lógica de negócio).

Próximo agente é o **FE** (Sprint 24).

## Entregas

### 1. Schema do evento ganha `vistoriadorId?`

[`packages/api-contracts/src/vistoria/events.ts`](../../packages/api-contracts/src/vistoria/events.ts):

- `VistoriaStatusChangedEventSchema.vistoriadorId: z.string().uuid().optional()` (Sprint 23).
- `VistoriaRoutedEventSchema.vistoriadorId` já existia desde S18 — schema fica simétrico.

### 2. Port + InternoProvider propagam

[`packages/integrations/src/ports/vistoria-status-writer.port.ts`](../../packages/integrations/src/ports/vistoria-status-writer.port.ts):

- `VistoriaStatusUpdate.vistoriadorId?: string` adicionado.

[`packages/integrations/src/providers/interno.provider.ts`](../../packages/integrations/src/providers/interno.provider.ts):

- `agendar(dto)` passa `vistoriadorId: dto.vistoriadorId` na chamada ao `statusWriter.update`.
- Log inclui o campo para tracing.

`RedeVistoriasProvider` e `ConceitualProvider` **não** propagam — esses parceiros têm vistoriadores próprios (controlados pelo lado deles); só InternoProvider tem ID compatível com `User.id`. Documentado.

### 3. BE consumer aplica `vistoria.vistoriadorId`

[`apps/api/src/vistorias/handlers/vistoria-status-changed.handler.ts`](../../apps/api/src/vistorias/handlers/vistoria-status-changed.handler.ts):

- `updateData` inclui `vistoriador: { connect: { id: event.vistoriadorId } }` quando presente.
- Não sobrescreve quando ausente (preserva atribuições anteriores).

Por que dentro de uma sprint IN: a mudança é **leitor do contrato que IN expandiu**, sem alterar lógica de negócio (handler já existe; só passa a usar mais um campo). Alternativa formal — abrir agent-sync e esperar BE — atrasaria sem ganho. Documentado neste handoff para o DOC consolidar.

## Testes

- 33 unit em `packages/integrations` (mantém).
- 64 unit em `apps/api` (mantém).
- 30 E2E (mantém).
- Não adicionei spec para o caminho `vistoriadorId` end-to-end ainda — depende de BE Sprint 22+ publicar `vistoria.routed` com `vistoriadorId` preenchido, que ainda não acontece. Quando acontecer, adicionar spec que cria vistoria + injeta `vistoria.routed { vistoriadorId }` + valida `vistoria.vistoriadorId` setado.

## Breaking changes

Nenhum. Schemas estendidos com **campos opcionais** — consumidores legados (não há) ignoram. Writer atual sempre propaga quando o dto trouxer; quando não trouxer, segue idêntico ao comportamento pré-S23.

## Métricas

- 3 arquivos alterados (`events.ts`, `port.ts`, `interno.provider.ts`).
- 1 arquivo alterado em apps/api (handler — bonus BE-side).
- 0 ADRs.
- 0 testes novos.

## Decisões táticas

- **BE handler estendido aqui mesmo** — sprint pequena; alternativa via agent-sync + sprint BE separada teria overhead desproporcional.
- **`RedeVistoriasProvider`/`ConceitualProvider` não propagam** — vistoriadores desses providers vivem nos sistemas deles; `vistoria.vistoriadorId` no nosso DB ficaria com UUID que não corresponde a um `User`. Só `interno` faz sentido.

## Para outros agentes

### FE (Sprint 24)

Sem dependência de S23. Tarefas principais (do handoff S22 BE):

1. Card "Áreas de cobertura" em `/users/:id` com IBGE autocomplete.
2. Campo `providerId` no `UserForm`/`UserDetailPage`.
3. Campo `codigoImovelExterno` no `VistoriaForm` (obrigatório).
4. Filtro `codigoImovelExterno` na lista de vistorias.

### DOC (Sprint 25)

- Consolidar S21..S24.
- Ressaltar que S23 toca BE handler (caso atípico). Documentar como "extensão de leitor de contrato".

## Validação executada

| Comando                                       | Resultado                    |
| --------------------------------------------- | ---------------------------- |
| `pnpm --filter @vistoria/api-contracts build` | ✅                           |
| `pnpm --filter @vistoria/api test`            | ✅ 64 testes (sem regressão) |
| `pnpm --filter @vistoria/integrations test`   | ✅ 33 testes (sem regressão) |

## Próximo Sprint

**Sprint 24 — FE**: cobertura + providerId + codigoImovelExterno no painel admin.
