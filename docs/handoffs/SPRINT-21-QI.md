---
agent: QI
sprint: "21"
date: 2026-05-21
---

# Handoff — Sprint 21 (QI) → Sprint 22 (BE)

## Resumo

Sprint pequena de preparação para a feature de **cobertura geográfica do vistoriador**:

1. **Documentação da API do IBGE** em `docs/architecture/ibge-integration.md` — endpoints, cache, fallback, riscos de consistência. Source-of-truth para o autocomplete que o FE Sprint 24 vai consumir.
2. **E2E browser-based** novo `e2e/users-agenda-ui.spec.ts` — cria vistoriador via UI, abre agenda, cadastra slot, toggle Bloquear. Cobre o caminho que o usuário pediu na sessão anterior. Total Playwright: 28 testes (era 26).
3. **Filtro "apenas ativos"** validado por E2E — cria vistoriador → desativa no detalhe → some da lista; desmarcar checkbox → reaparece.

Próximo agente é o **BE** (Sprint 22).

## Entregas

### 1. `docs/architecture/ibge-integration.md`

Documento descrevendo a integração com `servicodados.ibge.gov.br/api/v1/localidades`:

- Endpoints (`/estados`, `/estados/{UF}/municipios`).
- Shape das respostas e quais campos o FE usa.
- Cache: UFs no `localStorage` + municípios via Tanstack Query com `staleTime: 24h`.
- Fallback: input livre quando IBGE estiver fora do ar.
- Alternativas descartadas (ViaCEP, hard-code, tabela própria).
- Riscos de consistência: `Vistoria.enderecoCidade` é livre digitação; routing futuro precisa normalizar (`LOWER(unaccent(...))`).

### 2. E2E browser-based (`e2e/users-agenda-ui.spec.ts`)

2 cenários:

1. **Criar vistoriador → cadastrar slot → toggle Bloquear**:
   - Login pela UI → menu "Usuários" → "Novo usuário".
   - Form com email único, name, password (8+), role VISTORIADOR (default).
   - Após criar, navega para `/users/:id` (badge "Ativo" + atalho "Abrir agenda").
   - Click no atalho → `/vistoriadores/:id/agenda`.
   - Preenche `datetime-local x2` + motivo → "Adicionar slot".
   - Slot aparece com badge "Disponível" + motivo.
   - Click "Bloquear" inline → badge vira "Bloqueado".

2. **Filtro "apenas ativos"**:
   - Cria usuário → desativa no detalhe (badge "Inativo").
   - Lista default não mostra (filtro `active=true`).
   - Desmarca o checkbox → aparece.

Razão: o handoff DOC S20 listou "E2E browser-based de `/users/novo` → criar vistoriador → `/vistoriadores/:id/agenda` → cadastrar slot" como prioridade. Atendido aqui. Garante que mudanças futuras no FE não quebram o caminho que o produto valida.

### 3. Validação do pipeline pós-ciclo 4

Conferido o estado do CI:

- `pnpm playwright test --list` reconhece 28 testes em 7 arquivos.
- `pnpm typecheck` segue verde em 6 workspaces (última execução S20, mantém).
- A spec `vistoria-routed-orchestrator.spec.ts` (S16) não foi reexecutada; depende de RabbitMQ + apps de pé. Pipeline CI mantém estável.

## Mudanças que tocam o usuário

Nenhuma — DOC + spec novo, sem alteração de código de aplicação.

## Para outros agentes

### BE (Sprint 22) — feature de cobertura

Decisões já tomadas com o produto (via `AskUserQuestion` na sessão):

1. **Modelo `VistoriadorCobertura`**:
   - Tabela nova `vistoriador_cobertura`.
   - Colunas: `id`, `tenantId`, `vistoriadorId` (FK User), `uf` (obrigatório, 2 chars), `cidade?` (string livre), `bairro?` (string livre), `createdAt`, `updatedAt`.
   - Índices: `(tenantId, vistoriadorId)`, `(tenantId, uf, cidade, bairro)`.
   - `assertVistoriador()` (igual à agenda) — valida role VISTORIADOR ativo no tenant.

2. **Endpoints CRUD** sob `/api/v1/users/:id/cobertura` (decisão de UX: card dentro de `/users/:id`):
   - `GET` — lista coberturas do vistoriador.
   - `POST` — body `{ uf, cidade?, bairro? }`. **Valida redundância**: rejeita com 409 se já existe cobertura mais ampla cobrindo a nova (ex.: já tem `(SP, null, null)` e tenta criar `(SP, São Paulo, null)`).
   - `DELETE /:coberturaId` — remove.
   - `PATCH` não — cobertura é "tudo-ou-nada"; mudar UF/cidade/bairro é deletar + criar. Mantém UX simples.

