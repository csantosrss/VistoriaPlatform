---
agent: BE
sprint: "22"
date: 2026-05-21
---

# Handoff — Sprint 22 (BE) → Sprint 23 (IN)

## Resumo

BE entregou três features de produto pedidas durante o ciclo 5 — todas na camada de dados do vistoriador/vistoria:

1. **`VistoriadorCobertura`** — tabela nova + 3 endpoints sob `/api/v1/users/:id/cobertura` (GET/POST/DELETE). Slot hierárquico `(uf, cidade?, bairro?)` com **redundância bloqueada por 409** em qualquer direção (existente cobre nova OU nova cobre existente).
2. **`Vistoria.codigoImovelExterno`** — coluna nova, **obrigatória** no `CreateVistoriaRequest`, nullable no DB para retro-compat com vistorias pré-S22. Índice `(tenantId, codigoImovelExterno)`. Filtro `?codigoImovelExterno=` na listagem.
3. **`User.providerId`** — coluna nova (`rede-vistorias` | `conceitual` | `interno`). **Obrigatório quando `roles` inclui VISTORIADOR** (validado no service); ignorado para outras roles. `AgendaService.assertVistoriador` e `CoberturaService.assertVistoriador` exigem `providerId` set antes de aceitar slots/coberturas.

Próximo agente é o **IN** (Sprint 23).

## Entregas

### 1. Schema Prisma + migration

[`apps/api/prisma/schema.prisma`](../../apps/api/prisma/schema.prisma):

- `User`: + `providerId String?` + `coberturas VistoriadorCobertura[]` + `@@index([tenantId, providerId])`.
- `Vistoria`: + `codigoImovelExterno String?` + `@@index([tenantId, codigoImovelExterno])`.
- `Tenant`: + relação `coberturas`.
- Novo model `VistoriadorCobertura` com FKs em Tenant e User, índices `(tenantId, vistoriadorId)` e `(tenantId, uf, cidade, bairro)`.

Migration: [`20260521150000_add_cobertura_and_codigo_imovel`](../../apps/api/prisma/migrations/20260521150000_add_cobertura_and_codigo_imovel/migration.sql).

### 2. Módulo cobertura novo

[`apps/api/src/cobertura/`](../../apps/api/src/cobertura/):

- `cobertura.controller.ts` — sob `@Roles(ADMIN, GESTOR)`, path `users/:userId/cobertura`.
- `cobertura.service.ts`:
  - `assertVistoriador(tenantId, vistoriadorId)`: existe + ativo + VISTORIADOR + **providerId set**.
  - `list(actor, vistoriadorId)`: order (uf, cidade, bairro) ASC.
  - `create(actor, vistoriadorId, { uf, cidade?, bairro? })`:
    - Normaliza UF para uppercase, trim em cidade/bairro.
    - Rejeita 400 se `bairro` sem `cidade`.
    - Carrega coberturas existentes da mesma UF; checa `covers(a,b)` em ambas as direções; **rejeita 409** com mensagem `Cobertura conflita com regra existente (...)`.
    - Cria + audit `COBERTURA.CREATED`.
  - `remove(actor, vistoriadorId, coberturaId)` + audit `COBERTURA.DELETED`.
- `cobertura.module.ts` registrado em `app.module.ts` ao lado de Agenda.
- `cobertura.service.spec.ts` (10 testes) — preconditions (404, 400 sem role, 400 sem providerId), create (sucesso, 409 broader cobre, 409 narrower cobre broader, 409 exact dup, OK em UF diferente, 400 bairro sem cidade), remove (sucesso + 404).

Função `covers(a, b)`: `a` cobre `b` quando `a.uf === b.uf` e cada filtro de `a` é `null` ou igual ao de `b`. Detecta overlap em qualquer direção.

### 3. Vistoria.codigoImovelExterno

[`apps/api/src/vistorias/`](../../apps/api/src/vistorias/):

- `CreateVistoriaDto`: + `codigoImovelExterno` (`@IsString @Length(1, 100)`).
- `ListVistoriasQueryDto`: + opcional para filtro exato.
- `VistoriasService.create`: persiste o campo.
- `VistoriasService.list`: aceita filtro `?codigoImovelExterno=X` (exato).
- `toDto(v)` propaga o campo.

