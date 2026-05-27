# ADR-018: `IntegrationsModule.forRoot(options)` — DI opcional de adapters BE-side

## Status

Aceita

## Contexto

Até a Sprint 28, `IntegrationsModule.forRoot()` era no-arg — sempre
registrava o mesmo conjunto de providers (writer RMQ default, routing,
orchestrator, etc.). O wiring de adapters BE-side (que implementam
ports definidas em `packages/integrations`) ficava implícito por
exports + alias.

A Sprint 28 IN introduziu uma segunda port (`VistoriaReaderPort`, ver
[ADR-017](./ADR-017-vistoria-reader-port.md)) cujo adapter vive em
`apps/api/src/vistorias/vistoria-reader.adapter.ts`. Para o
`InternoProvider` (que vive em `packages/integrations`) enxergar o
token `VISTORIA_READER`, ele precisa estar no **escopo do
IntegrationsModule** — não basta o `apps/api` registrar o provider
fora.

3 abordagens consideradas:

1. **`@Global()` num módulo BE-side com o adapter** — funciona, mas
   espalha o wiring entre arquivos e cria um módulo `@Global` só pra
   isso.
2. **`IntegrationsModule` importa o `VistoriasModule`** — dependência
   circular (VistoriasModule já usa types de `@vistoria/integrations`).
3. **`IntegrationsModule.forRoot(options)` aceita o adapter como
   parâmetro** — escolhida.

## Decisão

`IntegrationsModule.forRoot(options?: IntegrationsModuleOptions)`:

```ts
export interface IntegrationsModuleOptions {
  vistoriaReader?: Type<VistoriaReaderPort>;
}
```

Quando `vistoriaReader` é passado, o módulo registra o `Type` como
provider local e cria alias `{ provide: VISTORIA_READER, useExisting:
vistoriaReader }`. Como `PrismaModule` é `@Global()`, o adapter
consegue injetar `PrismaService` no escopo do `IntegrationsModule` sem
import circular.

Quando omitido (testes, sandbox, consumidores legados), nada muda —
`InternoProvider.consultar` cai em `NotImplementedException`
(forward-compat preservado).

`AppModule` agora chama:

```ts
IntegrationsModule.forRoot({ vistoriaReader: VistoriaReaderAdapter });
```

## Alternativas Consideradas

- **Módulo `@Global()` dedicado** — funciona, mas o wiring fica
  espalhado e o `@Global()` é uma escolha que precisa de justificativa
  por si só.
- **`IntegrationsModule` importar `VistoriasModule`** — circular
  porque VistoriasModule consome tokens/services do `@vistoria/integrations`.
- **Hardcode do adapter dentro de `integrations`** — quebra a regra
  "IN não importa de `apps/api`".
- **Token de DI exposto, sem wiring no `forRoot`** — exigiria que
  todo consumidor lembrasse de fazer `providers: [{ provide:
VISTORIA_READER, useClass: X }]` no AppModule. Esquecimento é silent
  failure (cai no `NotImplementedException` em runtime, longe da
  origem).

## Consequências

### Positivas

- API explícita: ler o `forRoot()` mostra que adapters BE-side estão
  pluggable.
- Forward-compat: opcional; sem parâmetro o módulo funciona como
  sempre.
- Padrão repetível para futuras ports BE→IN — basta adicionar
  `xyzReader?: Type<XyzPort>` em `IntegrationsModuleOptions`.

### Negativas / Riscos

- Mais um conceito para entender ao primeiro contato com o módulo.
- Se houver muitos adapters opcionais, o `options` cresce. Mitigação
  futura: extrair em sub-options (`adapters: { vistoriaReader, ... }`).
- `useExisting` exige que o `Type` esteja **no escopo do módulo** —
  resolvido aqui porque o módulo registra o `Type` como provider
  local na mesma chamada. Isso evita o problema típico de
  "useExisting aponta para provider em outro módulo".

## Agente Autor

DOC (consolida decisão tática do IN Sprint 28)

## Data

2026-05-26

## Sprint

S30

## Referências

- Implementação: [`packages/integrations/src/integrations.module.ts`](../../packages/integrations/src/integrations.module.ts)
- Uso: [`apps/api/src/app.module.ts`](../../apps/api/src/app.module.ts)
- ADR-013 (port writer simétrico, primeiro padrão BE↔IN)
- ADR-017 (`VistoriaReaderPort` — motivou esta ADR)
- Handoff: [SPRINT-28-IN.md](../handoffs/SPRINT-28-IN.md)
