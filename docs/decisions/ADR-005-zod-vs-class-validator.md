# ADR-005: Zod para validação de env vars (vs class-validator)

## Status

Aceita

## Contexto

Validação e tipagem de env vars na inicialização do `apps/api`. Já existe `class-validator` no projeto (DTOs HTTP) — usá-lo para env seria consistente. Convenção a definir.

## Decisão

**Zod 3.x** para validação de configuração (env vars) e payloads de webhook. **`class-validator`** segue para DTOs HTTP do NestJS (integra com `ValidationPipe`).

## Alternativas Consideradas

- **class-validator + class-transformer**: a opção "padrão NestJS". Mas exige criar uma classe `EnvVars` com decorators, instanciar via `plainToInstance`, e o erro de validação não tem mensagens tão claras quanto Zod.
- **Joi**: maduro mas API mais verbosa e tipos TS dependem de plugins.

## Consequências

- **Positivas**: schema declarativo conciso (`z.object({...})`), inferência automática para o tipo `Env`, mensagens de erro com path. Coerção explícita (`z.coerce.number()`) lida bem com strings vindas de env.
- **Negativas**: introduz uma dep adicional (Zod). Coexiste com class-validator — dois paradigmas no projeto.
- **Riscos**: equipe precisa saber qual usar onde. **Convenção**:
  - **class-validator** → DTOs de request HTTP (`apps/api/**` controllers)
  - **Zod** → env vars, schemas compartilhados (`packages/api-contracts/**`), webhook payloads, validações fora do pipeline HTTP

## Agente Autor

BE

## Data

2026-04-26

## Sprint

S02

## Referências

- Sync original: `docs/agent-sync/SPRINT-02-BE-TO-DOC.md`
- Schema env: `apps/api/src/config/env.schema.ts`
- Schemas compartilhados: `packages/api-contracts/src/**`