[`packages/api-contracts/src/vistoria/dto.ts`](../../packages/api-contracts/src/vistoria/dto.ts):

- `VistoriaSchema.codigoImovelExterno`: nullable (preserva vistorias pré-S22).
- `CreateVistoriaRequestSchema.codigoImovelExterno`: `z.string().min(1).max(100)` **obrigatório**.
- `ListVistoriasQuerySchema.codigoImovelExterno`: opcional.

### 4. User.providerId + invariantes

[`apps/api/src/users/`](../../apps/api/src/users/):

- DTOs (create/update/list) ganham `providerId?` (`@IsIn(['rede-vistorias','conceitual','interno'])`).
- `UsersService.create`: `assertProviderIdRequiredForVistoriador(input.roles, input.providerId)` → 400 se VISTORIADOR sem providerId. Para outras roles, providerId é **forçado a null**.
- `UsersService.update`: calcula `finalRoles` e `finalProviderId` a partir do diff e re-valida. Se update tira VISTORIADOR, providerId vira `null` automaticamente; se input passa `providerId` mas final roles não tem VISTORIADOR, também vira null.
- `UsersService.list`: filtro `?providerId=interno` (exato).
- Audit `USER.CREATED/UPDATED` inclui `providerId` no `before`/`after`.

[`packages/api-contracts/src/users/dto.ts`](../../packages/api-contracts/src/users/dto.ts):

- Novo `ProviderIdSchema` (`z.enum(['rede-vistorias', 'conceitual', 'interno'])`).
- `UserSchema.providerId`: nullable enum.
- `CreateUserRequestSchema`: providerId opcional, mas `.refine` exige quando roles inclui VISTORIADOR.
- `UpdateUserRequestSchema`: providerId opcional (com null permitido).
- `ListUsersQuerySchema`: + providerId.

### 5. Validação em Agenda

[`apps/api/src/agenda/agenda.service.ts`](../../apps/api/src/agenda/agenda.service.ts):

- `assertVistoriador` agora também rejeita 400 se `user.providerId` está null. Mensagem: _"Vistoriador precisa ter `providerId` definido antes de cadastrar agenda. Atualize via PATCH /users/:id."_

### 6. Endpoints novos (resumo)

| Método | Rota                                       | Auth               | Mudança                                          |
| ------ | ------------------------------------------ | ------------------ | ------------------------------------------------ |
| GET    | `/api/v1/users/:id/cobertura`              | JWT (ADMIN/GESTOR) | Lista coberturas do vistoriador (asc).           |
| POST   | `/api/v1/users/:id/cobertura`              | JWT (ADMIN/GESTOR) | `{ uf, cidade?, bairro? }` — 409 em redundância. |
| DELETE | `/api/v1/users/:id/cobertura/:coberturaId` | JWT (ADMIN/GESTOR) | 204.                                             |

Mudanças nos existentes:

- `POST /api/v1/vistorias` agora exige `codigoImovelExterno`. Schema strict no `@vistoria/api-contracts` impede FE de divergir.
- `POST /api/v1/users` agora exige `providerId` quando roles inclui VISTORIADOR.
- `GET /api/v1/users` aceita `?providerId=`.
- `GET /api/v1/vistorias` aceita `?codigoImovelExterno=`.

## Database

- 1 migration nova (`20260521150000_add_cobertura_and_codigo_imovel`).
- ALTER em `vistorias` (+ codigoImovelExterno + index).
- ALTER em `users` (+ providerId + index).
- CREATE TABLE `vistoriador_cobertura` + 2 índices + 2 FKs.

## Testes

- **Unit (`apps/api`)**: **64 testes** (era 49). Cobertura nova:
  - `cobertura.service.spec.ts` (10): preconditions, create (5 cenários incluindo redundância em ambas direções), remove.
  - `users.service.spec.ts` (+3): vistoriador com providerId, 400 sem providerId, GESTOR ignora providerId, update bloqueia mudança para VISTORIADOR sem providerId, update limpa providerId ao tirar VISTORIADOR.
  - `vistorias.service.spec.ts` ajustado: `codigoImovelExterno` nos fixtures.
  - `agenda.service.spec.ts` ajustado: fixture do vistoriador com `providerId: "interno"`.
