# ADR-017: `VistoriaReaderPort` — BE expõe leitura para IN via port

## Status

Aceita

## Contexto

O `InternoProvider` (em `packages/integrations`) precisa ler estado de
uma Vistoria para implementar `IVistoriaProvider.consultar(externalId,
tenantId)`. Os adapters HTTP (`RedeVistoriasProvider`,
`ConceitualProvider`) chamam APIs externas; o `InternoProvider` é
in-process e deveria consultar o próprio banco — mas o `CLAUDE.md` do
agente IN proíbe importar `apps/api`:

> NUNCA altere `domain/` ou `application/` (responsabilidade de BE)
> NUNCA importe diretamente código de `apps/`

Mesma restrição que motivou o ADR-013 (`VistoriaStatusWriterPort`,
BE escreve via port BE→IN). Agora precisamos do **espelho**: IN lê via
port BE→IN.

## Decisão

1. **Port** `VistoriaReaderPort` em
   `packages/integrations/src/ports/vistoria-reader.port.ts`:

   ```ts
   export interface VistoriaReaderPort {
     read(
       vistoriaId: string,
       tenantId: string,
     ): Promise<VistoriaSnapshot | null>;
   }
   ```

   - token `VISTORIA_READER` (string, padrão Nest).

2. **`VistoriaSnapshot`** — shape mínimo para `ConsultaResult`. Sem
   PII de contato (`consultar()` retorna estado operacional, não
   dados pessoais).

3. **Adapter BE** em `apps/api/src/vistorias/vistoria-reader.adapter.ts`
   usa `prisma.vistoria.findFirst({ where: { id, tenantId } })` com
   tenant isolation explícito.

4. **`InternoProvider`** injeta `@Optional() @Inject(VISTORIA_READER)`:
   - sem reader → `NotImplementedException` (forward-compat);
   - com reader → mapeia snapshot para `ConsultaResult`; `null` vira
     `NotFoundException`.

5. **Wiring**: `IntegrationsModule.forRoot({ vistoriaReader:
VistoriaReaderAdapter })` (ver [ADR-018](./ADR-018-integrations-module-options.md)).

## Alternativas Consideradas

- **Import direto de `VistoriasService`** — viola `CLAUDE.md` do IN.
- **Endpoint HTTP interno `GET /vistorias/:id`** — duplica auth,
  introduz latência, anti-padrão same-process.
- **Compartilhar uma classe abstrata no `api-contracts`** — `api-contracts`
  é só Zod (sem Nest); misturaria responsabilidades.
- **`VistoriaSnapshot` retornar a row Prisma inteira** — vazaria PII
  desnecessária (contato) através de uma fronteira que historicamente
  era HTTP. Mantemos o shape mínimo.

## Consequências

### Positivas

- Simétrico ao ADR-013 (`VistoriaStatusWriterPort`). Padrão consistente
  para qualquer port BE↔IN futura (leitura de vistoriadores,
  notificações, etc.).
- IN permanece independente de `apps/api`.
- Testabilidade alta — mock `read` é trivial.
- Forward-compat: consumidores que não atualizaram `forRoot()` seguem
  funcionando (`consultar` → `NotImplementedException`).

### Negativas / Riscos

- **Breaking minor** da `IVistoriaProvider.consultar()` (assinatura
  ganhou `tenantId`). Sem callers reais no momento, então o custo é
  zero — feito agora justamente para não virar breaking de verdade
  depois.
- O snapshot só carrega estado operacional. Se um futuro caller
  precisar de PII, abrir uma port nova (`VistoriaContactReader` por
  ex.) com escopo de PII explícito.
- Adapter vive em `apps/api` (e não em `packages/integrations`) — é o
  trade-off: IN define o contrato, BE implementa. Mesmo padrão do
  writer.

## Agente Autor

DOC (consolida decisão tática do IN Sprint 28)

## Data

2026-05-26

## Sprint

S30

## Referências

- Port: [`packages/integrations/src/ports/vistoria-reader.port.ts`](../../packages/integrations/src/ports/vistoria-reader.port.ts)
- Adapter BE: [`apps/api/src/vistorias/vistoria-reader.adapter.ts`](../../apps/api/src/vistorias/vistoria-reader.adapter.ts)
- ADR-013 (writer simétrico)
- ADR-018 (`IntegrationsModule.forRoot` com options)
- Handoff: [SPRINT-28-IN.md](../handoffs/SPRINT-28-IN.md)
