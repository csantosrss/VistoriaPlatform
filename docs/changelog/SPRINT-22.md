# Sprint 22 — Changelog

**Período**: 2026-05-21
**Agente solo**: BE
**Tema**: 3 features de produto pedidas durante o ciclo 5 — cobertura geográfica do vistoriador, código do imóvel externo, e provider do vistoriador.

## Itens entregues

### 1. `VistoriadorCobertura`

- Tabela nova `vistoriador_cobertura` (`id`, `tenantId`, `vistoriadorId`, `uf`, `cidade?`, `bairro?`, timestamps). Índices `(tenantId, vistoriadorId)` e `(tenantId, uf, cidade, bairro)`.
- 3 endpoints sob `/api/v1/users/:id/cobertura` (GET / POST / DELETE), `@Roles(ADMIN, GESTOR)`.
- Hierarquia: `(uf, null, null)` cobre toda UF; `(uf, cidade, null)` cobre toda cidade; `(uf, cidade, bairro)` só o bairro.
- **Redundância bloqueada por 409** em **ambas as direções** via função `covers(a, b)` (existente cobre nova OU nova cobre existente).
- Audit `COBERTURA.CREATED` / `COBERTURA.DELETED`.

### 2. `Vistoria.codigoImovelExterno`

- Coluna nova nullable no DB (preserva legacy), `required` no `CreateVistoriaRequest` (`z.string().min(1).max(100)`).
- Índice `(tenantId, codigoImovelExterno)`.
- Filtro `?codigoImovelExterno=` na listagem (match exato).
- BE responde 400 quando `POST /vistorias` omite o campo.

### 3. `User.providerId`

- Coluna nova (`rede-vistorias` | `conceitual` | `interno`).
- **Obrigatório quando `roles` inclui VISTORIADOR** — validado no service (`assertProviderIdRequiredForVistoriador`). Outras roles → providerId forçado a null.
- `UsersService.update` calcula `finalRoles`/`finalProviderId` a partir do diff; tirar VISTORIADOR limpa providerId automaticamente.
- Filtro `?providerId=` na listagem.
- `AgendaService.assertVistoriador` e `CoberturaService.assertVistoriador` rejeitam 400 se vistoriador legado sem providerId.

### 4. Contratos compartilhados

- `@vistoria/api-contracts/cobertura/` novo — `VistoriadorCoberturaSchema`, `CreateCoberturaRequestSchema`, `ListCoberturasResponseSchema`.
- `UserSchema` ganha `providerId` (nullable enum). `CreateUserRequestSchema` com `.refine` cross-field. `ListUsersQuerySchema` + `providerId`.
- `VistoriaSchema.codigoImovelExterno` nullable. `CreateVistoriaRequestSchema.codigoImovelExterno` required.

### 5. Migration

`20260521150000_add_cobertura_and_codigo_imovel`: ALTER `vistorias` + ALTER `users` + CREATE `vistoriador_cobertura`.

## Endpoints novos

| Método | Rota                                       | Auth               |
| ------ | ------------------------------------------ | ------------------ |
| GET    | `/api/v1/users/:id/cobertura`              | JWT (ADMIN/GESTOR) |
| POST   | `/api/v1/users/:id/cobertura`              | JWT (ADMIN/GESTOR) |
| DELETE | `/api/v1/users/:id/cobertura/:coberturaId` | JWT (ADMIN/GESTOR) |

## Breaking changes

- `POST /vistorias` exige `codigoImovelExterno`.
- `POST /users` exige `providerId` quando roles inclui VISTORIADOR.
- Vistoriadores legados sem providerId não podem cadastrar agenda/cobertura — backfill via PATCH.

## Métricas

- 1 migration, 14 arquivos novos em `apps/api/src/cobertura/`, 2 em `api-contracts/cobertura/`.
- 64 unit (era 49); +15 (cobertura 10, users 3, others 2).
- 30 E2E (era 28); +2 (`cobertura.spec.ts`).
- 3 endpoints REST novos.

## Decisões táticas

- Redundância em ambas as direções sempre 409 (decisão de produto).
- `covers(a, b)` em memória em vez de query SQL (load total per UF é pequeno).
- `providerId` no User, não em tabela separada — campo simples, evolui se necessário.
- `codigoImovelExterno` nullable no DB para retro-compat sem backfill obrigatório.

## ADRs

Nenhum. Decisões via `AskUserQuestion` antes da implementação.

## Próximo sprint

**Sprint 23 — IN**: propagar `vistoriadorId` em `vistoria.status.changed`.
