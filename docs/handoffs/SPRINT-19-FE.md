---
agent: FE
sprint: "19"
date: 2026-05-21
---

# Handoff — Sprint 19 (FE) → Sprint 20 (DOC)

## Resumo

FE entregou as duas telas pedidas pelo produto após BE17/IN18:

1. **Users** — `/users` (lista com filtros), `/users/novo` (form de criação), `/users/:id` (detalhe + edit + soft-delete + atalho de agenda quando role inclui VISTORIADOR).
2. **Agenda do vistoriador** — `/vistoriadores/:id/agenda` (lista de slots no período com toggle de disponibilidade, criação de slot e remoção).

Navegação atualizada: novo item "Usuários" na sidebar com ícone `Users` do `lucide-react`.

Próximo agente é o **DOC** (Sprint 20).

## Entregas

### 1. Feature Users

[`apps/web/src/features/users/`](../../apps/web/src/features/users/):

```
services/
  users.service.ts          ← list, get, create, update, deactivate
                              (todos validam resposta com Zod schemas
                              de @vistoria/api-contracts)
hooks/
  use-users.ts              ← useQuery paginado com keepPreviousData
  use-user.ts               ← useQuery detalhado
  use-create-user.ts        ← useMutation → navigate /users/:id em sucesso
  use-update-user.ts        ← useMutation parcial + invalidate list
  use-deactivate-user.ts    ← useMutation soft-delete
components/
  UserForm.tsx              ← React Hook Form + Zod (CreateUserRequestSchema)
                              5 roles via checkboxes (Controller)
UsersListPage.tsx           ← tabela com filtros (q, role, active-only)
                              botão "Novo usuário" → /users/novo
                              link "Agenda" só aparece para role VISTORIADOR
NewUserPage.tsx             ← wrapper com card "Dados do usuário"
UserDetailPage.tsx          ← edit (name/password/roles) + card de desativação
                              atalho "Abrir agenda" quando role inclui VISTORIADOR
```

Comportamento:

- **Filtros**: `q` em e-mail/name, `role` selecionável, checkbox "apenas ativos" (default `true`).
- **Form de criação**: email, name, password (mínimo 8), roles (multi-select via checkboxes — `VISTORIADOR` default), `active` (sempre true no form; pode ser desativado no detalhe).
- **Edit**: campos opcionais; senha em branco mantém hash anterior; visual mostra "Alterações salvas" quando sucesso.
- **Desativação**: botão destrutivo com cópia explicando soft-delete; idempotente (mostra "já inativo").

### 2. Feature Agenda

[`apps/web/src/features/agenda/`](../../apps/web/src/features/agenda/):

```
services/
  agenda.service.ts         ← list / create (bulk) / update / delete
hooks/
  use-agenda-slots.ts       ← useQuery com filtros from/to/disponivel
  use-create-agenda-slots.ts ← useMutation bulk
  use-update-agenda-slot.ts ← useMutation patch (suporta toggle disponivel)
  use-delete-agenda-slot.ts ← useMutation delete
components/
  AddSlotForm.tsx           ← form 1-slot com datetime-local x2
                              checkbox disponivel + motivo opcional
  SlotRow.tsx               ← linha da tabela com badge status,
                              botão "Bloquear/Liberar", confirm de delete
VistoriadorAgendaPage.tsx   ← layout 2 colunas:
                              esquerda: filtro from-to + tabela de slots
                              direita: card "Novo slot" com AddSlotForm
```

UX:

- **Filtro de período** com inputs `<input type="date">` (default: mês atual). Converte para `inicio` ISO via `T00:00:00` e `T23:59:59`.
- **Sumário** acima da tabela: total / disponíveis / bloqueados (cores semânticas).
- **Slot row** mostra janela formatada `pt-BR` (compacto quando mesmo dia), badge de status, motivo opcional, e dois botões — toggle de disponibilidade (publica PATCH inline) e remoção com confirm 2-cliques (`confirmDelete` state).
- **AddSlotForm** cria 1 slot por vez (UX mais previsível para v1); bulk até 200 slots está disponível na API direto se o produto pedir UI de janela recorrente.

V1 deliberadamente **sem calendário visual** — tabela com filtro de período cobre o caso de uso atual (gestor cadastra disponibilidade pontual). Migração para `react-big-calendar` ou grid CSS semana×hora fica para sprint futura quando o volume de slots tornar a tabela difícil de ler.

### 3. Navegação e rotas

[`apps/web/src/routes.tsx`](../../apps/web/src/routes.tsx):

- 4 rotas novas dentro de `RequireAuth` + `AdminLayout`:
  - `/users` → `UsersListPage`
  - `/users/novo` → `NewUserPage`
  - `/users/:id` → `UserDetailPage`
  - `/vistoriadores/:id/agenda` → `VistoriadorAgendaPage`

[`apps/web/src/layouts/AdminLayout.tsx`](../../apps/web/src/layouts/AdminLayout.tsx):

- Item de menu novo "Usuários" entre "Vistorias" e "Auditoria", ícone `Users`.
- Rodapé atualizado para `v0.0.0 — Sprint 19`.

## Endpoints consumidos

Sem novos endpoints — todos vêm do BE17:

- `GET /api/v1/users` + `POST` + `GET/:id` + `PATCH/:id` + `DELETE/:id`.
- `GET /api/v1/vistoriadores/:id/agenda` + `POST` + `PATCH/:slotId` + `DELETE/:slotId`.

