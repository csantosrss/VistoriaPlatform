# Sprint 10 — Changelog

**Período**: 2026-05-19
**Agente solo**: DOC (segunda volta do ciclo)
**Tema**: Consolidação documental do segundo ciclo (Sprint 06–09). Sem alterações de código de negócio: o DOC observa, documenta e fecha o loop. Compatível com o protocolo `QI → BE → IN → FE → DOC` do [AGENTS.md](../../AGENTS.md).

## Itens entregues

### Gap de changelog do Sprint 08 (IN)

- [SPRINT-08.md](./SPRINT-08.md) criado. O Sprint 09 (FE) saiu logo após o Sprint 08 sem passar por DOC — a sequência seguiu sequencial, mas o changelog ficou em aberto e foi preenchido agora a partir do [handoff IN](../handoffs/SPRINT-08-IN.md). Cobre: port `VistoriaStatusWriterPort`, `RmqVistoriaStatusWriter`, `ProviderRoutingService`, `WebhookController` reescrito, ADR-013, 23 unit tests.

### Changelog do Sprint 09 (FE)

- [SPRINT-09.md](./SPRINT-09.md) consolidado a partir do [handoff FE](../handoffs/SPRINT-09-FE.md). Cobre o painel admin saindo do estado placeholder do Sprint 04: 7 telas funcionais, 15 testes, zero `apps/api` tocado.

### C4 Container atualizado

[docs/architecture/c4-container.md](../architecture/c4-container.md):

- Seta `apps/web → apps/api` ganhou label específico `REST JSON + JWT (auth, vistorias, audit)` saindo do estado planejado do Sprint 04.
- Setas RMQ refinadas: além de `apps/api → vistoria.events`, agora há `integrations → vistoria.events (vistoria.status.changed)` e `rmq → apps/api` tracejada com label "(planejado)" — mensagens já são publicadas pelo IN (Sprint 08), mas BE ainda não consome.
- Nova tabela "Fluxos atuais entre containers" lista cada conexão com o sprint em que entrou em produção e o ADR que a justifica (cruzando ADR-013 para o caminho IN→RMQ).

### README raiz atualizado

[README.md](../../README.md):

- Bootstrap simplificado: não pede mais `cp` manual do `.env` — `pnpm env:setup` (Sprint 06) cuida.
- Tabela do `dev:all` cresceu para 4 passos (`env:setup → dev:up → dev:migrate → dev`).
- Bloco de credenciais de dev (tenant `auxiliadora`, `admin@auxiliadorapredial.com.br` / `admin123`) explícito.
- Nova seção "Painel admin (apps/web)" lista as 7 telas funcionais (login, dashboard, vistorias, audit, health) com o que cada uma faz.
- Nova seção "Endpoints REST (apps/api)" enumera as 10 rotas vivas com seu modo de auth.

### Índice de changelogs

[docs/changelog/README.md](./README.md) ganhou as linhas para Sprint 08, 09 e 10. Continua o pattern "um agente solo por sprint".

### Validação dos handoffs

Os 4 handoffs do segundo ciclo (`SPRINT-06-QI`, `SPRINT-07-BE`, `SPRINT-08-IN`, `SPRINT-09-FE`) foram revistos contra os changelogs e contra o estado atual do código. Sem contradições. Frontmatter YAML correto em todos. Pendentes para outros agentes preservados nesta consolidação.

## ADRs criados

Nenhum nesta sprint. As decisões do segundo ciclo já foram registradas pelos agentes correspondentes:

- ADR-013 (IN, Sprint 08) — port + RMQ event como contrato entre IN e BE.

Candidatos a ADR ainda não decididos (mencionados nos handoffs, pendentes de decisão real):

- `localStorage` vs cookie httpOnly para o token JWT (decisão FE; vira ADR quando BE entregar o cookie).
- Tabela `ProviderRouting` hard-coded vs configurável em DB (decisão IN; vira ADR quando o business pedir flexibilidade).
- Refresh-token strategy (decisão BE; vira ADR quando endpoint `/auth/refresh` existir).

DOC apenas registra a existência destes candidatos — não decide.

## Breaking changes

Nenhum.

## Métricas

- 3 changelogs novos (SPRINT-08, SPRINT-09, SPRINT-10)
- 1 diagrama atualizado (`c4-container.md`)
- README raiz: +25 linhas (telas, endpoints, credenciais de dev)
- 4 handoffs do segundo ciclo validados
- 0 ADRs novos (sem decisão arquitetural pendente nesta sprint)
- 0 mudanças de código (DOC nunca toca em `apps/`, `packages/`, `infra/`)

## Known issues encontrados durante a sprint

Estes não foram corrigidos pelo DOC (não cabe à função). Registrados aqui para o QI do próximo ciclo:

1. **BE ainda não consome `vistoria.status.changed`** — IN publica desde o Sprint 08 mas o handler do `RmqSubscriber` no `apps/api` está pendente. Sem isso, `/audit` filtrado por `action=VISTORIA.STATUS_CHANGED` nunca tem linhas vindas de parceiro. Item top do BE no próximo loop.
2. **`agendar()` real ainda não dispara** — o caminho de saída (Vistoria roteada → API do parceiro) também depende do BE consumir o evento ou expor a chamada via DI. Item BE.
3. **Sem timeline da SAGA em `/vistorias/:id`** — FE pediu endpoint `GET /api/v1/vistorias/:id/transicoes`. Item BE.
4. **Refresh token ausente** — token expira em 15min, FE só desloga em 401. Item BE.
5. **`localStorage` para token JWT** — herdado do Sprint 04, segue funcionando mas é placeholder. Migração para cookie httpOnly depende de BE expor.
6. **Lint warning em `apps/web/src/components/ui/button.tsx`** — `buttonVariants` exportado junto com o componente (padrão Shadcn). Cosmético; segue desde o Sprint 04.

## Pedidos abertos

Repassados ao próximo ciclo via [SPRINT-10-DOC.md](../handoffs/SPRINT-10-DOC.md):

- **QI (Sprint 11)**: Playwright E2E das telas novas (login → dashboard → criar vistoria → cancelar → 401 redirect); ampliar E2E do webhook (hoje só prova `@Public()`); investigar flakiness do `nest start --watch` herdada do BE Sprint 07.
- **BE (Sprint 12)**: handler `vistoria.status.changed`, aplicar `ProviderRoutingService.decide` em `VistoriasService.create()`, endpoint de transições, refresh token, migração para cookie httpOnly, endpoint `GET /vistorias/stats`.
- **IN (Sprint 13)**: sem pendência direta — quando BE consumir o evento, IN só revisa se quer adicionar idempotência ou `agendar()` reativo.
- **FE (Sprint 14)**: timeline da SAGA, refresh token transparente no `api-client.ts`, troca de `localStorage` por cookie quando BE expuser.

## Próximo sprint

**Sprint 11 — QI**: validação E2E ampliada para cobrir o painel admin do Sprint 09 + o caminho feliz do webhook do Sprint 08 + investigação do `nest start --watch`. O loop reinicia em QI conforme o protocolo de [AGENTS.md](../../AGENTS.md).
