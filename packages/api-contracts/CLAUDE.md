# CLAUDE.md — packages/api-contracts (Schemas Compartilhados)

## Identidade
Pacote de contratos compartilhados entre `apps/api` e `apps/web`. Fonte única da verdade dos tipos que cruzam a fronteira HTTP.

## Conteúdo
- DTOs (Zod schemas)
- Tipos TypeScript derivados (`z.infer<>`)
- Enums de domínio (`StatusVistoria`, `TipoVistoria`, etc)
- Constantes públicas
- Tipos de payload de webhooks

## Quem Edita
- **BE**: cria/altera schemas de request/response da API
- **IN**: adiciona schemas de payloads de webhook de parceiros
- **FE**: apenas consome (não cria)
- **DOC**: documenta breaking changes via ADR

## Regras Inviolávies
- Versionamento semântico — mudança breaking exige major bump
- Toda alteração breaking exige ADR + entrada em `docs/changelog/`
- Nunca importe código de `apps/*` aqui
- Dependências externas mínimas — idealmente apenas `zod`
- Schemas exportados em barrel (`index.ts`) por domínio

## Protocolo
- Mudanças que adicionam campo opcional → minor
- Mudanças que tornam campo obrigatório, removem campo ou alteram tipo → major + ADR + sync explícito com FE/IN
