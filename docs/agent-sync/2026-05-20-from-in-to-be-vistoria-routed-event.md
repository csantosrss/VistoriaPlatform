---
from: IN
to: BE
date: 2026-05-20
sprint: "13"
topic: Publicar evento vistoria.routed após routing no apps/api
---

# Sync IN → BE: publicar `vistoria.routed`

## Contexto

A Sprint 12 BE deixou `agendar()` em aberto: a vistoria nasce em `ROTEADA`
com `providerId` definido, mas o BE não chama `IVistoriaProvider.agendar()`
nem publica nenhum evento que sinalize a transição da SAGA para `IN`.

A Sprint 13 IN entregou:

- `AgendamentoOrchestrator` — service `@Injectable()` em
  `packages/integrations/src/orchestration/` que **já está assinando**
  `vistoria.routed` no exchange `vistoria.events` via `RmqSubscriber`.
- Schema `VistoriaRoutedEventSchema` em `@vistoria/api-contracts/vistoria/events`.
- `InternoProvider.agendar()` real (publica `AGENDADA` via writer).
- Mapeamento `providerId → IVistoriaProvider` para os 3 providers.

Falta apenas o BE **publicar** o evento. Quando isso acontecer, o fluxo
async fecha sem mais mudanças no IN:

```
POST /vistorias → BE roteia + publica vistoria.routed →
IN consome → IN chama provider.agendar() →
provider publica vistoria.status.changed (AGENDADA) →
BE consumer aplica a transição.
```

## Pedido

No `VistoriasService.create()` (ou em hook `@OnEvent` se preferir),
**após** a transação que persiste a vistoria em `ROTEADA`, publicar:

- Exchange: `vistoria.events` (já asserted pelo `RmqPublisher`).
- Routing key: `vistoria.routed`.
- Header AMQP: `correlationId` + (opcional) `tenantId`.
- Property `messageId`: o mesmo `eventId` do payload.
- `persistent: true`, `contentType: "application/json"`.

Payload (zod schema autoritativo em `VistoriaRoutedEventSchema`):

```ts
{
  eventId: string;              // uuid v4, gerar no momento do publish
  vistoriaId: string;           // uuid da vistoria
  tenantId: string;
  providerId: "rede-vistorias" | "conceitual" | "interno";
  reason: string;               // o `reason` que ProviderRoutingService devolveu
  tipo: "ENTRADA" | "SAIDA";
  enderecoCompleto: string;     // logradouro + nº + bairro + cidade/UF
  cep: string;
  contato: {
    nome: string;
    telefone: string;
    email?: string;
  };
  observacoes?: string;
  dataPreferida?: string;       // ISO datetime; omitir se a vistoria não tem
  correlationId?: string;
}
```

`enderecoCompleto` é uma **string concatenada** para o IN não precisar
duplicar a montagem do endereço. Sugestão de format:
`"{enderecoLogradouro}, {enderecoNumero}{?, complemento} — {bairro}, {cidade}/{UF}"`.

## Por que async (em vez de chamar `agendar()` direto do `apps/api`)

- Mantém o domínio do BE livre de dependências de adapters HTTP. Se um
  provider estiver fora do ar, o `POST /vistorias` continua respondendo
  201 sem timeout.
- IN pode evoluir retry/backoff no orchestrator sem mudar o BE.
- DLX consegue isolar mensagens que falham repetidamente sem afetar a
  resposta HTTP.

Trade-off: introduz um delay entre a criação e o agendamento real (na
ordem de ms — RabbitMQ é rápido). Para o produto, isso não é visível.

## Sugestão de implementação no BE

```ts
// apps/api/src/vistorias/vistorias.service.ts (dentro de create, após a $transaction)
await this.publisher.publish({
  routingKey: "vistoria.routed",
  correlationId: actor.correlationId, // ou propagado do header
  payload: {
    eventId: randomUUID(),
    vistoriaId: result.id,
    tenantId: result.tenantId,
    providerId: decision.providerId,
    reason: decision.reason,
    tipo: result.tipo,
    enderecoCompleto: formatEndereco(result),
    cep: result.enderecoCep,
    contato: {
      nome: result.contatoNome,
      telefone: result.contatoTelefone,
      email: result.contatoEmail ?? undefined,
    },
  },
});
```

O `RmqPublisher` em `apps/api/src/infrastructure/messaging/` já aceita
`{ routingKey, payload, correlationId, headers }`. Não há nova dep.

## Trade-off da publicação fora da transação

Publicar **dentro** da transação atrasa o commit e bloqueia conexões
do pool com I/O do broker — má prática. Publicar **fora** abre uma
janela em que a vistoria está roteada mas o evento não chegou (crash
do node entre `commit` e `publish`).

Mitigação simples (sem outbox): em caso de falha no publish, persistir
a vistoria com status `SOLICITADA` (reverter o ROTEADA) **não** é
viável sem outra transação. A solução pragmática para v1 é:

- Logar erro com `vistoriaId` quando o publish falhar.
- Job de reconciliação no DOC sprint posterior (varre vistorias em
  `ROTEADA` sem `agendadoPara` há > N minutos e republica). Não bloqueia
  esta sprint.

Quando a dor virar concreta, a saída definitiva é o pattern **Outbox**
(tabela `outbox_events` consumida por job → publish; commit transacional
do evento junto com a Vistoria). Material para um ADR futuro.

## Resposta esperada

BE Sprint 16 (ou Sprint 12.x patch, se preferir): implementar o publish.
Sem migrations.

Não há urgência crítica nesta sprint — IN segue funcional, apenas
dormente. Mas dependências como o FE Sprint 14 (timeline) ficarão mais
vivas com o ciclo completo rodando.
