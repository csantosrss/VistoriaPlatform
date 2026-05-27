---
agent: IN
sprint: "28"
date: 2026-05-26
---

# Handoff — Sprint 28 (IN) → Sprint 29 (FE)

## Resumo

Sprint cirúrgica do IN. Fecha um pendente antigo herdado do **Sprint 13 IN**:

- **`VistoriaReaderPort`** (port BE→IN) definida em `packages/integrations`.
- **`InternoProvider.consultar(externalId, tenantId)`** finalmente funciona
  — passa a usar o port (com fallback `NotImplementedException` se nenhum
  adapter foi registrado, preservando forward-compat).
- **Adapter BE** (`VistoriaReaderAdapter`) em `apps/api/src/vistorias/`
  implementa o port via Prisma + tenant isolation. Registrado no
  `IntegrationsModule.forRoot({ vistoriaReader: VistoriaReaderAdapter })`.

Nada da agenda nova toca IN — bulk endpoints do BE Sprint 27 são internos
da API. Pedidos antigos seguem em aberto (ver "Known issues").

Próximo agente é o **FE** (Sprint 29).

## Entregas

### 1. `VistoriaReaderPort` em `packages/integrations`

[`packages/integrations/src/ports/vistoria-reader.port.ts`](../../packages/integrations/src/ports/vistoria-reader.port.ts):

- Token `VISTORIA_READER` (string).
- Interface `VistoriaReaderPort.read(vistoriaId, tenantId): Promise<VistoriaSnapshot | null>`.
- `VistoriaSnapshot`: shape mínimo para alimentar `ConsultaResult` —
  `vistoriaId`, `tenantId`, `status`, `codigoImovelExterno`, `vistoriadorId`,
  `agendadoPara`, `concluidoEm`, `canceladoEm`, `canceladoMotivo`,
  `observacoes`, `createdAt`, `updatedAt`. **Sem PII de contato** —
  `consultar()` é estado operacional, não dados de contato.
- Reexportado de `packages/integrations/src/ports/index.ts` (e por
  consequência de `@vistoria/integrations`).

### 2. `IVistoriaProvider.consultar()` ganha `tenantId`

[`packages/integrations/src/types/provider.ts`](../../packages/integrations/src/types/provider.ts):

```ts
- consultar(externalId: string): Promise<ConsultaResult>;
+ consultar(externalId: string, tenantId: string): Promise<ConsultaResult>;
```

Breaking minor da port — mas **sem callers reais** no código (busca por
`.consultar(` confirma). `RedeVistoriasProvider` e `ConceitualProvider`
ignoram o `tenantId` (HTTP externo já tem tenant implícito nas credenciais).
`base.provider.ts` também atualizado.

### 3. `InternoProvider` usa o port

[`packages/integrations/src/providers/interno.provider.ts`](../../packages/integrations/src/providers/interno.provider.ts):

- Construtor ganha `@Optional() @Inject(VISTORIA_READER) reader?:
VistoriaReaderPort`.
- `consultar(externalId, tenantId)`:
  - Sem reader → `NotImplementedException` com mensagem clara sobre
    como registrar.
  - Com reader → `reader.read(...)`; `NotFoundException` quando snapshot
    vem `null` (vistoria não existe no tenant); mapeamento explícito para
    `ConsultaResult` (`externalId` cai em `vistoriaId` se
    `codigoImovelExterno` for null).

### 4. Adapter BE da port

[`apps/api/src/vistorias/vistoria-reader.adapter.ts`](../../apps/api/src/vistorias/vistoria-reader.adapter.ts):

- `@Injectable()` implementa `VistoriaReaderPort`.
- `read(vistoriaId, tenantId)` faz `prisma.vistoria.findFirst({ where: {
id, tenantId } })` — tenant isolation explícito.
- Mapeia 1:1 para `VistoriaSnapshot`. Sem queries N+1.

Decisão: o adapter vive em `apps/api/src/vistorias/` (perto do model que
lê), **não** em `packages/integrations`. IN só define o **contrato**;
quem implementa é o BE. Mesmo padrão do `RmqVistoriaStatusWriter` (writer
vive em `integrations`, mas se o BE quisesse trocar por um writer
síncrono, registraria via `IntegrationsModule.forRoot()`).

### 5. `IntegrationsModule.forRoot()` aceita o adapter

[`packages/integrations/src/integrations.module.ts`](../../packages/integrations/src/integrations.module.ts):

```ts
IntegrationsModule.forRoot({ vistoriaReader: VistoriaReaderAdapter });
```

Quando `vistoriaReader` é passado, o módulo registra o `Type` como
provider local e cria o alias `{ provide: VISTORIA_READER, useExisting:
vistoriaReader }`. Como `PrismaModule` é `@Global()`, o adapter
consegue injetar `PrismaService` no escopo do `IntegrationsModule` sem
import circular.

Quando omitido (caso de testes, sandbox, futuros consumidores), nada
muda — `InternoProvider` recebe `reader=undefined` e cai no
`NotImplementedException`.

### 6. AppModule consome

[`apps/api/src/app.module.ts`](../../apps/api/src/app.module.ts):

```ts
import { VistoriaReaderAdapter } from "./vistorias/vistoria-reader.adapter";
// ...
IntegrationsModule.forRoot({ vistoriaReader: VistoriaReaderAdapter });
```

### 7. Unit tests

- `providers.spec.ts`: bloco `InternoProvider` atualizado — `consultar`
  agora aceita 2 args. 3 cases novos:
  - **Sem reader** → `NotImplementedException` (regressão do comportamento
    antigo).
  - **Com reader retornando snapshot** → mapeia para `ConsultaResult`.
  - **Com reader retornando null** → `NotFoundException`.
  - **Fallback de externalId** → quando `codigoImovelExterno` é null,
    `externalId` cai para `vistoriaId`.
