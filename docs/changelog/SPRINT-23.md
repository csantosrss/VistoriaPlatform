# Sprint 23 — Changelog

**Período**: 2026-05-21
**Agente solo**: IN
**Tema**: Sprint cirúrgica — propagar `vistoriadorId` em `vistoria.status.changed` para o BE consumer aplicar.

## Itens entregues

- `VistoriaStatusChangedEventSchema.vistoriadorId?` adicionado (`@vistoria/api-contracts/vistoria/events`). Simétrico ao `VistoriaRoutedEventSchema` que já tinha.
- `VistoriaStatusUpdate` (port) ganha `vistoriadorId?: string`.
- `InternoProvider.agendar(dto)` propaga `dto.vistoriadorId` para o writer. `RedeVistorias`/`Conceitual` **não** propagam (vistoriadores deles são internos do parceiro; IDs não casam com `User`).
- **Bonus BE-side**: `VistoriaStatusChangedHandler` aplica `vistoria.vistoriadorId` (via Prisma `connect`) quando o evento traz o campo. Tocar BE aqui foi pragmático (mudança é leitor do contrato que IN expandiu, sem lógica de negócio nova).

## Métricas

- 4 arquivos alterados (3 IN + 1 BE).
- 33 unit (integrations, mantém) + 64 unit (api, mantém).
- 0 ADRs novos.
- 0 breaking changes (campo opcional).

## Próximo sprint

**Sprint 24 — FE**: card de cobertura em `/users/:id` + autocomplete IBGE + `codigoImovelExterno` no form.
