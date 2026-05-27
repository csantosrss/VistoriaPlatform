# Sprint 36 — Changelog

**Período**: 2026-05-27
**Agente solo**: DOC (terceira volta do ciclo 8 abreviado)
**Tema**: Consolidação documental do autocomplete de bairros (S34-S35).

## Itens entregues

### 3 changelogs do ciclo abreviado

- [SPRINT-34.md](./SPRINT-34.md) — QI: doc de integração Nominatim +
  critérios.
- [SPRINT-35.md](./SPRINT-35.md) — FE: cliente + hook + datalist.
- [SPRINT-36.md](./SPRINT-36.md) — este.

### Índice atualizado

[docs/changelog/README.md](./README.md) ganha 3 linhas (S34, S35, S36).

### ADR-019 (novo)

[`ADR-019-nominatim-bairros.md`](../decisions/ADR-019-nominatim-bairros.md):
Nominatim como source-of-truth para autocomplete de bairros.
Alternativas descartadas (Overpass, ViaCEP, Google Places, hard-code,
não-implementar). Riscos (rate-limit, latência, dependência externa)

- mitigações + pendências forward-compat (`LOWER + unaccent` quando
  routing futuro cruzar; self-host se OSM bloquear).

### C4 container atualizado

[`docs/architecture/c4-container.md`](../architecture/c4-container.md):
container `apps/web` ganha consumo de
`https://nominatim.openstreetmap.org`. Tabela "Fluxos atuais" ganha
1 linha (`apps/web → Nominatim`).

### README raiz atualizado

[`README.md`](../../README.md): card de cobertura em `/users/:id`
agora menciona **autocomplete de bairro via OSM** (S35).

### Validação dos handoffs

3 handoffs do ciclo (`SPRINT-34-QI`, `SPRINT-35-FE`, este) revistos
contra os changelogs e o estado do código. Sem contradições.

## ADRs criados

- ADR-019 (Nominatim).

## Breaking changes

Nenhum.

## Métricas

- 3 changelogs novos.
- 1 ADR novo.
- 1 doc de arquitetura novo (criado no S34).
- 1 diagrama atualizado (C4 container).
- 1 README atualizado.
- 3 handoffs validados.

## Nota de processo

Segundo ciclo consecutivo no padrão **QI→FE→DOC** (ou variantes
sem alguns dos 5 agentes), inicializado pelo padrão **QI→BE→DOC**
do ciclo corretivo S31-S33. Funciona quando o trabalho se contém
em poucos agentes; o QI declara formalmente os no-ops no handoff
de abertura.

Próximo ciclo regular deve atacar o backlog cumulativo herdado dos
ciclos 6+ (publicar `vistoria.routed`, alert rule Prometheus,
relaxar `assertVistoriador` no list, cookie httpOnly, testes
unitários Users/Cobertura, etc).

## Known issues que ficam de pé

Mesma lista do S33 (15 itens), agora acrescida de:

16. **Cobertura de bairros via Nominatim**: cidades pequenas com
    poucos bairros mapeados → datalist vazia. UX preserva input
    livre, mas a sugestão é desigual.

## Pedidos abertos

Os pedidos do `SPRINT-33-DOC.md` para o ciclo regular **rolam mais
uma vez**, agora numerados a partir do **Sprint 37 QI**:

- **QI (Sprint 37)**: alert rule Prometheus DLQ > 0; validar
  pipeline pós-S36; mock IBGE/Nominatim estável (MSW) para
  testes determinísticos.
- **BE (Sprint 38)**: publicar `vistoria.routed`; detector de
  sobreposição na agenda; reset de senha dedicado; relaxar
  `assertVistoriador` em operações read-only.
- **IN (Sprint 39)**: dedup-by-eventId; endpoint HTTP que use
  `InternoProvider.consultar`.
- **FE (Sprint 40)**: cookie httpOnly; testes unitários Users e
  Cobertura; confirm de delete em coberturas; `AgendaPage` expõe
  mensagem do BE em 4xx.

## Próximo sprint

**Sprint 37 — QI**: começo do ciclo regular pós-correções.
