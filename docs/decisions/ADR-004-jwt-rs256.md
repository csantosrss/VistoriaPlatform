# ADR-004: JWT RS256 assimétrico (vs HS256 simétrico)

## Status

Aceita

## Contexto

Tokens JWT consumidos pelo backend (verificação) e potencialmente por:

- Gateway/proxy externo (sem acesso ao secret de assinatura)
- Integradores parceiros (read-only)
- Funções edge / serverless

## Decisão

**RS256 (RSA assimétrico, 2048 bits)** com par de chaves em env vars `JWT_PRIVATE_KEY` / `JWT_PUBLIC_KEY` (PEM). Em dev, o `apps/api` gera par RSA-2048 efêmero em memória se as vars estiverem vazias (com warning).

## Alternativas Consideradas

- **HS256**: mais simples, secret único para sign/verify. Mas se o secret vaza, qualquer parte pode forjar tokens. Não permite que terceiros validem tokens sem expor o secret.
- **EdDSA (Ed25519)**: mais rápido e com chaves menores que RSA, mas suporte em libs mais antigas é irregular. Adotar no futuro se justificar.

## Consequências

- **Positivas**: chave pública pode ser distribuída livremente. Em comprometimento parcial (servidor backend), só a chave pública vaza — não há risco imediato de forgery.
- **Negativas**: assinatura/verificação ~10x mais lenta que HS256 (irrelevante para nosso volume). Operações de gestão de chave (rotação) são mais complexas.
- **Riscos**: rotação de chave precisa ser planejada (mecanismo de `kid` no header e suporte a múltiplas chaves de verificação).
- **Placeholder em dev**: chaves efêmeras são geradas no boot — tokens emitidos não são verificáveis por outras instâncias. Em produção (`NODE_ENV=production`), a falta das chaves derruba o boot via `validateEnv`.

## Agente Autor

BE

## Data

2026-04-26

## Sprint

S02

## Referências

- Sync original: `docs/agent-sync/SPRINT-02-BE-TO-DOC.md`
- Auth module: `apps/api/src/auth/`
- Key resolution: `apps/api/src/auth/keys.ts`
