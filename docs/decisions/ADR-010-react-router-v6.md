# ADR-010: React Router v6 (vs Tanstack Router)

## Status

Aceita

## Contexto

Painel admin (`apps/web`) precisa de routing client-side com nested layouts, lazy loading futuro, e tipagem das rotas/params.

## Decisão

**`react-router-dom` v6.28** com `createBrowserRouter` (data-router API, não a JSX Routes API).

## Alternativas Consideradas

- **Tanstack Router**: rotas type-safe automaticamente (params validados em tipo), search params parseados, melhor DX. Porém ainda em rápida evolução; ecosystem (auth integrations, devtools) menor.
- **Next.js App Router**: pesado demais — não queremos SSR/SSG para um painel admin atrás de auth.

## Consequências

- **Positivas**: API estável, ecossistema maduro, integra bem com Tanstack Query. Migração para Tanstack Router (se desejarmos) é incremental — `react-router-dom` aceita coexistir.
- **Negativas**: tipagem de params/loaders é manual (não inferida).
- **Riscos**: Tanstack Router está crescendo rápido; em 1-2 anos pode virar default. Reavaliar.

## Agente Autor

FE

## Data

2026-04-27

## Sprint

S04

## Referências

- Sync original: `docs/agent-sync/SPRINT-04-FE-TO-DOC.md`
- Routes: `apps/web/src/routes.tsx`
