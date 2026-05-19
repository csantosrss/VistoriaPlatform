# ERD — Esquema Multi-tenant + Auditoria + Vistoria

Estado atual do `apps/api/prisma/schema.prisma` após as migrations:

- `20260519001119_init` — esqueleto multi-tenant + auditoria (Tenant, User, AuditLog)
- `20260519014024_add_vistoria_entities` — entidades do domínio Vistoria (Vistoria, VistoriaTransicao) + enums `StatusVistoria` e `TipoVistoria`

## Diagrama

```mermaid
erDiagram
    Tenant ||--o{ User : "tem"
    Tenant ||--o{ AuditLog : "registra"
    Tenant ||--o{ Vistoria : "possui"
    User   ||--o{ AuditLog : "executa"
    User   ||--o{ Vistoria : "vistoriador"
    Vistoria ||--o{ VistoriaTransicao : "transita"

    Tenant {
        uuid id PK
        string slug UK
        string name
        bool active
        timestamp createdAt
        timestamp updatedAt
    }

    User {
        uuid id PK
        uuid tenantId FK
        string email
        string name
        string passwordHash "nullable"
        Role[] roles
        bool active
        timestamp createdAt
        timestamp updatedAt
    }

    AuditLog {
        uuid id PK
        uuid tenantId FK
        uuid userId FK "nullable"
        string action
        string resourceType
        string resourceId "nullable"
        json before "nullable"
        json after "nullable"
        string correlationId "nullable"
        string ip "nullable"
        string userAgent "nullable"
        timestamp createdAt
    }

    Vistoria {
        uuid id PK
        uuid tenantId FK
        StatusVistoria status "default SOLICITADA"
        TipoVistoria tipo
        string enderecoLogradouro
        string enderecoNumero
        string enderecoComplemento "nullable"
        string enderecoBairro
        string enderecoCidade
        string enderecoUf "VARCHAR(2)"
        string enderecoCep "VARCHAR(9)"
        string contatoNome
        string contatoTelefone
        string contatoEmail "nullable"
        string observacoes "nullable"
        uuid vistoriadorId FK "nullable"
        string providerId "nullable"
        timestamp agendadoPara "nullable"
        timestamp concluidoEm "nullable"
        timestamp canceladoEm "nullable"
        string canceladoMotivo "nullable"
        timestamp createdAt
        timestamp updatedAt
    }

    VistoriaTransicao {
        uuid id PK
        uuid vistoriaId FK
        uuid tenantId
        StatusVistoria de "nullable"
        StatusVistoria para
        string motivo "nullable"
        uuid executadoPor "nullable"
        string correlationId "nullable"
        timestamp createdAt
    }
```

## Enums

### `StatusVistoria`

Os 9 estados da SAGA (ver [saga-vistoria.md](./saga-vistoria.md)):
`SOLICITADA → ROTEADA → AGENDADA → CONFIRMADA → EM_EXECUCAO → LAUDO_PENDENTE → LAUDO_APROVADO → CONCLUIDA | CANCELADA`.

### `TipoVistoria`

`ENTRADA` (vistoria inicial) | `SAIDA` (vistoria final).

## Enum `Role`

| Valor         | Quem                                                                       |
| ------------- | -------------------------------------------------------------------------- |
| `ADMIN`       | Administra a plataforma (cross-tenant em casos excepcionais).              |
| `GESTOR`      | Gerencia vistorias dentro do tenant.                                       |
| `VISTORIADOR` | Executa vistorias atribuídas.                                              |
| `CLIENTE`     | Locatário/proprietário (acesso muito restrito).                            |
| `PARCEIRO`    | Conta técnica usada por integrações externas (Rede Vistorias, Conceitual). |

## Convenções obrigatórias

- **Tenant isolation**: toda nova tabela do domínio precisa de `tenantId UUID`, índice por `tenantId` e (quando aplicável) `@@unique([tenantId, ...])`. Não há shared rows entre tenants.
- **Audit log**: toda operação destrutiva ou sensível registra um `AuditLog` com `before/after`, `correlationId` propagado do request, `ip` e `userAgent`.
- **`onDelete`**:
  - `User → Tenant`: `Cascade` (remover tenant remove seus usuários).
  - `AuditLog → Tenant`: `Cascade`.
  - `AuditLog → User`: `SetNull` (preservar o registro mesmo se o usuário for removido).
- **PK UUID v4** em todas as tabelas (`@id @default(uuid()) @db.Uuid`).
- **Timestamps**: `createdAt @default(now())`, `updatedAt @updatedAt`.

## Tabelas físicas

| Model Prisma        | Tabela                | Índices                                                                                         |
| ------------------- | --------------------- | ----------------------------------------------------------------------------------------------- |
| `Tenant`            | `tenants`             | PK `id`, UK `slug`                                                                              |
| `User`              | `users`               | PK `id`, UK `(tenantId, email)`, IDX `tenantId`                                                 |
| `AuditLog`          | `audit_logs`          | PK `id`, IDX `(tenantId, createdAt)`, IDX `(tenantId, resourceType, resourceId)`                |
| `Vistoria`          | `vistorias`           | PK `id`, IDX `(tenantId, status)`, IDX `(tenantId, createdAt)`, IDX `(tenantId, vistoriadorId)` |
| `VistoriaTransicao` | `vistoria_transicoes` | PK `id`, IDX `vistoriaId`, IDX `(tenantId, createdAt)`                                          |

## Próximas entidades planejadas (BE Sprint 09+)

- `Imovel` + `Comodo` (escopo físico — atualmente endereço fica direto na Vistoria)
- `LaudoItem` (fotos + observações de um cômodo após execução)
- `ProviderRouting` (regra que decide qual parceiro recebe a vistoria, hoje `Vistoria.providerId` é string livre)

Cada uma virá com migration própria e ADR caso introduza decisão não-trivial.
