---
from: FE
to: DOC
sprint: "04"
date: 2026-04-27
topic: "Decisões arquiteturais do bootstrap do apps/web"
---

# Sync FE → DOC — Sprint 04

Olá DOC. Três decisões não-triviais foram tomadas no scaffold do painel admin. Material bruto para virarem ADR-010 a ADR-012.

---

## ADR-010: React Router v6 (vs Tanstack Router)

### Contexto

Painel admin precisa de routing client-side com nested layouts, lazy loading futuro e tipagem das rotas/params.

### Decisão

**`react-router-dom` v6.28** com `createBrowserRouter` (data-router API).

### Alternativas Consideradas

- **Tanstack Router**: rotas type-safe automaticamente (params validados em tipo), search params parseados, melhor DX. Porém ainda em rápida evolução; ecosystem (auth integrations, devtools) menor.
- **Next.js App Router**: pesado demais — não queremos SSR/SSG para um painel admin atrás de auth.

### Consequências

- **Positivas**: API estável, ecossistema maduro, integra bem com Tanstack Query. Migração para Tanstack Router (se desejarmos) é incremental — `react-router-dom` aceita coexistir.
- **Negativas**: tipagem de params/loaders é manual (não inferida).
- **Riscos**: Tanstack Router está crescendo rápido; em 1-2 anos pode virar default. Reavaliar.

### Autor

FE | Sprint S04

---

## ADR-011: Shadcn-style copy-paste vs lib UI completa (Material UI / Mantine)

### Contexto

Precisamos de UI consistente, acessível, mobile-friendly. CLAUDE.md já estipulou Shadcn/UI como direção.

### Decisão

**Padrão Shadcn**: cada componente é código-fonte no projeto (`src/components/ui/*.tsx`), construído sobre Tailwind + Radix primitives + cva (class-variance-authority).

### Alternativas Consideradas

- **Material UI (MUI)**: componentes prontos, design Material. Bundle pesado (~400KB), customização verbosa, design fora do que cliente quer (mais "raw" tipo Notion).
- **Mantine**: ótima DX, componentes ricos. Mas runtime (`@emotion`) e customização CSS-in-JS conflitam com nosso pipeline Tailwind-puro.

### Consequências

- **Positivas**: total controle sobre cada componente — alterar é editar arquivo local, sem `theme.overrides`. Bundle final só inclui o que for usado. Tailwind classes são composáveis com qualquer outra UI lib (futuro charts, datepickers).
- **Negativas**: precisamos manter os componentes nós mesmos. Atualizações não são automáticas — quando Shadcn lança nova versão, copiamos manualmente os diffs.
- **Riscos**: drift entre projetos quando `apps/web` ganhar irmãos (mobile, internal-tools) — convencionar quando nascerem.

### Autor

FE | Sprint S04

---

## ADR-012: Tailwind 3.4 (vs Tailwind 4)

### Contexto

Tailwind 4 saiu em 2025 com nova engine (Lightning CSS), config simplificada (CSS-first). Tailwind 3.4 é o LTS de fato.

### Decisão

**Tailwind 3.4.14** com `tailwind.config.js` tradicional + `postcss.config.js` + diretivas `@tailwind base/components/utilities`.

### Alternativas Consideradas

- **Tailwind 4 + `@tailwindcss/vite` plugin**: mais rápido, config no CSS. Porém: muitos plugins de comunidade ainda não atualizados, Shadcn templates assumem v3 (variáveis CSS HSL, tokens). Refatorar quando v4 estabilizar e Shadcn migrar oficialmente.

### Consequências

- **Positivas**: máxima compatibilidade com tutoriais, plugins, Shadcn original. Risk zero para o sprint atual.
- **Negativas**: build CSS um pouco mais lento (irrelevante neste tamanho). v4 é o futuro — vamos ter migração técnica em algum sprint.
- **Riscos**: nenhum significativo. Migrar é isolado ao `apps/web` — não afeta outros pacotes.

### Autor

FE | Sprint S04

---

## Solicitação ao DOC

1. Criar `docs/decisions/ADR-010-react-router-v6.md`, `ADR-011-shadcn-copypaste.md`, `ADR-012-tailwind-3.md` usando `ADR-TEMPLATE.md`.
2. Linkar todos no `docs/changelog/SPRINT-04.md` ao consolidar o sprint.
3. Sugestão de diagrama em `docs/architecture/web-architecture.md`:
   - Camadas do `apps/web`: Router → Layouts → Features → Lib (api-client + queryClient) → @vistoria/api-contracts → apps/api
   - Mostrar onde Tanstack Query vive (entre features e api-client)
4. Considerar capturar screenshots da `/health` page rodando contra o stack docker compose para o `docs/architecture/screenshots/` (quando QI revalidar o stack).
