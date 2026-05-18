# ADR-009: Mappings parceiro→enum como `Record` imutável (vs strategy pattern)

## Status

Aceita

## Contexto

Cada parceiro tem seu próprio vocabulário de status:

- **Rede Vistorias** (inglês): `PENDING`, `SCHEDULED`, `CONFIRMED`, `IN_PROGRESS`, `REPORT_PENDING`, `COMPLETED`, `CANCELED`
- **Conceitual** (português): `AGUARDANDO`, `AGENDADA`, `EM_VISTORIA`, `AGUARDANDO_LAUDO`, `LAUDO_OK`, `FINALIZADA`, `CANCELADA`

Precisamos converter para `StatusVistoria` unificado de `@vistoria/api-contracts` (9 estados da SAGA).

## Decisão

Mappings como `Readonly<Record<PartnerStatus, StatusVistoria>>` em `packages/api-contracts/src/webhooks/index.ts`:

- `REDE_VISTORIAS_TO_STATUS`
- `CONCEITUAL_TO_STATUS`

Cada provider (`RedeVistoriasProvider`, `ConceitualProvider`) expõe um método estático `mapStatus()` que delega ao Record.

## Alternativas Consideradas

- **Strategy pattern**: cada provider tem uma classe `StatusMapper` injetável. Mais "OO-correto" mas overkill para o que é uma função pura.
- **Switch case dentro do provider**: simples, mas repetitivo e o mapping não fica acessível para outras camadas (ex.: relatórios de auditoria que precisam reverter o mapping).

## Consequências

- **Positivas**: o mapping é uma constante exportada — pode ser auditada visualmente, testada isoladamente (e é, em `webhooks.spec.ts`), revertida (`Object.entries`) se necessário. TypeScript garante exaustividade: se um novo status entrar no enum do parceiro, o tipo `Record<PartnerStatus, StatusVistoria>` quebra a compilação.
- **Negativas**: lógica de mapeamento mais complexa (ex.: condicional baseada em outro campo) precisaria de uma função, não um Record. Solução: refatorar o provider específico quando necessário.
- **Riscos**: estado terminal divergente. Ex.: Rede Vistorias pode ter `EXPIRED` (sem mapping ainda); Zod schema do parceiro controla quais valores entram, então um `EXPIRED` não-mapeado é bloqueado na validação antes de chegar ao mapping.

## Agente Autor

IN

## Data

2026-04-26

## Sprint

S03

## Referências

- Sync original: `docs/agent-sync/SPRINT-03-IN-TO-DOC.md`
- Mappings: `packages/api-contracts/src/webhooks/index.ts`
- Tests: `packages/api-contracts/src/webhooks/webhooks.spec.ts`
- Diagrama: `docs/architecture/status-mapping.md`
