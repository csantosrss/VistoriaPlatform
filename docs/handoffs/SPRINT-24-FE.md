---
agent: FE
sprint: "24"
date: 2026-05-21
---

# Handoff — Sprint 24 (FE) → Sprint 25 (DOC)

## Resumo

FE consumiu tudo que BE22 expôs:

1. **Card "Áreas de cobertura"** em `/users/:id` (só para role VISTORIADOR) — lista + form de adicionar com **autocomplete IBGE** (UF select + cidade combobox via `<datalist>`).
2. **`providerId`** no `UserForm` e `UserDetailPage` — select visível **só quando role VISTORIADOR está marcada**, com fallback `interno` no default.
3. **`codigoImovelExterno`** no `VistoriaForm` — campo obrigatório, primeira seção do form.
4. **Filtro `codigoImovelExterno`** na `VistoriasFilters` da lista — input livre que o list query repassa ao BE.

Próximo agente é o **DOC** (Sprint 25).

## Entregas

### 1. Feature `cobertura/`

[`apps/web/src/features/cobertura/`](../../apps/web/src/features/cobertura/):

```
services/
  cobertura.service.ts          ← list / create / delete (Zod-strict)
hooks/
  use-coberturas.ts             ← useQuery por userId
  use-create-cobertura.ts       ← useMutation + invalidate
  use-delete-cobertura.ts       ← useMutation + invalidate
  use-ibge-ufs.ts               ← useQuery staleTime: Infinity
  use-ibge-municipios.ts        ← useQuery staleTime: 24h (por UF)
components/
  AddCoberturaForm.tsx          ← UF select + cidade datalist + bairro livre
  CoberturaCard.tsx             ← Card pronto para embed em /users/:id
```

UX:

- UF: `<Select>` populado pelo IBGE (`useIbgeUfs`); fallback para input livre se IBGE estiver fora do ar.
- Cidade: `<input list="municipios-list">` (combobox nativo HTML). Lista filtrada via IBGE `/estados/{UF}/municipios`. Cidade desabilitada até UF estar set.
- Bairro: input livre. Desabilitado até cidade estar preenchida.
- Help text inline: _"Vazio = cobre toda a UF. Digite para escolher uma cidade específica."_
- Erros 409 do BE aparecem como texto vermelho com a mensagem do servidor (cita qual regra existente bloqueia).
- Lista de coberturas existentes mostra badge de escopo (`UF inteira` / `Cidade` / `Bairro`) e botão de deletar inline.

[`apps/web/src/lib/ibge.ts`](../../apps/web/src/lib/ibge.ts):

- `listUfs()`: cache `localStorage` (key `ibge.ufs.v1`) + fetch como fallback.
- `listMunicipios(uf)`: fetch direto; cache via Tanstack Query no hook.

### 2. `providerId` em Users

[`apps/web/src/features/users/components/UserForm.tsx`](../../apps/web/src/features/users/components/UserForm.tsx):

- `useWatch` em `roles` para detectar VISTORIADOR.
- Select `providerId` (3 opções) só renderizado quando VISTORIADOR está marcado.
- Default: `interno`.
- No submit, força `providerId: null` quando role final não inclui VISTORIADOR (alinhado com BE: campo só faz sentido para VISTORIADOR).

[`apps/web/src/features/users/UserDetailPage.tsx`](../../apps/web/src/features/users/UserDetailPage.tsx):

- Badge `<providerId>` na header (junto do Ativo/Inativo).
- Select `providerId` no form de edit (só quando VISTORIADOR).
- Patch parcial — só envia `providerId` quando muda.
- **Embed do `CoberturaCard`** (lg:col-span-3) só para role VISTORIADOR.

### 3. `codigoImovelExterno` em Vistoria

[`apps/web/src/features/vistorias/components/VistoriaForm.tsx`](../../apps/web/src/features/vistorias/components/VistoriaForm.tsx):

- Nova seção "Identificação" no topo do form — `codigoImovelExterno` à esquerda + `tipo` à direita.
- Required (Zod via `CreateVistoriaRequestSchema`).
- Placeholder: `Ex.: IMV-2026-001`.

[`apps/web/src/features/vistorias/components/VistoriasFilters.tsx`](../../apps/web/src/features/vistorias/components/VistoriasFilters.tsx):

- Input livre `Código do imóvel` ao lado dos filtros existentes. Valor vai para a query string `?codigoImovelExterno=`. Match exato no BE.

## Endpoints consumidos

Sem novos — todos vêm de BE22:

- `GET/POST/DELETE /api/v1/users/:id/cobertura`.
- `POST/PATCH /api/v1/users` com `providerId`.
- `POST /api/v1/vistorias` com `codigoImovelExterno`.
- `GET /api/v1/vistorias?codigoImovelExterno=...`.
- IBGE público: `/api/v1/localidades/estados` e `/api/v1/localidades/estados/:uf/municipios`.

## Testes

- 19 unit (mantém — sem regressão).
- Sem novos specs unitários — UI de cobertura/IBGE depende de fetch externo + datalist; vale spec quando o produto pedir cobertura mais sofisticada (ex.: drag & drop de regiões).
- Typecheck verde em 6 workspaces. Lint apenas o warning pré-existente em `button.tsx`.

## Breaking changes

- **`VistoriaForm` agora exige `codigoImovelExterno`** — sem isso, Zod resolver rejeita antes do submit. Casos automáticos de teste/seed que omitiam o campo precisarão preencher (já atualizado E2E S22).
- **`UserForm` envia `providerId: null` quando role final não inclui VISTORIADOR** — alinha com BE (que já normalizava no service); evita inconsistência.

## Métricas

- 9 arquivos novos em `apps/web/src/features/cobertura/`.
- 1 arquivo novo em `apps/web/src/lib/ibge.ts`.
- 4 arquivos alterados (UserForm, UserDetailPage, VistoriaForm, VistoriasFilters).
- 0 dependências novas (datalist nativo + fetch nativo cobrem IBGE).
- 19 unit tests (mantém).

## Decisões táticas (sem ADR)

- **`<input list="datalist">` nativo HTML em vez de combobox custom** — UX bom o suficiente, zero dep, acessível. Quando o produto pedir filtros mais sofisticados (busca fonética, paginação), trocar.
- **IBGE chamado direto do navegador** (sem proxy no BE) — API pública com CORS aberto. Documentação `docs/architecture/ibge-integration.md` (S21) registra o trade-off (rate-limit do IBGE; mitigação futura via Redis).
- **Cobertura embed no `/users/:id`, não tela própria** — produto preferiu (S21 AskUserQuestion). Mantém todo o cadastro do vistoriador num lugar só.
- **`providerId` no `UserForm` faz `useWatch` para mostrar/esconder** — alternativa (sempre mostrar mas habilitar quando VISTORIADOR) ficou menos limpa.
- **Patch parcial no `UserDetailPage`** — só envia `providerId` no body quando muda. Reduz ruído nos audit logs `USER.UPDATED`.

## Para outros agentes

### DOC (Sprint 25)

- Consolidar S21..S24.
- Atualizar `c4-container.md`:
  - Container `apps/web` ganha menção a "consome IBGE para autocomplete de cidade".
  - Fluxos atuais: linha nova para `/users/:id/cobertura` CRUD.
- README com endpoints novos.
- ADR opcional sobre IBGE como source-of-truth.

### BE (Sprint 26+)

- Publicar `vistoria.routed` per agent-sync S13. Quando publicar, idealmente populando `vistoriadorId` quando routing futuro escolher vistoriador específico (cruzando cobertura + agenda).
- Endpoint dedicado de reset de senha (evita plain-text no PATCH).
- Considerar normalização de cidade/bairro no BE quando virar dor de routing.

## Validação executada

| Comando                            | Resultado                                  |
| ---------------------------------- | ------------------------------------------ |
| `pnpm typecheck`                   | ✅ 6 workspaces                            |
| `pnpm --filter @vistoria/web test` | ✅ 6 suites, 19 testes                     |
| `pnpm --filter @vistoria/web lint` | ⚠️ 1 warning pré-existente em `button.tsx` |

## Known Issues

Cumulativos:

1. BE ainda não publica `vistoria.routed`.
2. Refresh em `localStorage`.
3. DLX sem alarme em DLQ.
4. Sem dedup-by-eventId.
5. Slot da agenda não detecta sobreposição.
6. Sem testes unitários de Users/Agenda/Cobertura no FE.
7. Senha plain-text em POST/PATCH /users.
8. Lint warning em `button.tsx`.
9. Cidade/bairro como strings livres no BE (acentos podem divergir entre Vistoria e Cobertura).

Novas:

10. **IBGE pode estar fora do ar** — `AddCoberturaForm` cai em fallback de input livre para UF, mas não para cidade (datalist some). Cidade pode ser digitada manualmente; bairro idem. Se IBGE virar dor recorrente, proxy + cache no BE.
11. **Lista de coberturas não tem confirm para deletar** — uma click só. Cobertura é fácil de recriar; aceitável v1.

## Próximo Sprint

**Sprint 25 — DOC**: fechamento do ciclo 5 (S21..S24).
