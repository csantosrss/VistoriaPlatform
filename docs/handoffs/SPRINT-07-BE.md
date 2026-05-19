---
agent: BE
sprint: "07"
date: 2026-05-19
---

# Handoff — Sprint 07 (BE) → Sprint 08 (IN)

## Resumo

BE entregou auth real (login + me com JWT RS256), CRUD de Vistorias com SAGA, endpoint de audit logs e infraestrutura de seed para dev. Validado ponta-a-ponta no stack rodando (curl + Playwright). Próximo agente é o **IN**, que conecta os providers reais à SAGA.

## Endpoints prontos

| Método | Path                             | Auth                  |
| ------ | -------------------------------- | --------------------- |
| POST   | `/api/v1/auth/login`             | público               |
| GET    | `/api/v1/auth/me`                | JWT                   |
| GET    | `/api/v1/vistorias`              | JWT                   |
| GET    | `/api/v1/vistorias/:id`          | JWT                   |
| POST   | `/api/v1/vistorias`              | JWT                   |
| POST   | `/api/v1/vistorias/:id/cancelar` | JWT                   |
| GET    | `/api/v1/audit-logs`             | JWT + ADMIN ou GESTOR |

Schemas compartilhados em `@vistoria/api-contracts`:

- `auth/login.ts` — `LoginRequestSchema`, `LoginResponseSchema`, `MeResponseSchema`
- `vistoria/dto.ts` — `VistoriaSchema`, `CreateVistoriaRequestSchema`, `CancelVistoriaRequestSchema`, `ListVistoriasQuerySchema`, `ListVistoriasResponseSchema`
- `audit/index.ts` — `AuditLogSchema`, `ListAuditLogsQuerySchema`, `ListAuditLogsResponseSchema`

## Database

Migration `20260519014024_add_vistoria_entities` aplicada. Novas tabelas:

- `vistorias` — domínio principal. Cria em `SOLICITADA`. Indexada por `(tenantId, status)`, `(tenantId, createdAt)`, `(tenantId, vistoriadorId)`.
- `vistoria_transicoes` — histórico de transições. IN deve gravar uma linha aqui para cada mudança de estado disparada por webhook ou regra interna.

Enums novos: `StatusVistoria` (9 valores), `TipoVistoria` (ENTRADA / SAIDA).

ERD vivo em [`docs/architecture/erd.md`](../architecture/erd.md).

## Credenciais de dev

Seed cria automaticamente:

- Tenant `auxiliadora` (slug)
- Usuário `admin@auxiliadorapredial.com.br` / senha `admin123` com roles `[ADMIN, GESTOR]`

`pnpm --filter @vistoria/api prisma:seed` é idempotente.

## O Que o IN Precisa Saber Antes de Começar (Sprint 08)

### Onde plugar

`packages/integrations` já tem o esqueleto de providers (`RedeVistoriasProvider`, `ConceitualProvider`, `InternoProvider`) e o `WebhookController`. Faltam:

1. **Implementar `agendar()`** em cada provider chamando a API REST do parceiro com retry/backoff (axios + axios-retry já instalados, ver `BaseHttpProvider`).
2. **Receber webhook → mapear status → atualizar `Vistoria.status` + criar `VistoriaTransicao`**. O mapeamento por parceiro já está em `@vistoria/api-contracts/webhooks` (`REDE_VISTORIAS_TO_STATUS`, `CONCEITUAL_TO_STATUS`).
3. **Provider routing** — hoje `Vistoria.providerId` é `string?` livre. IN cria a regra de roteamento (qual parceiro para qual tipo de vistoria, fallback para interno). Pode entrar como mais um service no próprio `packages/integrations` (`ProviderRoutingService`).

### Como acessar Vistoria a partir de IN

`VistoriasService` está exportado por `VistoriasModule` (do `apps/api`). IN não deveria importar diretamente de `apps/api` (proibido pelo CLAUDE.md de IN). Caminho recomendado:

- IN dispara mudança de status via um **port** (interface declarada em `apps/api/src/domain/ports/`, ainda a criar no BE Sprint próximo) injetado em IN como dependência.
- Por enquanto IN pode publicar evento em `vistoria.events` (`RmqPublisher` já existe em `apps/api`) e BE consome para atualizar.