- **E2E (Playwright)**:
  - `cobertura.spec.ts` novo (2): cria/lista/remove + 409 em redundância (SP wide → SP cidade); 400 quando user não tem providerId.
  - `users-and-agenda.spec.ts` ajustado: todas as criações de VISTORIADOR agora incluem `providerId: "interno"`.
  - `auth-and-vistorias.spec.ts` ajustado: 2 criações de vistoria agora incluem `codigoImovelExterno`.
  - `vistoria-routed-orchestrator.spec.ts` ajustado: idem.
  - `admin-ui.spec.ts` ajustado: o form de criação preenche também `Código do imóvel` (label que o FE Sprint 24 vai expor).
- Total Playwright: **30 testes** (era 28).

## Breaking changes

- **`POST /vistorias` agora rejeita 400 sem `codigoImovelExterno`** — quebra Salesforce/CRM e qualquer cliente da API que não envia o campo. Avisar IN/Salesforce antes do deploy.
- **`POST /users` rejeita 400 quando roles inclui VISTORIADOR sem providerId** — qualquer fluxo de criação automática de vistoriadores precisa ser atualizado.
- **`PATCH /users/:id` propagando para VISTORIADOR sem providerId atual** rejeita 400. Mitigação: gestor precisa setar `providerId` no mesmo PATCH.
- **`POST /vistoriadores/:id/agenda` rejeita 400** quando vistoriador legado (pré-S22) tem `providerId: null`. Backfill: `PATCH /users/:id { providerId: 'interno' }`.

Schemas em `api-contracts`:

- `VistoriaSchema.codigoImovelExterno` adicionado como **nullable** (não breaking — strict parsers aceitam).
- `UserSchema.providerId` adicionado como **nullable enum** (não breaking).
- `CreateVistoriaRequestSchema.codigoImovelExterno` required (**minor breaking**).
- `CreateUserRequestSchema` ganhou `.refine` cross-field (**minor breaking** quando VISTORIADOR).

## Métricas

- 1 migration nova.
- 4 arquivos novos em `apps/api/src/cobertura/` (controller, service, module, spec).
- 1 arquivo novo de DTO (`create-cobertura.dto.ts`).
- 2 arquivos novos em `packages/api-contracts/src/cobertura/`.
- 64 unit tests (era 49) — +15.
- 30 E2E (era 28) — +2 (cobertura spec).
- 3 endpoints REST novos.
- 0 ADRs novos (decisões via `AskUserQuestion` durante a sessão).

## Decisões táticas (sem ADR)

- **Redundância de cobertura sempre bloqueia (409), em ambas as direções** — decidido com produto. Reverso ("warn only") gera dados ambíguos no DB; bloqueio dá feedback claro ao gestor.
- **`covers(a, b)` em vez de query SQL** — carrega coberturas da mesma UF (poucas linhas por vistoriador) e checa em memória. Vantagem: lógica clara, testável, sem precisar de função `unaccent`/case no Postgres. Quando o volume crescer (cenário de tenants com centenas de vistoriadores e milhares de coberturas), revisitar.
- **`providerId` no User, não em tabela separada** — campo opcional simples; quando provider futuramente virar tabela (configuração por tenant), evolui sem breaking.
- **`codigoImovelExterno` nullable no DB mas required no DTO** — preserva vistorias pré-S22 (sem backfill obrigatório). Quem editar uma vistoria antiga via PATCH (não existe ainda) precisará preencher.
- **`@Roles(ADMIN, GESTOR)` no controller de cobertura** — mesma regra de Users/Agenda; vistoriador não edita a própria cobertura (decisão produto).

## Para outros agentes

### IN (Sprint 23)

Pendência forward-compat: quando `InternoProvider.agendar(dto)` for chamado com `dto.vistoriadorId` preenchido (campo opcional adicionado na S18), propagar para o evento `vistoria.status.changed` para que BE consumer aplique `vistoria.vistoriadorId`.

