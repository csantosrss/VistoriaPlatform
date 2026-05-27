---
agent: FE
sprint: "29"
date: 2026-05-26
---

# Handoff — Sprint 29 (FE) → Sprint 30 (DOC)

## Resumo

Fecha o ciclo 6 entregando a **tela de calendário da Agenda** que motivou
todo o ciclo. Implementada agora pelo trilho correto (com critérios do
QI Sprint 26, bulk endpoints do BE Sprint 27, port para vistoriador
logado do IN Sprint 28), no lugar do código FE que foi escrito fora do
protocolo no início e revertido.

Próximo agente é o **DOC** (Sprint 30).

## Entregas

### 1. `features/agenda/` reescrita do zero

```
features/agenda/
  AgendaPage.tsx                ← orquestra calendário + drawer + KPIs + bulk
  lib/
    month-grid.ts               ← buildMonthGrid, computeMonthStats, helpers ISO
    month-grid.test.ts          ← 8 testes unitários (puro)
  components/
    MonthCalendar.tsx           ← grid 7x6, navegação mês +/–, badges por dia
    DayDrawer.tsx               ← painel lateral, seleção múltipla, form inline
    BulkBlockDialog.tsx         ← modal "Bloquear período" — 1 request bulk-block
    AgendaStats.tsx             ← 4 KPIs (cards + mini-barras CSS por dia da semana)
    VistoriadorPicker.tsx       ← select nativo via useUsers(VISTORIADOR)
  hooks/
    use-agenda-slots.ts         ← (existente)
    use-create-agenda-slots.ts  ← (existente)
    use-update-agenda-slot.ts   ← (existente)
    use-delete-agenda-slot.ts   ← (existente)
    use-bulk-block-agenda.ts    ← (novo) consome POST :bulk-block
    use-bulk-update-agenda.ts   ← (novo) consome POST :bulk-update
    use-bulk-delete-agenda.ts   ← (novo) consome DELETE :bulk-delete
  services/
    agenda.service.ts           ← + bulkBlockAgenda / bulkUpdateAgenda / bulkDeleteAgenda
```

### 2. Rotas + sidebar

- `/agenda` (nova) → ADMIN/GESTOR escolhe vistoriador via dropdown;
  **VISTORIADOR puro** (sem ADMIN/GESTOR) cai direto na própria agenda
  via `useMe()` (RBAC BE do S27 garante o servidor).
- `/vistoriadores/:id/agenda` (existente) → aponta para a mesma
  `AgendaPage`, pré-selecionando o id pela URL — preserva deep-link da
  lista de usuários.
- Item "Agenda" no `AdminLayout` (ícone `CalendarDays`).

### 3. UX por destaque

- **Calendário mensal 7×6** com badges `N livre(s)` (verde) e `N bloq.`
  (rosa) por dia; "Hoje" circulado em primary; dias fora do mês em
  cinza. Click seleciona o dia (ring primary). Navegação Hoje / `<` /
  `>`.
- **Drawer do dia**: tabela com checkbox-all, status (`Livre`/`Bloqueado`),
  motivo, e botão `+ Novo slot neste dia` que abre form inline com
  defaults `08:00/09:00` do dia clicado. Quando ≥1 slot está
  selecionado, aparece barra com Bloquear / Liberar / Remover, todas
  via **1 request bulk** (não mais N PATCHes). Mostra resposta
  `{ affectedCount, excluded? }` do BE.
- **Modal "Bloquear período"** (botão no header): from/to/motivo,
  defaults preenchidos com o intervalo do mês visível. Chama
  `POST :bulk-block` que devolve `BulkOpResponse` — exibe
  `affectedCount` e primeiro `excluded.reason` se houver.
- **KPIs**: Slots no mês, Disponíveis (% do total), Bloqueados, mini-barras
  CSS por dia da semana (sem Recharts — evita dep nova).

### 4. Removidos

- `apps/web/src/features/agenda/VistoriadorAgendaPage.tsx`
- `apps/web/src/features/agenda/components/AddSlotForm.tsx`
- `apps/web/src/features/agenda/components/SlotRow.tsx`

Reescritos dentro do `DayDrawer` e `AgendaPage`.

### 5. Testes E2E destravados/ajustados

- `e2e/agenda-calendar-ui.spec.ts` (contrato do QI S26): **4 cases
  `fixme` removidos**; agora todos ativos. Setup de slots pré-existentes
  é feito via API REST direta (POST `/api/v1/vistoriadores/:id/agenda`)
  antes de exercitar UI. Cobertura:
  1. Dropdown vistoriador → click dia → drawer → "+ Novo slot" → badge
     "1 livre" no dia.
  2. Setup 2 slots via API → drawer → "Selecionar todos" → "Bloquear"
     (bulk-update 1 request) → calendário mostra "2 bloq.".
  3. Setup 1 slot via API → header "Bloquear período" → modal → confirma
     → dialog mostra "1 slot bloqueado".
  4. Deep-link `/vistoriadores/:id/agenda` renderiza sem dropdown.
- `e2e/users-agenda-ui.spec.ts` (era teste da UI antiga): primeiro
  case atualizado para a UI nova (clica dia, abre drawer, cria slot
  com badge "Livre"). Segundo case (filtro "apenas ativos") **não
  toca agenda** — mantido idêntico.
- Total Playwright: **36 testes em 10 arquivos** (sem mudança numérica
  vs. S26 — só ativação de fixmes e ajuste de seletores).

### 6. Testes unitários

`features/agenda/lib/month-grid.test.ts`: **8 testes** — grid sempre
com 42 células, agrupamento por dia local + ordenação por inicio, KPIs
só do mês corrente, `toIsoDay` com pad de zeros, etc.

