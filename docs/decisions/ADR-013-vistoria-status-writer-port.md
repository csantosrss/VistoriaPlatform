# ADR-013: IN escreve Vistoria.status via port + evento RMQ

## Status

Aceita

## Contexto

O agente IN (`packages/integrations`) recebe webhooks dos parceiros (Rede Vistorias, Conceitual) com mudanças de status. Essas mudanças precisam transitar a SAGA da `Vistoria` (entidade do BE em `apps/api`), criando `VistoriaTransicao` e `AuditLog`. Porém o `CLAUDE.md` do agente IN é explícito:

> NUNCA altere `domain/` ou `application/` (responsabilidade de BE)
> NUNCA importe diretamente código de `apps/`

Então IN não pode chamar `VistoriasService` diretamente. Era necessário definir um contrato de fronteira que mantenha a separação de agentes e ainda assim permita ao IN sinalizar "essa Vistoria precisa transitar para status X".

## Decisão

1. **Port** (`VistoriaStatusWriterPort`) declarado em `packages/integrations/src/ports/vistoria-status-writer.port.ts`:

   ```ts
   export interface VistoriaStatusWriterPort {
     update(input: VistoriaStatusUpdate): Promise<void>;
   }
   ```

   Com o token de DI `VISTORIA_STATUS_WRITER` (string) usado pelo Nest para resolver a implementação em runtime.

2. **Implementação default**: `RmqVistoriaStatusWriter` em `packages/integrations/src/messaging/`, que **publica** o evento `vistoria.status.changed` no exchange topic `vistoria.events` (já assinado por `RmqSubscriber` no Sprint 03).

3. **`IntegrationsModule.forRoot()`** registra `RmqVistoriaStatusWriter` e expõe o token. Consumidores (apps/api) podem sobrescrever via DI se quiserem uma implementação direta (síncrona, in-process), mas o default é assíncrono via RMQ.

4. **BE consumirá o evento** num sprint futuro: registra um handler em `RmqSubscriber.subscribe('vistoria.status.changed', ...)` que aplica a transição na entidade Vistoria, cria `VistoriaTransicao` e `AuditLog`.

## Alternativas Consideradas

- **Importar `VistoriasService` direto do `apps/api`** — viola o `CLAUDE.md` do IN; cria acoplamento bidirecional (apps/api já importa `IntegrationsModule`); circular dependency potencial.
- **HTTP call interno** (`POST /api/v1/vistorias/:id/status`) — desnecessariamente externalizado, duplica autenticação, e a chamada vinda do mesmo processo é um anti-padrão; introduziria latência e ponto de falha.
- **Compartilhar uma classe abstrata no `packages/api-contracts`** — `api-contracts` deve ser livre de NestJS (apenas Zod + tipos). Misturaria responsabilidades.
- **Eventos RMQ sem port** — IN publicaria direto via `RmqPublisher`. Funcionaria mas mistura camadas: webhook handler precisa saber qual exchange/routing-key usar. Port abstrai isso.

## Consequências

- **Positivas**:
  - IN permanece independente de `apps/api`. Boundary respeitado.
  - Mudanças de status passam pela mesma fila que demais eventos da SAGA — observabilidade unificada.
  - Testabilidade alta: nos testes do controller de webhook, basta injetar um stub do `VistoriaStatusWriterPort`.
  - Permite múltiplas implementações (RMQ default; in-process síncrono para testes; mock para CI).
- **Negativas**:
  - Atualização é assíncrona: pequeno gap entre webhook recebido e Vistoria atualizada. Aceitável porque webhook → mudança de status é fluxo eventualmente consistente por natureza.
  - Requer que o BE registre o handler `vistoria.status.changed` em sprint próximo para o fluxo ficar realmente ponta-a-ponta. Até lá, eventos vão para a queue mas não são processados.
- **Riscos**:
  - Se o evento for perdido (RMQ caiu, handler crashou), a Vistoria fica desatualizada. Mitigação: dead-letter queue já configurada (`${exchange}.dlx`).
  - Sequência fora de ordem em transições rápidas — IN não garante ordem entre webhooks. BE deve verificar status atual antes de aplicar a transição (idempotência).

## Agente Autor

IN

## Data

2026-05-19

## Sprint

S08

## Referências

- Port: `packages/integrations/src/ports/vistoria-status-writer.port.ts`
- Default impl: `packages/integrations/src/messaging/rmq-vistoria-status-writer.service.ts`
- Wiring: `packages/integrations/src/integrations.module.ts`
- ADR-001 (RabbitMQ vs Kafka)
- ADR-006 (amqplib vs @nestjs/microservices)
