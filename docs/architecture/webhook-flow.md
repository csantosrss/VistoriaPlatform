# Webhook Flow — Recebimento e Verificação

Como webhooks de parceiros são recebidos, autenticados e roteados. Decisões em [ADR-007](../decisions/ADR-007-webhook-hmac-sha256.md) e [ADR-009](../decisions/ADR-009-status-mapping-record.md).

## Sequência completa

```mermaid
sequenceDiagram
    participant P as Parceiro<br/>(Rede Vistorias / Conceitual)
    participant CDN as Edge / TLS
    participant API as apps/api
    participant Ctrl as WebhookController
    participant Ver as WebhookSignatureVerifier
    participant Prov as Provider concreto
    participant Pub as RmqPublisher (futuro)
    participant Saga as VistoriaSagaService (futuro)
    participant Audit as AuditLog

    P->>CDN: POST /api/v1/integrations/<br/>webhooks/rede-vistorias<br/>Headers: x-rv-signature: hex(HMAC-SHA256)<br/>Body: { event, inspectionId, status, ... }
    CDN->>API: encaminha
    API->>Ctrl: receive(provider, body, headers)
    Ctrl->>Ver: verify(rawBody, signature, secret)
    alt assinatura inválida
        Ver-->>Ctrl: false
        Ctrl-->>P: 403 Forbidden
    else assinatura ok
        Ver-->>Ctrl: true
        Ctrl->>Prov: receberWebhook(body)
        Prov->>Prov: Zod.parse(body) → falha = 400
        Prov->>Prov: mapStatus(parceiro) → StatusVistoria
        Note over Prov,Saga: BE Sprint próximo:<br/>1. Buscar vistoria por externalId<br/>2. saga.transition() → emite evento<br/>3. AuditLog.write
        Prov->>Pub: publish('vistoria.<status>', payload)
        Prov->>Audit: write({ resourceType:'Vistoria', ... })
        Ctrl-->>P: 204 No Content
    end
```

## Defesas em camadas

```mermaid
flowchart TB
    In[Webhook recebido] --> L1{TLS válido?}
    L1 -- Não --> Drop1[Drop no edge]
    L1 -- Sim --> L2{Provider existe?}
    L2 -- Não --> Resp400[400 Bad Request]
    L2 -- Sim --> L3{HMAC válido?}
    L3 -- Não --> Resp403[403 Forbidden<br/>+ log warn]
    L3 -- Sim --> L4{Schema Zod ok?}
    L4 -- Não --> Resp400b[400 Bad Request]
    L4 -- Sim --> L5{Já processado?<br/>idempotência - futuro}
    L5 -- Sim --> Resp204Idem[204 No Content<br/>no-op]
    L5 -- Não --> Process[Provider.receberWebhook<br/>→ SAGA → AuditLog]
    Process --> Resp204[204 No Content]
```

## Configuração por parceiro

| Parceiro       | Header de assinatura     | Env var de secret               | Path                                                |
| -------------- | ------------------------ | ------------------------------- | --------------------------------------------------- |
| Rede Vistorias | `x-rv-signature`         | `REDE_VISTORIAS_WEBHOOK_SECRET` | `POST /api/v1/integrations/webhooks/rede-vistorias` |
| Conceitual     | `x-conceitual-signature` | `CONCEITUAL_WEBHOOK_SECRET`     | `POST /api/v1/integrations/webhooks/conceitual`     |

Em dev, secrets vazios — verificação retorna `false` → 403. Para testar localmente:

```bash
SECRET="dev-secret-rv"
SIG=$(printf '%s' "$BODY" | openssl dgst -sha256 -hmac "$SECRET" -hex | awk '{print $2}')
curl -X POST http://localhost:3000/api/v1/integrations/webhooks/rede-vistorias \
  -H "Content-Type: application/json" -H "x-rv-signature: $SIG" \
  -d "$BODY"
```

## Pendências críticas

1. **Raw body capture**: o NestJS faz `JSON.parse` antes do controller, então o HMAC é computado contra `JSON.stringify(body)` (fallback) que pode diferir do body original em whitespace/ordem. Solução documentada em [ADR-007](../decisions/ADR-007-webhook-hmac-sha256.md):

   ```ts
   // apps/api/src/main.ts
   app.use(
     json({
       verify: (req, _res, buf) => {
         (req as any).rawBody = buf;
       },
     }),
   );
   ```

2. **Idempotência**: replay attacks ainda viáveis. Sprint próximo deve cachear `inspectionId + occurredAt` em Redis com TTL de 24h.

3. **Timestamp validation**: rejeitar webhooks com `occurredAt > 5min no passado` para mitigar replay com signature válida.

4. **Audit log de webhooks recebidos**: ainda não escrito. FE Sprint 04 deixou pendente uma tela "Webhooks recebidos" que dependerá disso.
