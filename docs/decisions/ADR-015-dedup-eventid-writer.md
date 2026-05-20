# ADR-015: `eventId` no writer como identidade de dedup forward-compat

## Status

Aceita

## Contexto

A Sprint 12 BE entregou o consumer de `vistoria.status.changed` com
dedup _by-final-status_: se a vistoria já está no `newStatus`, o evento
é descartado. Isso protege contra duplicatas que resultam no mesmo
estado terminal, mas não distingue:

1. Duplicata legítima de processamento (retry do broker) — desejável descartar.
2. Reabertura legítima (e.g., vistoria volta de `LAUDO_PENDENTE` para
   `EM_EXECUCAO` por correção, depois volta a `LAUDO_PENDENTE`) — não
   é a mesma transição; o by-final-status ignoraria a segunda como duplicata.

Hoje o cenário (2) não existe — a SAGA da plataforma é monotônica até
`CANCELADA`/`CONCLUIDA`. Mas o pattern de identidade por evento é o
mecanismo padrão de dedup distribuído e fica útil para:

- Tracing/observabilidade (`messageId` no AMQP, `eventId` no body, mesmo valor).
- Dedup cross-publisher (se IN publicar mesma transição duas vezes via
  hosts diferentes, identidade por valor evita reprocessamento).
- Migração futura para outbox: o outbox grava `eventId` no DB; o publisher
  reusa-o no broker; consumer dedupa via Redis SETEX por `eventId`.

A Sprint 13 IN faz a parte do publisher: cada evento ganha um `eventId`
UUID v4 gerado se o caller não fornecer. Consumer (BE) ainda usa o
dedup by-final-status; pode evoluir para dedup-by-eventId quando a dor
aparecer.

## Decisão

`VistoriaStatusUpdate` (port em `packages/integrations`) e
`VistoriaStatusChangedEventSchema` (em `@vistoria/api-contracts`)
ganham campo `eventId` (string, UUID v4) **opcional**.

`RmqVistoriaStatusWriter`:

- Se o caller não passar `eventId`, gera com `node:crypto.randomUUID()`.
- Publica:
  - no **payload** (campo `eventId`).
  - no **header AMQP** `eventId`.
  - na **property AMQP `messageId`** (padrão AMQP de identidade).
- Todos com o mesmo valor — single source of truth.

Schema mantém `eventId` opcional para que consumidores legacy não
quebrem. O writer atual sempre preenche; consumidores podem assumir
presença a partir da Sprint 13.

## Alternativas Consideradas

- **Dedup por `(vistoriaId, newStatus, source)` sem eventId** — barato,
  mas falha exatamente no cenário (2) acima. Não escala para reabertura.
- **Dedup com Redis SETEX(`eventId`, TTL)** no consumer **agora** —
  agrega valor real mas exige Redis no BE (custo de infra). Adiado até o
  cenário (2) virar real ou IN publicar duplicatas reais.
- **Outbox table no IN** — overkill. Sprint 13 IN ainda não tem persistência
  própria; o `RmqVistoriaStatusWriter` é stateless. Futuro ADR avalia.
- **Snowflake/ULID em vez de UUID** — UUID v4 é suficiente para taxa de
  publicação esperada; nenhum benefício de ordenação aqui.

## Consequências

### Positivas

- Tracing fica trivial: `eventId` único cruza publisher → broker → consumer
  → audit log.
- Consumer pode evoluir para dedup estrito sem mexer no publisher.
- AMQP `messageId` populado abre porta para confirmação manual /
  reprocessamento (`channel.get + messageId` em scripts forenses).

### Negativas / Riscos

- Mais um campo no payload — overhead negligível (~38 bytes).
- Não substitui o dedup atual; é forward-compat. Consumer ainda precisa
  da lógica by-final-status até a próxima evolução.
- Header `eventId` é redundante com property `messageId` — mantemos
  ambos para facilitar inspeção em UIs (ex.: RabbitMQ Management).

## Próximos passos

1. BE Sprint 16+: avaliar dedup por `eventId` quando reabertura virar
   caso real (Redis SETEX, ou tabela `processed_events`).
2. Quando o outbox pattern entrar (ADR futuro), `eventId` já é a chave
   primária natural.

## Agente Autor

IN

## Data

2026-05-20

## Sprint

S13
