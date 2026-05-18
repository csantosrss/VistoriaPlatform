# ADR-003: Prisma como ORM (vs TypeORM)

## Status

Aceita

## Contexto

O backend NestJS precisa de uma camada de acesso ao Postgres com:

- Tipagem estática completa (compile-time safety nos modelos)
- Migrations versionadas e reproduzíveis
- Suporte a multi-tenant via filtros transversais
- Boa DX para queries dinâmicas (filtros opcionais, paginação)
- Comunidade ativa e documentação acessível

## Decisão

**Prisma 5.x** com schema declarativo em `apps/api/prisma/schema.prisma`.

## Alternativas Consideradas

- **TypeORM**: padrão histórico no ecossistema NestJS, suporta entities como classes (familiar para devs OOP), mas o ecosystem move-se mais lentamente, runtime decorators dificultam tree-shaking, migrations exigem cuidado para sincronizar com mudanças de entidade.
- **Drizzle**: muito moderno, schema em TS puro, sem code-gen runtime; porém ainda menos maduro que Prisma, ferramenta de migrations menos consolidada para Postgres com tipos complexos (Json, arrays de enums).
- **Knex / SQL puro**: máximo controle, zero abstração. Inviabiliza tipagem automática e exige boilerplate.

## Consequências

- **Positivas**: schema declarativo (`schema.prisma`), client gerado com tipos completos, `prisma migrate` é determinístico, suporte first-class a multi-tenant via `extends`, Prisma Studio para inspeção em dev.
- **Negativas**: o client é code-generated (build precisa rodar `prisma generate` antes). Queries muito complexas (CTEs, window functions) pedem `$queryRaw`.
- **Riscos**: lock-in moderado — migrar para outro ORM exigiria reescrever queries, mas o schema em si é portável.

## Agente Autor

BE

## Data

2026-04-26

## Sprint

S02

## Referências

- Sync original: `docs/agent-sync/SPRINT-02-BE-TO-DOC.md`
- Schema: `apps/api/prisma/schema.prisma`
- Service: `apps/api/src/infrastructure/prisma/prisma.service.ts`
