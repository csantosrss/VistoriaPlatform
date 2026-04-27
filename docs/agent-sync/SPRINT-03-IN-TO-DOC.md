---
from: IN
to: DOC
sprint: "03"
date: 2026-04-26
topic: "Decisões arquiteturais do pacote @vistoria/integrations"
---

# Sync IN → DOC — Sprint 03

Olá DOC. Três decisões não-triviais foram tomadas no design dos adapters e webhooks. Material bruto abaixo para virarem ADR-007 a ADR-009.

---

## ADR-007: Verificação HMAC-SHA256 para webhooks de parceiros (vs assinatura assimétrica)

### Contexto

Cada parceiro (Rede Vistorias, Conceitual) envia webhooks com mudança de status. Precisamos garantir que o emissor é o parceiro real (e não um atacante) e que o payload não foi adulterado em trânsito.

### Decisão

**HMAC-SHA256** com segredo compartilhado por parceiro. Cada parceiro tem sua env var `*_WEBHOOK_SECRET` e um header HTTP customizado (`x-rv-signature`, `x-conceitual-signature`).

### Alternativas Consideradas

- **Assinatura assimétrica (RSA/Ed25519)**: parceiros teriam um par de chaves; nós só validamos com a pública. Mais seguro contra vazamento do segredo no nosso lado, mas tanto Rede Vistorias quanto Conceitual usam HMAC nas suas docs públicas — adotar assimétrico exigiria custom integration que eles provavelmente não suportam.
- **mTLS no proxy/gateway**: garante identidade do remetente em camada de transporte, mas não verifica integridade do payload por si só. Pode coexistir como defense-in-depth.

### Consequências

- **Positivas**: implementação simples (`crypto.createHmac` + `timingSafeEqual`), zero dependências externas; alinhado com práticas dos parceiros.
- **Negativas**: o segredo precisa estar disponível em texto claro no nosso ambiente — comprometimento permite forjar webhooks. Mitigar com secret manager (Vault, AWS SM) e rotação periódica.
- **Riscos**: replay attacks. Sprint posterior precisa adicionar idempotência (cache do `inspectionId`+`occurredAt` em Redis com TTL de 24h) e/ou validar timestamp recente.

### Autor

IN | Sprint S03

---

## ADR-008: axios + axios-retry para HTTP client de parceiros (vs node-fetch + p-retry)

### Contexto

`BaseHttpProvider` precisa de HTTP client com timeout, retry exponencial em falhas transitórias (5xx, ECONNRESET) e interceptors para logging/correlation-id.

### Decisão

**axios 1.7 + axios-retry 4.5**.

### Alternativas Consideradas

- **node-fetch + p-retry**: dependência menor, API native fetch (mais futureproof). Porém, configurar retry condicional baseado em status code/error type pede mais boilerplate.
- **undici + custom retry**: undici (cliente HTTP do Node.js core) é o mais rápido, mas API ainda em estabilização e ergonomia menos cuidada.

### Consequências

- **Positivas**: Axios tem ecossistema maduro, `axios-retry` lida com `isNetworkOrIdempotentRequestError` out-of-the-box, interceptors são triviais de adicionar para tracing.
- **Negativas**: Axios usa internamente o `http` do Node, não o undici — perde-se algum throughput em alta concorrência. Para nosso volume (centenas de calls/dia por tenant), irrelevante.
- **Riscos**: nenhum significativo. Migração futura para undici seria uma reescrita do `BaseHttpProvider` apenas — adapters concretos não veriam diferença.

### Autor

IN | Sprint S03

---

## ADR-009: Mappings de status parceiro→enum como `Record` imutável (vs strategy pattern)

### Contexto

Cada parceiro tem seu próprio vocabulário de status (Rede Vistorias usa inglês: PENDING/SCHEDULED/...; Conceitual usa português: AGUARDANDO/AGENDADA/...). Precisamos converter para o enum `StatusVistoria` unificado de `@vistoria/api-contracts`.

### Decisão

Mapping como `Readonly<Record<PartnerStatus, StatusVistoria>>` em `packages/api-contracts/src/webhooks/index.ts` (`REDE_VISTORIAS_TO_STATUS`, `CONCEITUAL_TO_STATUS`). Cada provider expõe um método estático `mapStatus()` que delega ao Record.

### Alternativas Consideradas

- **Strategy pattern**: cada provider tem uma classe `StatusMapper` injetável. Mais "OO-correto" mas overkill para o que é uma função pura.
- **Switch case dentro do provider**: simples, mas repetitivo e o mapping não fica acessível para outras camadas (ex.: relatórios de auditoria que precisam reverter o mapping).

### Consequências

- **Positivas**: o mapping é uma constante exportada — pode ser auditada visualmente, testada isoladamente (e é, em `webhooks.spec.ts`), e revertida (`Object.entries`) se necessário. TypeScript garante exaustividade: se um novo status for adicionado ao enum do parceiro, o tipo `Record<PartnerStatus, StatusVistoria>` quebra a compilação.
- **Negativas**: lógica de mapeamento mais complexa (ex.: condicional baseada em outro campo) precisaria de uma função, não um Record. Solução: refatorar o provider específico quando necessário.
- **Riscos**: estado terminal divergente. Ex.: Rede Vistorias pode ter `EXPIRED` (sem mapping ainda); precisa entrar em sprint próximo. Mitigação: Zod schema do parceiro controla quais valores entram, então um `EXPIRED` não-mapeado é bloqueado na validação antes de chegar ao mapping.

### Autor

IN | Sprint S03

---

## Solicitação ao DOC

1. Criar `docs/decisions/ADR-007-webhook-hmac-sha256.md`, `ADR-008-axios-vs-fetch.md`, `ADR-009-status-mapping-record.md` usando `ADR-TEMPLATE.md`
2. Linkar todos no `docs/changelog/SPRINT-03.md` ao consolidar o sprint
3. Diagrama Mermaid sugerido em `docs/architecture/webhook-flow.md`:
   - Sequence: Parceiro → Edge (TLS) → WebhookController → SignatureVerifier → Provider.receberWebhook → RmqPublisher → Domain handler (BE futuro)
4. Diagrama de mapping de status: matriz visual partner-status × StatusVistoria, com os 9 estados da SAGA no eixo Y e os 7+7 status dos parceiros no eixo X
