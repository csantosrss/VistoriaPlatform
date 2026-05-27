# Sprint 28 — Changelog

**Período**: 2026-05-26
**Agente solo**: IN (terceira volta do ciclo 6)
**Tema**: `VistoriaReaderPort` BE→IN destrava `InternoProvider.consultar()` (pendente desde S13).

## Itens entregues

### 1. `VistoriaReaderPort` (port BE→IN)

[`packages/integrations/src/ports/vistoria-reader.port.ts`](../../packages/integrations/src/ports/vistoria-reader.port.ts):

- Token `VISTORIA_READER` (string, padrão Nest).
- Interface `VistoriaReaderPort.read(vistoriaId, tenantId): Promise<VistoriaSnapshot | null>`.
- `VistoriaSnapshot` — shape mínimo para alimentar `ConsultaResult`,
  **sem PII de contato** (só estado operacional).

Reexportado do barrel de `@vistoria/integrations`.

### 2. `IVistoriaProvider.consultar()` ganha `tenantId`

Breaking minor da port, mas **sem callers reais** no momento. Adapters
HTTP de parceiros ignoram (`_tenantId`); só `InternoProvider` usa
para aplicar tenant isolation.

Tipos atualizados em `types/provider.ts`, `providers/base.provider.ts`,
`providers/rede-vistorias.provider.ts`,
`providers/conceitual.provider.ts`,
`providers/interno.provider.ts`.

### 3. `InternoProvider.consultar()` funcional

Construtor ganha `@Optional() @Inject(VISTORIA_READER) reader?:
VistoriaReaderPort`:

- Sem reader → `NotImplementedException` com mensagem de como
  registrar (forward-compat para consumidores que não atualizaram o
  `forRoot()`).
- Com reader → `reader.read(...)`; `null` vira `NotFoundException`;
  mapeamento para `ConsultaResult` (fallback `externalId →
vistoriaId` quando `codigoImovelExterno` é null).

### 4. Adapter BE da port

[`apps/api/src/vistorias/vistoria-reader.adapter.ts`](../../apps/api/src/vistorias/vistoria-reader.adapter.ts):

- `@Injectable()` implementa `VistoriaReaderPort`.
- `read(vistoriaId, tenantId)` faz `prisma.vistoria.findFirst({ where:
{ id, tenantId } })` — tenant isolation explícito.
- Mapeia 1:1 para `VistoriaSnapshot`.

**Justificativa de tocar BE numa sprint IN**: mesmo padrão da S23 —
IN define o **contrato**, BE implementa o adapter. Alternativa formal
(sprint BE separada para ~25 linhas) teria overhead desproporcional.

### 5. `IntegrationsModule.forRoot(options)` ganha parâmetro

[`packages/integrations/src/integrations.module.ts`](../../packages/integrations/src/integrations.module.ts):

```ts
IntegrationsModule.forRoot({ vistoriaReader: VistoriaReaderAdapter });
```

Quando `vistoriaReader` é passado, o módulo registra o `Type` como
provider local e cria alias `{ provide: VISTORIA_READER, useExisting:
vistoriaReader }`. `PrismaModule` é `@Global()` → adapter injeta
Prisma sem import circular.

Quando omitido (testes, sandbox, consumidores legados),
`InternoProvider.consultar()` cai em `NotImplementedException` —
forward-compat preservado.

### 6. `AppModule` consome

```ts
IntegrationsModule.forRoot({ vistoriaReader: VistoriaReaderAdapter });
```

### 7. Unit tests

- `providers.spec.ts`: 4 cases novos para `InternoProvider` cobrindo
  com/sem reader, snapshot válido, vistoria não encontrada,
  fallback externalId.
- `vistoria-reader.adapter.spec.ts` (novo): 2 cases — mapeamento e
  tenant isolation (`findFirst` com `where: { id, tenantId }`).

## ADRs criados

Nenhum diretamente no S28; candidatos consolidados no SPRINT-30 DOC:

- `VistoriaReaderPort` como padrão BE→IN simétrico ao
  `VistoriaStatusWriterPort` (ADR-013).
- `IntegrationsModule.forRoot(options)` com opções de DI.

## Breaking changes

- **Port `IVistoriaProvider.consultar(externalId)`** → `consultar(externalId, tenantId)`. Sem callers reais, sem usuários afetados.

## Métricas

- 1 port nova; 1 adapter novo.
- `packages/integrations`: **36 testes em 6 suites** (era 33; +3 do `consultar`).
- `apps/api`: **80 testes em 10 suites** (era 78; +2 do adapter spec).
- 7 arquivos em integrations alterados; 3 arquivos novos no apps/api.

## Próximo sprint

**Sprint 29 — FE**: entregar finalmente a tela de calendário da
agenda, consumindo os bulk endpoints do BE.
