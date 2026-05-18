# ADR-011: Shadcn-style copy-paste (vs Material UI / Mantine)

## Status

Aceita

## Contexto

Painel admin precisa de UI consistente, acessível e mobile-friendly. CLAUDE.md raiz já estipulou Shadcn/UI como direção.

## Decisão

**Padrão Shadcn**: cada componente é código-fonte no projeto (`apps/web/src/components/ui/*.tsx`), construído sobre Tailwind + Radix primitives + cva (class-variance-authority).

## Alternativas Consideradas

- **Material UI (MUI)**: componentes prontos, design Material. Bundle pesado (~400KB), customização verbosa, design fora do que cliente quer (mais "raw" tipo Notion).
- **Mantine**: ótima DX, componentes ricos. Mas runtime (`@emotion`) e customização CSS-in-JS conflitam com nosso pipeline Tailwind-puro.

## Consequências

- **Positivas**: total controle sobre cada componente — alterar é editar arquivo local, sem `theme.overrides`. Bundle final só inclui o que for usado. Tailwind classes são composáveis com qualquer outra UI lib (futuro charts, datepickers).
- **Negativas**: precisamos manter os componentes nós mesmos. Atualizações não são automáticas — quando Shadcn lança nova versão, copiamos manualmente os diffs.
- **Riscos**: drift entre projetos quando `apps/web` ganhar irmãos (mobile, internal-tools) — convencionar quando nascerem (provavelmente extrair `@vistoria/ui-kit`).

## Componentes entregues no Sprint S04

`Button`, `Card` (+ subcomponents), `Input`, `Label`, `Badge`, `Skeleton`. Próximos esperados: `Select`, `Dialog`, `Toast`, `Tabs`, `DropdownMenu`, `Form` wrappers.

## Agente Autor

FE

## Data

2026-04-27

## Sprint

S04

## Referências

- Sync original: `docs/agent-sync/SPRINT-04-FE-TO-DOC.md`
- Componentes: `apps/web/src/components/ui/`
- Helper: `apps/web/src/lib/utils.ts` (`cn`)