Decidir essa fronteira na hora de codar. Sugestão: criar `apps/api/src/domain/ports/vistoria-status-updater.port.ts` no início do Sprint 08 com a interface, e IN injeta via DI. Pode render um ADR.

### Audit log

Toda mudança de status disparada por webhook **DEVE** gravar `AuditLog` com:

- `action`: `"VISTORIA.STATUS_CHANGED"` (ou `"VISTORIA.WEBHOOK_RECEIVED"` antes de mudar status)
- `resourceType`: `"Vistoria"`
- `resourceId`: id da vistoria
- `before/after`: snapshot da vistoria
- `correlationId`: do header `x-correlation-id` ou gerado
- `userId`: `null` (não há usuário, é webhook do parceiro)

O endpoint `GET /api/v1/audit-logs?resourceType=Vistoria` lê tudo isso. O FE tem uma tela "Webhooks recebidos" planejada que consumirá esse endpoint.

### Não esqueça

- **`@Public()` no `WebhookController`** — já está? Conferir, pois o guard JWT global bloqueia por padrão. Webhooks de parceiro têm seu próprio guard HMAC.
- **Imports em `packages/integrations`**: `import { ConfigService } from "@nestjs/config"` (sem `import type` — lição já aprendida no Sprint 04).

## Pendente Para Outros Agentes

### FE (Sprint 09)

Endpoints do BE Sprint 07 prontos para consumo. Telas planejadas:

1. **Login real** — plugar em `POST /api/v1/auth/login`. Schemas em `@vistoria/api-contracts/auth`. Substituir `localStorage.auth.access` por httpOnly cookie em sprint futuro.
2. **Listagem de Vistorias** com filtros e infinite scroll consumindo `GET /api/v1/vistorias`.
3. **Detalhe de Vistoria** com timeline da SAGA — `GET /api/v1/vistorias/:id` + (no futuro) endpoint de listar transições.
4. **Criação** consumindo `POST /api/v1/vistorias`.
5. **Webhooks recebidos** consumindo `GET /api/v1/audit-logs?resourceType=Vistoria&action=VISTORIA.STATUS_CHANGED` quando IN gravar.

### QI (Sprint 10)

- Investigar a flakiness ocasional do `nest start --watch` (às vezes não inicia o processo Node mesmo após "Found 0 errors"). Mitigação atual: `pnpm build && pnpm --filter @vistoria/api start`.
- Considerar promover `prisma:seed` para parte do `dev:all` em ambiente vazio (apenas se DB sem dados).
- Endpoint `GET /api/v1/audit-logs` poderia ser exposto na Playwright suite com paginação para evitar regressão.

### DOC (Sprint 11)

- Consolidar ADRs novas que IN/FE produzirem.
- Atualizar `c4-container.md` quando o port `VistoriaStatusUpdater` materializar.
- ERD pode crescer com `Imovel`, `Comodo`, `LaudoItem`, `ProviderRouting` quando BE entregar.

## Known Issues

1. **JWT key memoization é por processo** — se o cluster tiver múltiplas instâncias `apps/api`, cada uma gera seu próprio par RSA em dev. Não causa problema porque em prod as chaves vêm do `.env`. Vale um lembrete no ADR-004.
2. **`nest start --watch` ocasionalmente "Found 0 errors" mas não sobe o Node**. Workaround: build manual + start. QI investiga no Sprint 10.
3. **Sem refresh token ainda**. Token expira em 15min (`JWT_EXPIRES_IN`). FE precisa exigir login novamente quando expirar — refresh fica para Sprint futuro do BE.
4. **`Vistoria.providerId` é string livre**. Sem FK; IN define a convenção (`"rede-vistorias" | "conceitual" | "interno"`).

## Decisões Que Viram ADR

Nenhuma desta sprint — todas implementações de padrões já decididos. Candidatas para Sprint 08+ (a serem propostas por IN):

- Como IN modifica `Vistoria.status` sem importar `apps/api/` (port + evento RMQ vs outra abordagem).
- Estratégia de provider routing (regras hard-coded vs configuráveis em runtime).

## Próximo Sprint

**Sprint 08 — IN**: providers reais + webhook → SAGA + provider routing. Ver [SPRINT-03-IN.md](./SPRINT-03-IN.md) para o que IN já entregou na primeira passada.
