# ADR-012: Tailwind 3.4 (vs Tailwind 4)

## Status

Aceita

## Contexto

Tailwind 4 saiu em 2025 com nova engine (Lightning CSS) e config simplificada (CSS-first). Tailwind 3.4 é o LTS de fato, com toda a documentação de Shadcn/templates da comunidade assumindo v3.

## Decisão

**Tailwind 3.4.14** com `tailwind.config.js` tradicional + `postcss.config.js` + diretivas `@tailwind base/components/utilities` no `src/index.css`.

## Alternativas Consideradas

- **Tailwind 4 + `@tailwindcss/vite` plugin**: mais rápido, config no CSS. Porém: muitos plugins de comunidade ainda não atualizados, Shadcn templates assumem v3 (variáveis CSS HSL, tokens). Refatorar quando v4 estabilizar e Shadcn migrar oficialmente.

## Consequências

- **Positivas**: máxima compatibilidade com tutoriais, plugins, Shadcn original. Risk zero para o sprint atual.
- **Negativas**: build CSS um pouco mais lento (irrelevante neste tamanho). v4 é o futuro — vamos ter migração técnica em algum sprint.
- **Riscos**: nenhum significativo. Migrar é isolado ao `apps/web` — não afeta outros pacotes.

## Plano de Reavaliação

Reavaliar v4 quando:

1. Shadcn/UI atualizar oficialmente sua docs para v4 como default
2. Os plugins que usamos (autoprefixer já é built-in em v4, mas outros podem entrar) virarem v4-ready
3. Tivermos um sprint sem feature crítica para encarar a migração

## Agente Autor

FE

## Data

2026-04-27

## Sprint

S04

## Referências

- Sync original: `docs/agent-sync/SPRINT-04-FE-TO-DOC.md`
- Config: `apps/web/tailwind.config.js`, `apps/web/postcss.config.js`
- Tokens HSL: `apps/web/src/index.css`
