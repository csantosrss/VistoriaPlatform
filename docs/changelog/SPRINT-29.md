# Sprint 29 — Changelog

**Período**: 2026-05-26
**Agente solo**: FE (quarta volta do ciclo 6)
**Tema**: Calendário mensal da Agenda — fechamento da feature do ciclo.

## Itens entregues

### 1. `features/agenda/` reescrita

Estrutura nova:

```
features/agenda/
  AgendaPage.tsx                ← orquestra tudo
  lib/
    month-grid.ts               ← buildMonthGrid, computeMonthStats
    month-grid.test.ts          ← 8 testes unitários
  components/
    MonthCalendar.tsx           ← grid 7x6, navegação mês +/–
    DayDrawer.tsx               ← painel lateral, seleção múltipla
    BulkBlockDialog.tsx         ← modal "Bloquear período"
    AgendaStats.tsx             ← 4 KPIs + mini-barras CSS
    VistoriadorPicker.tsx       ← select via useUsers(VISTORIADOR)
  hooks/
    use-agenda-slots.ts         (existente)
    use-create-agenda-slots.ts  (existente)
    use-update-agenda-slot.ts   (existente)
    use-delete-agenda-slot.ts   (existente)
    use-bulk-block-agenda.ts    (novo)
    use-bulk-update-agenda.ts   (novo)
    use-bulk-delete-agenda.ts   (novo)
  services/
    agenda.service.ts           ← + bulkBlock/bulkUpdate/bulkDelete
```

### 2. Rotas + sidebar

- **`/agenda` (nova)** — ADMIN/GESTOR escolhe vistoriador via dropdown;
  VISTORIADOR puro (sem ADMIN/GESTOR) cai direto na própria agenda
  via `useMe()`.
- `/vistoriadores/:id/agenda` (existente) — agora aponta para a mesma
  `AgendaPage` com id pré-selecionado pela URL.
- Item "Agenda" no `AdminLayout` (ícone `CalendarDays`).

### 3. UX por destaque

- Calendário mensal 7×6 com badges `N livre(s)` (verde) e `N bloq.`
  (rosa) por dia; "Hoje" circulado em primary; navegação Hoje / `<` /
  `>`.
- Drawer do dia com tabela, checkbox-all, form inline "+ Novo slot"
  (defaults `08:00/09:00` do dia clicado), barra de ações em massa
  (`Bloquear` / `Liberar` / `Remover`) — todas via **1 request bulk**.
- Modal "Bloquear período" com `from/to/motivo`, defaults preenchidos
  com o intervalo do mês visível. Chama `POST :bulk-block` e exibe
  `affectedCount` e `excluded` retornados pelo BE.
- 4 KPIs no topo (Slots no mês, Disponíveis %, Bloqueados, mini-barras
  por dia da semana — CSS puro, sem Recharts).

### 4. Componentes antigos removidos

- `VistoriadorAgendaPage.tsx`
- `components/AddSlotForm.tsx`
- `components/SlotRow.tsx`

(Reescritos dentro do `DayDrawer` / `AgendaPage`.)

### 5. Testes E2E destravados

- [`e2e/agenda-calendar-ui.spec.ts`](../../e2e/agenda-calendar-ui.spec.ts) —
  **4 `test.fixme()` removidos**. Setup de slots pré-existentes via
  API REST direta antes de exercitar UI.
- [`e2e/users-agenda-ui.spec.ts`](../../e2e/users-agenda-ui.spec.ts) —
  primeiro case (caminho da agenda) atualizado para a UI nova;
  segundo case (filtro "apenas ativos", sem agenda) intacto.

### 6. Testes unitários

`features/agenda/lib/month-grid.test.ts`: 8 testes do helper puro.
Atende **parcialmente** o pendente herdado do S25 (sem testes
unitários de Users/Agenda/Cobertura no FE) — agenda agora tem.

## ADRs criados

Nenhum diretamente no S29.

## Breaking changes

Nenhum no contrato HTTP; UI da agenda substituída por experiência nova.

## Métricas

- **27 testes em 7 suites** no `@vistoria/web` (era 19 em 6) — **+8**.
- 36 testes Playwright em 10 arquivos (sem mudança numérica vs S26;
  4 `fixme` ativados).
- 0 dependências novas no `apps/web`.
- 1 rota nova (`/agenda`); 3 arquivos removidos; 8 arquivos novos.

## Próximo sprint

**Sprint 30 — DOC**: consolidação documental do ciclo 6.
