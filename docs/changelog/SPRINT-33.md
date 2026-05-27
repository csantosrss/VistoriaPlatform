# Sprint 33 — Changelog

**Período**: 2026-05-27
**Agente solo**: DOC (terceira volta do ciclo 7 corretivo)
**Tema**: Consolidação do ciclo corretivo do `/metrics`. IN e FE pulados (no-op declarado no SPRINT-31-QI.md).

## Itens entregues

### 3 changelogs do ciclo corretivo

- [SPRINT-31.md](./SPRINT-31.md) — QI: bug detectado +
  `metrics-endpoint.spec.ts` (contrato executável da correção).
- [SPRINT-32.md](./SPRINT-32.md) — BE: `VERSION_NEUTRAL` no
  `MetricsController` (1 linha + import).
- [SPRINT-33.md](./SPRINT-33.md) — este.

### Índice atualizado

[docs/changelog/README.md](./README.md) ganha 3 linhas (S31, S32, S33).

### ADR-016 atualizada

[ADR-016-metrics-endpoint-no-auth.md](../decisions/ADR-016-metrics-endpoint-no-auth.md)
ganha adendo "Sprint 32 BE (path correto)" explicando que o
`@Controller({ ..., version: undefined })` não desliga o
`defaultVersion: "1"` — só `VERSION_NEUTRAL`. A decisão arquitetural
(sem auth, network policy) **não muda**; é só nota técnica de
implementação.

### SPRINT-30.md atualizado

Bloco "Bugs latentes do ciclo 6 (acertados depois)" novo:

- `/metrics` ficou em `/v1/metrics` → resolvido em S32.
- `AgendaService.assertVistoriador` exige `providerId` para qualquer
  operação (inclusive GET) — bloqueia /agenda para vistoriador legado
  sem `providerId`. **Workaround** aplicado pelo usuário (PATCH em
  `vistoriador1.providerId = "interno"`); correção definitiva fica
  como pedido aberto.

### IN/FE no-op formal

Não há `SPRINT-33-IN.md` nem `SPRINT-34-FE.md` neste ciclo corretivo
— o handoff `SPRINT-31-QI.md` já declarou explicitamente que IN e FE
não têm trabalho. Padrão: **ciclo corretivo abreviado QI→BE→DOC**
quando a correção se contém em BE + infra + docs.

## ADRs criados

Nenhum diretamente. Candidato em aberto (não foi formalizado
porque o DOC só toca docs):

- "Ciclos corretivos abreviados QI→BE→DOC quando IN/FE são no-op"
  — formalizar como ADR-019 se o padrão se repetir. Por enquanto
  documentado neste changelog e no `SPRINT-31-QI.md`.

## Breaking changes

Nenhum (DOC nunca toca código). A correção do `/metrics` é
compatível com qualquer consumidor real (o único era o Prometheus
configurado pelo QI S26, que já apontava para `/metrics`).

## Métricas

- 3 changelogs novos (S31, S32, S33).
- 1 ADR atualizada (ADR-016 adendo).
- 1 changelog anterior atualizado (SPRINT-30.md).
- 1 índice atualizado (changelog/README.md).
- 0 ADRs novos.
- 1 spec Playwright novo (S31), 1 controller modificado (S32).
- 1 bug detectado em `pnpm dev:all` + 1 workaround operacional
  aplicado (providerId no vistoriador1).

## Nota de processo

A causa do bug não foi falha de algum agente — foi **gap no protocolo
de fechamento do DOC**: o DOC do S30 fechou o ciclo só com
typecheck/lint/test estático. Como o ciclo 6 introduziu **infra
nova** (Prometheus + scrape config) e **endpoints novos**
(`/metrics`, bulk endpoints), faltou um **smoke HTTP real** depois
do `pnpm dev:all`.

Proposta para o `CLAUDE.md` do DOC: quando o ciclo tocar infra ou
expuser endpoint novo, o DOC inclui no checklist de fechamento um
`pnpm dev:all` + `curl/Invoke-WebRequest` nos endpoints novos.
Decisão fica para o próximo DOC adotar.

O **workaround** do `providerId` foi escolhido pelo usuário e
aplicado. A correção definitiva (BE relaxa regra + FE expõe mensagem)
vai para o próximo ciclo regular.

## Known issues que ficam de pé

Lista cumulativa repassada ao próximo ciclo:

1. BE ainda não publica `vistoria.routed`.
2. Refresh em `localStorage`.
3. DLX sem alarme em DLQ — Prometheus agora **scrapeando OK** o
   `/metrics`, então alert rule destravada (próximo QI).
4. Sem dedup-by-eventId.
5. Slot da agenda não detecta sobreposição.
6. Sem testes unitários de Users/Cobertura no FE.
7. Senha plain-text em POST/PATCH `/users`.
8. `event-flow.md` desatualizado.
9. Lint warning em `button.tsx`.
10. Cidade/bairro como strings livres no BE.
11. IBGE pode estar fora do ar.
12. Lista de coberturas sem confirm de delete.
13. Test runner do `api-contracts` quebrado.
14. `InternoProvider.consultar()` sem endpoint HTTP no BE.
15. **(Novo)** `AgendaService.assertVistoriador` exige `providerId`
    em **qualquer** operação (inclusive list/remove) — bloqueia
    vistoriador legado. Workaround manual no `vistoriador1`
    aplicado; correção definitiva (relaxar no `list()` + FE expor
    mensagem) é pedido aberto.

## Pedidos abertos

Os pedidos do `SPRINT-30-DOC.md` para o ciclo regular pós-correção
**rolam para o próximo ciclo**, agora numerado a partir do
**Sprint 34 QI**:

- **QI (Sprint 34)**: alert rule Prometheus DLQ > 0 (now possível
  com `/metrics` OK); validar pipeline pós-S33; mock IBGE estável.
- **BE (Sprint 35)**: publicar `vistoria.routed`; detector de
  sobreposição na agenda; reset de senha dedicado; **relaxar
  `assertVistoriador` no `list()` + variantes read-only**.
- **IN (Sprint 36)**: dedup-by-eventId; endpoint HTTP que use
  `InternoProvider.consultar`.
- **FE (Sprint 37)**: cookie httpOnly + persistência server-side;
  testes unitários Users/Cobertura; confirm de delete em coberturas;
  **`AgendaPage` exibe mensagem detalhada do BE em 4xx** (não
  genérico "Falha ao carregar slots").

## Próximo sprint

**Sprint 34 — QI**: começo do ciclo 8 (primeiro ciclo regular
pós-corretivo).