## Testes

- **Unit (`apps/web`)**: 19 testes — mantém. Não adicionei specs novos para a feature de Users/Agenda nesta sprint (cobertura existente cobre o `apiClient`/refresh + componentes base). Futura sprint QI pode adicionar specs unitários se virar pedido.
- **Lint**: `pnpm --filter @vistoria/web lint` passa (mantém o único warning pré-existente em `button.tsx`).
- **Typecheck**: `pnpm typecheck` verde em 6 workspaces.

## Breaking changes

Nenhum. Telas novas adicionadas sem alterar comportamento das existentes.

## Métricas

- 14 arquivos novos em `apps/web/src/features/users/` e `apps/web/src/features/agenda/`.
- 2 arquivos alterados (`routes.tsx`, `layouts/AdminLayout.tsx`).
- 1 item novo de navegação ("Usuários").
- 4 rotas novas no router.
- 0 dependências novas no `package.json` (UI primitivos reusam Card/Input/Button/Badge/Skeleton/Label/Select; sem bibliotecas externas de calendário).

## Decisões táticas (sem ADR)

- **Sem `react-big-calendar` na v1** — tabela com filtro de período é mais simples, sem nova dep, e cobre o caso típico (gestor cadastra slots pontuais). Quando o volume crescer, avalia-se calendário visual.
- **Toggle de disponibilidade inline** (botão "Bloquear/Liberar") — UX mais rápida que abrir um form de edit; a operação cabe em 1 click.
- **AddSlotForm 1-slot por vez** — bulk fica para uma UI mais especializada (janelas recorrentes). Hoje a complexidade de UX não justifica.
- **Roles como checkboxes** (em vez de select multi-line) — visual mais claro; 5 roles cabem confortavelmente.
- **Atalho "Agenda" só para users com role VISTORIADOR** — evita confusão ao tentar abrir agenda de um ADMIN/CLIENTE.

## Para outros agentes

### DOC (Sprint 20)

- Consolidar changelogs SPRINT-16..S19.
- Atualizar `c4-container.md` com:
  - Endpoints novos do BE17 (Users + Agenda) na seção "Fluxos atuais".
  - Telas novas do FE19 na descrição dos containers.
  - Última seta cinza `api → rmq publish vistoria.routed` continua aberta (BE17 não atacou; agent-sync IN→BE da S13 segue válido).
- Atualizar README raiz com endpoints + telas + KPIs (S14).
- ADR opcional sobre slot único com flag `disponivel` se ficar dúvida do design.

### BE (Sprint 21 ou patch)

- Publicar `vistoria.routed` per agent-sync S13. Fecha a cadeia async completa.
- Avaliar integração routing↔agenda quando produto pedir atribuição automática de vistoriador no `agendar()`.

### IN (Sprint 22)

- Quando BE publicar `vistoria.routed` com `vistoriadorId`, `InternoProvider.agendar()` pode persistir o `vistoriadorId` na publicação do `vistoria.status.changed` para o BE consumer aplicar como `vistoria.vistoriadorId`. Não é trabalho desta sprint.

### QI (Sprint 21 com BE)

- Adicionar E2E para o fluxo `/users/novo` → criar vistoriador → `/vistoriadores/:id/agenda` → cadastrar slot → ver na lista. Cobertura browser-based via `admin-ui.spec.ts` ou spec dedicada.

## Validação executada

| Comando                                       | Resultado                                                               |
| --------------------------------------------- | ----------------------------------------------------------------------- |
| `pnpm typecheck`                              | ✅ 6 workspaces, 0 erros                                                |
| `pnpm --filter @vistoria/web lint`            | ⚠️ 1 warning pré-existente em `button.tsx` (cosmético, não introduzido) |
| `pnpm --filter @vistoria/web test`            | ✅ 6 suites, 19 testes (sem regressão)                                  |
| `pnpm --filter @vistoria/api-contracts build` | ✅ dist atualizado                                                      |

## Known Issues

Herdadas:

1. **BE ainda não publica `vistoria.routed`** — agent-sync S13.
2. **Refresh em `localStorage`** — vulnerável a XSS; cookie httpOnly em ADR futuro.
3. **DLX sem alarme em DLQ size > 0** — espera Prometheus.
4. **Slot não detecta sobreposição** (S17 BE) — aceitável v1.
5. **Lint warning em `button.tsx`** — cosmético.

Novas:

6. **Sem testes unitários de Users/Agenda no FE** — cobertura confiou no contrato Zod + typecheck + E2E do BE17. Vale criar specs quando surgir regressão real.
7. **Tabela de slots não pagina** — quando vistoriador tiver muitos slots no período, a tabela cresce sem limite. v1 aceitável; paginação fica para futuro.
8. **`UserForm` cria sempre com `active: true`** — sem campo no form. Desativação acontece no detalhe.
9. **Sem confirmação antes de salvar troca de roles** — mudança de role pode ser destrutiva (perda de acesso). Considere modal de confirmação no detalhe quando virar dor.

## Próximo Sprint

**Sprint 20 — DOC**: consolidação do ciclo 4 (S16..S19). Changelogs + C4 + README. Última seta cinza no C4 segue aberta esperando BE publicar `vistoria.routed` no próximo ciclo.
