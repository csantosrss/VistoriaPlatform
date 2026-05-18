# ADR-008: axios + axios-retry para HTTP clients de parceiros (vs node-fetch + p-retry)

## Status

Aceita

## Contexto

`BaseHttpProvider` (em `packages/integrations`) precisa de HTTP client com timeout, retry exponencial em falhas transitórias (5xx, ECONNRESET) e interceptors para logging/correlation-id.

## Decisão

**axios 1.7 + axios-retry 4.5** como base do `BaseHttpProvider`.

## Alternativas Consideradas

- **node-fetch + p-retry**: dependência menor, API native fetch (mais futureproof). Porém, configurar retry condicional baseado em status code/error type pede mais boilerplate.
- **undici + custom retry**: undici (cliente HTTP do Node.js core) é o mais rápido, mas API ainda em estabilização e ergonomia menos cuidada.

## Consequências

- **Positivas**: Axios tem ecossistema maduro, `axios-retry` lida com `isNetworkOrIdempotentRequestError` out-of-the-box, interceptors são triviais de adicionar para tracing.
- **Negativas**: Axios usa internamente o `http` do Node, não o undici — perde-se algum throughput em alta concorrência. Para nosso volume (centenas de calls/dia por tenant), irrelevante.
- **Riscos**: nenhum significativo. Migração futura para undici seria uma reescrita do `BaseHttpProvider` apenas — adapters concretos não veriam diferença.

## Coexistência no monorepo

- `apps/api/src/infrastructure/messaging/` usa `amqplib` (não HTTP).
- `apps/web/src/lib/api-client.ts` também usa axios — convergência de stack HTTP no projeto.

## Agente Autor

IN

## Data

2026-04-26

## Sprint

S03

## Referências

- Sync original: `docs/agent-sync/SPRINT-03-IN-TO-DOC.md`
- Base provider: `packages/integrations/src/providers/base.provider.ts`
- API client web: `apps/web/src/lib/api-client.ts`
