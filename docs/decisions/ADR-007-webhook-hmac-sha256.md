# ADR-007: HMAC-SHA256 para webhooks de parceiros (vs assinatura assimétrica)

## Status

Aceita

## Contexto

Cada parceiro (Rede Vistorias, Conceitual) envia webhooks com mudança de status. Precisamos garantir que o emissor é o parceiro real e que o payload não foi adulterado em trânsito.

## Decisão

**HMAC-SHA256** com segredo compartilhado por parceiro. Cada parceiro tem sua env var `*_WEBHOOK_SECRET` e um header HTTP customizado:

- Rede Vistorias: `x-rv-signature` + `REDE_VISTORIAS_WEBHOOK_SECRET`
- Conceitual: `x-conceitual-signature` + `CONCEITUAL_WEBHOOK_SECRET`

Verificação via `crypto.createHmac('sha256', secret)` + `timingSafeEqual` (proteção contra timing attacks).

## Alternativas Consideradas

- **Assinatura assimétrica (RSA/Ed25519)**: parceiros teriam um par de chaves; nós só validamos com a pública. Mais seguro contra vazamento do segredo no nosso lado, mas tanto Rede Vistorias quanto Conceitual usam HMAC nas suas docs públicas — adotar assimétrico exigiria custom integration que provavelmente eles não suportam.
- **mTLS no gateway**: garante identidade do remetente em camada de transporte, mas não verifica integridade do payload por si só. Pode coexistir como defense-in-depth.

## Consequências

- **Positivas**: implementação simples (`crypto.createHmac` + `timingSafeEqual`), zero dependências externas; alinhado com práticas dos parceiros.
- **Negativas**: o segredo precisa estar disponível em texto claro no nosso ambiente — comprometimento permite forjar webhooks. Mitigar com secret manager (Vault, AWS SM) e rotação periódica.
- **Riscos**: replay attacks. Sprint próximo precisa adicionar:
  - Idempotência (cache do `inspectionId`+`occurredAt` em Redis com TTL de 24h)
  - Validação de timestamp recente (rejeitar webhooks com `occurredAt` >5min no passado)

## Pendência Operacional

O `WebhookController` precisa do **raw body** para verificar HMAC, mas o NestJS já parsa JSON antes de chegar ao handler. Mitigação atual: fallback `JSON.stringify(body)` (funciona em dev). **Ação para QI/BE Sprint próximo**: registrar middleware no `main.ts`:

```ts
app.use(
  json({
    verify: (req, _res, buf) => {
      (req as any).rawBody = buf;
    },
  }),
);
```

## Agente Autor

IN

## Data

2026-04-26

## Sprint

S03

## Referências

- Sync original: `docs/agent-sync/SPRINT-03-IN-TO-DOC.md`
- Verifier: `packages/integrations/src/webhooks/signature-verifier.ts`
- Controller: `packages/integrations/src/webhooks/webhook.controller.ts`