Atende **parcialmente** o pendente herdado do S25 _"sem testes
unitários de Users/Agenda/Cobertura no FE"_ — agenda agora tem; Users e
Cobertura seguem em aberto.

## Mudanças que tocam o usuário

- **Tela de Agenda totalmente reformulada** — tabela linear vira
  calendário mensal estilo Google.
- **Vistoriador logado agora vê a própria agenda em `/agenda`** (RBAC
  BE liberado no S27).
- **Bloqueio em lote sem fricção** — antes era "PATCH um por vez";
  agora é "selecionar período → 1 click → transação no BE".

## Para outros agentes

### DOC (Sprint 30 — fechamento do ciclo 6)

Pendentes para consolidar:

1. **Changelogs**: `SPRINT-26.md` (QI), `SPRINT-27.md` (BE),
   `SPRINT-28.md` (IN), `SPRINT-29.md` (FE).
2. **ADRs candidatos do ciclo**:
   - Exposição do `/metrics` sem auth (BE S27) — network policy vs basic auth.
   - `VistoriaReaderPort` como padrão BE→IN (IN S28) — par do
     `VistoriaStatusWriterPort` (ADR S13).
   - `IntegrationsModule.forRoot(options)` ganhou parâmetro — registrar
     como decisão de DI.
3. **C4 container** (`docs/architecture/c4-container.md`):
   - `apps/api` ganha containers `Metrics` e `VistoriaReaderAdapter`.
   - Prometheus aponta para `/metrics`.
   - `apps/web` ganha `AgendaPage` (substitui `VistoriadorAgendaPage`).
4. **README raiz**: 3 endpoints bulk de agenda; `/metrics`;
   `InternoProvider.consultar` funcional; rota nova `/agenda`.
5. **Marcar pendentes como resolvidos**: bulk endpoints da agenda,
   `/metrics`, port BE→IN `consultar()`.
6. **Registrar transparentemente o desvio inicial** do ciclo (FE
   implementou fora de ordem, foi revertido, ciclo correto rodou) — vale
   uma nota de processo no changelog.

### QI (Sprint 31 — abertura do ciclo 7)

Pedidos abertos para o próximo ciclo:

- Cookie httpOnly + persistência server-side do refresh (segurança).
- Testes unitários FE de Users e Cobertura (Agenda já tem).
- Detector de sobreposição de slots (BE) — slot da agenda nunca foi
  validado contra colisão.
- Lint warning em `button.tsx` (cosmético, persiste).
- `event-flow.md` desatualizado (DOC pode fazer no S30).
- `/metrics` sem auth — decisão pendente.

## Validação executada

| Comando                                 | Resultado                                                                                                                                                         |
| --------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm --filter @vistoria/web typecheck` | ✅                                                                                                                                                                |
| `pnpm --filter @vistoria/web lint`      | ✅ (1 warning preexistente em `button.tsx`)                                                                                                                       |
| `pnpm --filter @vistoria/web test`      | ✅ **27 testes em 7 suites** (era 19; +8 do `month-grid`).                                                                                                        |
| `pnpm playwright test --list`           | ✅ 36 testes em 10 arquivos (sem mudança numérica).                                                                                                               |
| Validação manual no browser             | ⚠️ não executada — depende de Docker + apps de pé. Sugiro `pnpm dev:all` e abrir `/agenda` autenticado como admin e como vistoriador para validar os dois fluxos. |

## Decisões táticas

- **Sem Recharts** — gráfico de barras CSS puro evita nova dep. Já
  havia sido decidido no Sprint 26 QI; mantido aqui.
- **Sem Toast/Sonner** — projeto não tem; mensagens vão inline no
  drawer/dialog. Consistente com `CancelVistoriaForm`/`UserForm` do
  resto do app.
- **`VistoriadorPicker` usa `Select` nativo** (já era padrão do
  projeto). Combobox com filtro fica para quando a lista de
  vistoriadores ficar grande.
- **Spec Playwright cria setup via API** em vez de UI — mais rápido e
  menos brittle que cadastrar 2 slots via 2 cliques no form.

## Known Issues

Cumulativos:

1. BE ainda não publica `vistoria.routed`.
2. Refresh em `localStorage` (XSS).
3. DLX declarado, sem alarme em DLQ size > 0.
4. Sem dedup-by-eventId no consumer.
5. **Slot da agenda não detecta sobreposição** (bug latente — UI
   permite criar 2 slots no mesmo horário).
6. Sem testes unitários de Users/Cobertura no FE (agenda agora tem).
7. Senha em texto plano em `POST /users`.
8. `event-flow.md` desatualizado.
9. Lint warning em `button.tsx`.
10. Cidade/bairro como strings livres no BE.
11. IBGE pode estar fora do ar.
12. Lista de coberturas no FE não tem confirm para deletar.
13. **(Resolvido)** ~~`/metrics` ainda não existe~~ (S27).
14. **(Resolvido)** ~~Bulk endpoints da agenda~~ (S27).
15. **(Resolvido)** ~~Port BE→IN consultar()~~ (S28).
16. Test runner do `api-contracts` quebrado (preexistente).
17. `/metrics` sem auth (ADR pendente — S30).
18. `InternoProvider.consultar()` sem endpoint HTTP no BE.

Novas:

19. **Validação manual no browser pendente** — pipeline de testes
    cobre o caminho, mas o usuário deve abrir `/agenda` em
    `pnpm dev:all` para validar visualmente.

## Próximo Sprint

**Sprint 30 — DOC**: consolidar o ciclo 6 (changelogs, ADRs, C4, README,
notas sobre o desvio inicial).