- `vistoria-reader.adapter.spec.ts` (novo): 2 cases — mapeia row do Prisma,
  tenant isolation (findFirst com tenantId no where).

## Mudanças que tocam o usuário

Nenhuma. Endpoints públicos da API não mudam; `consultar()` não é exposto
como HTTP hoje. A capacidade só fica disponível para futuros consumidores
que injetem o `InternoProvider` (ex.: scripts forenses, dashboards
internos).

## Decisões táticas

- **Adapter BE-side dentro de uma sprint IN** — mesmo padrão da Sprint 23
  (handler do BE estendido lá): IN define o **contrato**, BE implementa
  o adapter. Justificado porque a alternativa (sprint BE separada para um
  adapter de ~25 linhas) teria overhead desproporcional. Documentado aqui
  para o DOC consolidar.
- **Breaking minor de `consultar(externalId)` → `consultar(externalId,
tenantId)`** — feito agora porque nenhum caller real existia; tornaria
  breaking de verdade se postergado.
- **Sem outbox / sem dedup-by-eventId nesta sprint** — itens herdados do
  S25 são responsabilidade do BE (consumer dedup) e ficam em aberto para
  ciclos futuros, quando o cenário de reabertura virar real (ADR-015).

## Para outros agentes

### FE (Sprint 29)

Foco do FE Sprint 29 é a **agenda nova** (que motivou todo o ciclo 6):

- Calendário mensal + drawer + KPIs + bloqueio em lote (critérios e
  contratos prontos no `SPRINT-26-QI.md` e nos endpoints do
  `SPRINT-27-BE.md`).
- Destravar os `test.fixme()` do `e2e/agenda-calendar-ui.spec.ts`.
- Bonus opcional: nova tela `/vistorias/:id/inspecionar` que chama
  `InternoProvider.consultar()` via algum endpoint do BE — **não há
  endpoint exposto ainda**; se quiser, abra agent-sync para o BE
  criar `GET /api/v1/vistorias/:id/consulta-provider` que usa o
  `InternoProvider`. Fora de escopo desta sprint.

### DOC (Sprint 30)

- ADR sobre a `VistoriaReaderPort` — padrão BE→IN análogo ao
  `VistoriaStatusWriterPort` (S13 IN). Texto base nos comentários
  do arquivo da port.
- Atualizar `c4-container.md`: container `apps/api` ganha
  `VistoriaReaderAdapter`; flecha "Integrations → adapter (read)".
- README raiz: anotar que `InternoProvider.consultar` agora é funcional.
- Atualizar `docs/architecture/event-flow.md` (já desatualizado) —
  oportunidade de incluir a port nova.
- Marcar pendente herdado do S25 "Port BE→IN para consultar() do
  InternoProvider" como **resolvido**.

## Validação executada

| Comando                                          | Resultado                                                 |
| ------------------------------------------------ | --------------------------------------------------------- |
| `pnpm --filter @vistoria/integrations typecheck` | ✅                                                        |
| `pnpm --filter @vistoria/integrations build`     | ✅                                                        |
| `pnpm --filter @vistoria/integrations lint`      | ✅                                                        |
| `pnpm --filter @vistoria/integrations test`      | ✅ **36 testes em 6 suites** (era 33; +3 do `consultar`). |
| `pnpm --filter @vistoria/api typecheck`          | ✅                                                        |
| `pnpm --filter @vistoria/api lint`               | ✅                                                        |
| `pnpm --filter @vistoria/api test`               | ✅ **80 testes em 10 suites** (era 78; +2 do adapter).    |
| `pnpm --filter @vistoria/web typecheck`          | ✅ (port é re-exportada, consumer não quebrou).           |

## Known Issues

Cumulativos:

1. BE ainda não publica `vistoria.routed` — agent-sync S13 segue.
2. Refresh em `localStorage`.
3. DLX declarado, sem alarme em DLQ size > 0 (destravado com `/metrics`).
4. Sem dedup-by-eventId no consumer (ADR-015).
5. Slot da agenda não detecta sobreposição.
6. Sem testes unitários de Users/Agenda/Cobertura no FE.
7. Senha em texto plano em `POST /users`.
8. `event-flow.md` desatualizado.
9. Lint warning em `button.tsx`.
10. Cidade/bairro como strings livres no BE.
11. IBGE pode estar fora do ar — FE faz fallback parcial.
12. Lista de coberturas no FE não tem confirm para deletar.
13. **(Resolvido na S27)** `/metrics` agora existe.
14. **(Resolvido na S27)** Bulk endpoints da agenda agora existem.
15. **(Resolvido nesta sprint)** ~~Port BE→IN para `consultar()` do `InternoProvider`~~.
16. Test runner do `api-contracts` quebrado (preexistente).
17. `/metrics` sem auth (ADR pendente).

Novas:

18. **`InternoProvider.consultar()` não tem endpoint HTTP no BE** —
    capacidade ligada na DI, mas nenhuma rota consome. Reabilitar via
    feature do BE quando o produto pedir leitura externa (dashboard,
    Salesforce, etc.).
19. **Outros consumidores que importem `IntegrationsModule.forRoot()`
    precisam atualizar a chamada** — se houver um teste E2E que
    instancie o módulo isolado, vai precisar de `forRoot({})` (vazio
    funciona, mas o tipo do options exige a passagem agora — corrigido
    no código atual via default `= {}`).

## Próximo Sprint

**Sprint 29 — FE**: entregar a agenda calendário. Tudo pronto do
backend; é refazer o que foi descartado lá no início do ciclo,
respeitando os contratos do `SPRINT-26-QI.md`.
