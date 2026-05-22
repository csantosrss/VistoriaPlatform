# Sprint 19 — Changelog

**Período**: 2026-05-21
**Agente solo**: FE
**Tema**: Consumir endpoints do BE17 entregando as telas de Users + Agenda no painel admin.

## Itens entregues

### Feature Users

[`apps/web/src/features/users/`](../../apps/web/src/features/users/):

- Service `users.service.ts` — list, get, create, update, deactivate (todos validam resposta com Zod schemas de `@vistoria/api-contracts`).
- 5 hooks: `use-users`, `use-user`, `use-create-user`, `use-update-user`, `use-deactivate-user`.
- `UserForm.tsx` — React Hook Form + Zod (`CreateUserRequestSchema`). 5 roles via checkboxes (`Controller`).
- `UsersListPage.tsx` — tabela com filtros (q, role, active-only) + botão "Novo usuário" + atalho "Agenda" só para role VISTORIADOR.
- `NewUserPage.tsx` — wrapper com card "Dados do usuário".
- `UserDetailPage.tsx` — edit parcial (name/password/roles) + card de desativação + atalho de abrir agenda.

Filtros: `q` em e-mail/name, `role` selecionável, "apenas ativos" default true. Form de criação cria com `active: true`; desativação só no detalhe.

### Feature Agenda

[`apps/web/src/features/agenda/`](../../apps/web/src/features/agenda/):

- Service `agenda.service.ts` — list, create (bulk), update, delete.
- 4 hooks correspondentes.
- `AddSlotForm.tsx` — form de 1 slot com `datetime-local x2` + checkbox `disponivel` + motivo opcional.
- `SlotRow.tsx` — linha da tabela com badge de status, botão "Bloquear/Liberar" (toggle inline), confirm de remoção em 2 cliques.
- `VistoriadorAgendaPage.tsx` — layout 2 colunas: filtro de período + tabela à esquerda; AddSlotForm à direita. Sumário total/disponíveis/bloqueados.

V1 sem calendário visual — tabela com filtro de período cobre o caso de uso atual. Migração futura quando volume crescer.

### Navegação

- 4 rotas novas em `routes.tsx`: `/users`, `/users/novo`, `/users/:id`, `/vistoriadores/:id/agenda`.
- Novo item de menu "Usuários" no `AdminLayout.tsx` (ícone `Users` do `lucide-react`).
- Rodapé atualizado para `v0.0.0 — Sprint 19`.

## Endpoints consumidos

Sem novos endpoints — todos vêm do BE17:

- `GET/POST /api/v1/users` + `GET/PATCH/DELETE /api/v1/users/:id`.
- `GET/POST /api/v1/vistoriadores/:id/agenda` + `PATCH/DELETE /api/v1/vistoriadores/:id/agenda/:slotId`.

## Testes

19 unit (mantém — sem regressão). Specs novos para Users/Agenda **não adicionados** nesta sprint — cobertura confiou no contrato Zod + typecheck + E2E do BE17. Vale criar specs quando regressão real surgir.

## Breaking changes

Nenhum. Telas novas sem alterar existentes.

## Métricas

- 14 arquivos novos em `apps/web/src/features/{users,agenda}/`.
- 2 arquivos alterados (`routes.tsx`, `layouts/AdminLayout.tsx`).
- 4 rotas novas no router.
- 1 item novo de navegação.
- 0 dependências novas (UI primitivos reusados: Card/Input/Button/Badge/Skeleton/Label/Select).

## Decisões táticas (sem ADR)

- Sem `react-big-calendar` na v1 — tabela com filtro de período é mais simples, sem dep nova, cobre o caso típico.
- Toggle de disponibilidade inline (sem abrir form) — UX mais rápida.
- AddSlotForm 1-slot por vez; bulk até 200 na API só direto.
- Roles como checkboxes; 5 roles cabem confortavelmente.
- Atalho "Agenda" só aparece para users com role VISTORIADOR.

## Known issues que ficam de pé

1. BE ainda não publica `vistoria.routed`.
2. Refresh em `localStorage`.
3. Sem testes unitários de Users/Agenda no FE — confiou no contrato Zod + typecheck.
4. Tabela de slots não pagina — aceitável v1.
5. `UserForm` cria sempre com `active: true` (sem campo no form).
6. Sem confirmação ao trocar role (potencialmente destrutivo) — considere modal quando virar dor.

## Próximo sprint

**Sprint 20 — DOC**: consolidação do ciclo 4 (S16..S19).