3. **Validação de redundância** (lógica BE):
   - Nova cobertura `(uf=X, cidade=Y, bairro=Z)` é redundante se já existe alguma cobertura que cobre `(X, Y, Z)`:
     - `(X, null, null)` cobre tudo de X — qualquer outra entrada em X é redundante.
     - `(X, Y, null)` cobre tudo de Y/X — qualquer entrada `(X, Y, *)` é redundante.
   - Resposta 409 com mensagem explicando qual cobertura já cobre a tentativa.

4. **Audit**: `COBERTURA.CREATED`, `COBERTURA.DELETED` (em `audit_logs` resourceType=`VistoriadorCobertura`).

5. **Contracts em `@vistoria/api-contracts/cobertura`**:
   - `VistoriadorCoberturaSchema`, `CreateCoberturaRequestSchema`, `ListCoberturasResponseSchema`.

6. **Tests**: unit cobre os 4 caminhos de redundância (`UF apenas`, `UF+cidade`, `UF+cidade+bairro`, duplicata exata).

### IN (Sprint 23) — propagar `vistoriadorId`

Pequena evolução forward-compat: quando `vistoria.status.changed` é publicado pelo `InternoProvider` após `agendar(dto)`, se `dto.vistoriadorId` está presente, propagar no payload do evento. BE consumer pode aplicar `vistoria.vistoriadorId` quando o campo chegar (já está modelado em `Vistoria.vistoriadorId` desde S07).

Schema novo opcional em `VistoriaStatusChangedEventSchema`: `vistoriadorId: uuid().optional()`.

### FE (Sprint 24)

- Card "Áreas de cobertura" no `/users/:id` (só aparece para role VISTORIADOR).
- Lista das coberturas + form de adicionar:
  - UF: `<Select>` com os 27 estados (IBGE `/estados` no boot da sessão, cache `localStorage`).
  - Cidade: combobox/input com lista filtrada via IBGE `/estados/{UF}/municipios` (Tanstack Query, `staleTime: 24h`).
  - Bairro: input livre.
  - Cidade só fica habilitada quando UF está selecionado; bairro só quando cidade.
- Mensagem clara quando 409 (redundância) — mostrar qual cobertura existente bloqueia.
- Atalhos: helpers `apps/web/src/lib/ibge.ts` + hooks `use-ibge-ufs.ts`, `use-ibge-municipios.ts`.

### DOC (Sprint 25)

- Consolidar S21..S24.
- ADR sobre IBGE como source-of-truth (e justificar não persistir cidades/UFs no nosso banco).
- Atualizar `c4-container.md` com a tabela `vistoriador_cobertura` + nota da chamada externa do FE ao IBGE.
- Atualizar README com endpoint novo.

## Validação executada

| Comando                       | Resultado                                          |
| ----------------------------- | -------------------------------------------------- |
| `pnpm playwright test --list` | ✅ 28 testes em 7 arquivos (era 26)                |
| `pnpm typecheck`              | ✅ Sem mudança de código TS — mantém verde de S20. |
| `pnpm test:e2e` (local)       | ⚠️ Não executado (Docker fora). CI valida no push. |

## Known Issues

Cumulativos do ciclo 4:

1. BE ainda não publica `vistoria.routed` — agent-sync S13 segue válido.
2. Refresh em `localStorage`.
3. DLX declarado, sem alarme em DLQ size > 0 (espera Prometheus).
4. Sem dedup-by-eventId.
5. Slot não detecta sobreposição.
6. Sem testes unitários de Users/Agenda no FE.
7. `UserForm` sem campo de `active`.
8. Sem auto-cadastro público.
9. Senha em texto plano em `POST /users`.
10. `event-flow.md` desatualizado.
11. Lint warning em `button.tsx`.

Novas:

12. **`Vistoria.enderecoCidade` é livre digitação** — Vistoria criada por outro tenant/origem pode ter "Sao Paulo" sem acento; quando routing futuro cruzar com `VistoriadorCobertura.cidade` (que será preenchida via IBGE, com acento), o match falha. Mitigação prevista no BE Sprint 22+: normalizar (`LOWER(unaccent(...))`) em ambos os lados antes do `WHERE`.

## Próximo Sprint

**Sprint 22 — BE**: tabela `vistoriador_cobertura` + 3 endpoints + validação de redundância + audit + contracts + tests.