Pequena evolução do schema `VistoriaStatusChangedEventSchema` em `api-contracts`: adicionar `vistoriadorId: uuid().optional()`. Propagar no `RmqVistoriaStatusWriter` e no `InternoProvider`.

Pendências históricas (não bloqueiam):

- Publicar `vistoria.routed` do BE — agent-sync S13.

### FE (Sprint 24)

Telas novas a entregar:

1. **Card "Áreas de cobertura"** em `/users/:id` (só quando role inclui VISTORIADOR):
   - Lista das coberturas (UF · Cidade · Bairro).
   - Form de adicionar com UF select (IBGE `/estados`), Cidade combobox (IBGE `/estados/{UF}/municipios`), Bairro texto livre.
   - Hierarquia: cidade só habilita quando UF set; bairro só quando cidade set.
   - Mensagem clara no 409 (mostrar regra existente que bloqueia).
   - `apps/web/src/lib/ibge.ts` + hooks para os 2 endpoints do IBGE.
2. **Campo "ProviderId"** no `UserForm.tsx`:
   - Select com 3 opções (`rede-vistorias`, `conceitual`, `interno`).
   - Visível e obrigatório quando role VISTORIADOR está checada.
   - No `UserDetailPage`, mostrar como Badge na header e permitir editar.
3. **Campo "Código do imóvel"** no `VistoriaForm.tsx`:
   - Obrigatório, primeiro campo do form.
   - `placeholder: "Ex.: IMV-2026-001"` ou similar.
4. **Filtro de busca por `codigoImovelExterno`** na `/vistorias`:
   - Input adicional na barra de filtros.

Sugestões técnicas em `docs/architecture/ibge-integration.md` (S21).

### DOC (Sprint 25)

- Consolidar S21..S24.
- Atualizar `c4-container.md` com tabela `vistoriador_cobertura` + colunas novas em users/vistorias.
- README com endpoints novos.
- ADR opcional sobre redundância de cobertura bloqueando em ambas direções.

## Validação executada

| Comando                                       | Resultado                                                                                   |
| --------------------------------------------- | ------------------------------------------------------------------------------------------- |
| `pnpm typecheck`                              | ✅ apps/api (Prisma client regerado implícito pelo build)                                   |
| `pnpm --filter @vistoria/api test`            | ✅ 8 suites, 64 testes (era 49)                                                             |
| `pnpm --filter @vistoria/api lint`            | ✅ 0 warnings                                                                               |
| `pnpm --filter @vistoria/api-contracts build` | ✅ dist atualizado (cobertura + users.providerId + vistoria.codigoImovelExterno)            |
| `pnpm playwright test --list`                 | ✅ 30 testes em 8 arquivos                                                                  |
| `pnpm test:e2e` (local)                       | ⚠️ Não executado. CI valida.                                                                |
| `pnpm dev:migrate` (local)                    | ⚠️ Não executado (api estava em uso). User precisa rodar após pull para a migration entrar. |

## Known Issues

Cumulativos do ciclo 5 + novas:

1. **BE ainda não publica `vistoria.routed`** — agent-sync S13.
2. **Refresh em `localStorage`** — XSS.
3. **DLX sem alarme em DLQ** — espera Prometheus.
4. **Sem dedup-by-eventId** — ADR-015.
5. **Slot não detecta sobreposição** — S17.
6. **Senha plain-text em POST/PATCH /users** — endpoint dedicado de reset adiado.
7. **`event-flow.md` desatualizado** — DOC pendente.
8. **Lint warning em `button.tsx`** — cosmético.
9. **Cobertura: vistoriador não vê a própria** — só ADMIN/GESTOR. Se virar pedido, abrir rota read-only para o próprio.
10. **Normalização de cidade/bairro** — strings livres. `"São Paulo"` ≠ `"Sao Paulo"`. FE Sprint 24 vai sanar via autocomplete IBGE para cidade; bairro segue livre.

## Próximo Sprint

**Sprint 23 — IN**: propagar `vistoriadorId` em `vistoria.status.changed` para futura aplicação pelo BE consumer.
