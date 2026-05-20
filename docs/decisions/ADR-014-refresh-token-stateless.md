# ADR-014: Refresh token stateless com claim `type`

## Status

Aceita

## Contexto

A Sprint 09 FE entregou o painel admin consumindo `POST /api/v1/auth/login`
que devolvia apenas um access token de 15 minutos (`JWT_EXPIRES_IN=15m`).
O FE tinha que pedir ao usuário para refazer login a cada expiração — atrito
desnecessário em sessões longas (gestor revisando vistorias do dia).

O handoff `SPRINT-11-QI.md` (Sprint 11) listou refresh token como
top-priority herdado do FE; ver também ADR-004 (JWT RS256, sem sessão
server-side). Na Sprint 12 BE foi entregue `POST /api/v1/auth/refresh`.

Alternativas consideradas e o trade-off de persistência precisavam ser
fixados antes da migração futura para cookies httpOnly (item ainda
pendente — ver "Próximos passos").

## Decisão

Refresh token é um JWT RS256 assinado pela mesma chave do access, com:

- claim `type: "access" | "refresh"` no payload
- mesmo `issuer` e `audience` (sem cisão de chaves)
- `expiresIn` separado: `JWT_REFRESH_EXPIRES_IN` (default `7d`)
- nenhuma persistência server-side: refresh é stateless

Fluxo:

1. `POST /auth/login` retorna `{ access, refresh, expiresIn, refreshExpiresIn, user }`.
2. `POST /auth/refresh` valida o refresh (assinatura + `type === "refresh"` +
   usuário/tenant ativos via DB lookup), emite **novo par** access + refresh
   (rotação completa, mesmas TTLs do login).
3. Refresh com `type: "access"` ou access usado no endpoint de refresh → 401.

`AuthService.issueTokens()` centraliza a emissão; ambos os caminhos
(login e refresh) compartilham a mesma fábrica para evitar divergência.

## Alternativas Consideradas

- **Persistência em DB (tabela `refresh_tokens` com hash + revogação)** —
  mais seguro (revogação imediata, detecção de roubo de token via uso
  duplicado do refresh), porém exige migration + transação adicional em
  todo refresh. Adiada para um próximo ADR junto com cookies httpOnly,
  quando o ataque XSS contra `localStorage` se tornar uma preocupação real.
- **Refresh token com chave/audience distintos** — esconde melhor o
  refresh de erros de comparação acidental, mas dobra o gerenciamento de
  chaves RSA sem ganho substancial enquanto o flag `type` já vetar uso
  cruzado. Descartado por simplicidade.
- **Sliding access (sem refresh, expiração estendida no /me)** —
  re-emite access a cada `/me` se faltar < N minutos. Hack barato mas
  acopla refresh à navegação. Descartado.

## Consequências

### Positivas

- Zero migration; só código.
- Compatível com a infraestrutura JWT RS256 atual (ADR-004).
- API plugável para FE consumir refresh transparente no axios interceptor
  (item da Sprint 14 FE).

### Negativas / Riscos

- **Sem revogação** — um refresh roubado funciona até expirar (7d default).
  Mitigação parcial: TTL curto + reauth obrigatória no logout do FE
  (descartar refresh do storage). Risco aceitável para v1.
- **Sem detecção de reuso de refresh** — token rotacionado pode ser usado
  pelo atacante até a vítima também rotacionar (nesse momento ambos
  permanecem válidos até expirar). Endereçado quando vier persistência.
- **Storage no FE** — enquanto for `localStorage`, XSS sequestra o refresh.
  Migração para cookie httpOnly continua pendente; trataremos em ADR
  separado quando essa decisão for tomada (envolve CSRF, `SameSite`,
  CORS — interesse do FE Sprint 14+).

## Próximos passos

1. Sprint 14 FE: consumir `refresh` no interceptor axios para renovação
   transparente em 401.
2. ADR futuro: persistência de refresh + cookie httpOnly (resolve revogação
   e mitiga XSS de uma só vez).

## Agente Autor

BE

## Data

2026-05-20

## Sprint

S12
