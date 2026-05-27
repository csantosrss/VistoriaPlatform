---
agent: DOC
sprint: "36"
date: 2026-05-27
---

# Handoff — Sprint 36 (DOC) → Sprint 37 (QI)

## Resumo

DOC fechou o ciclo 8 abreviado QI34 → FE35 → DOC36 (BE/IN no-op).

- 3 changelogs novos (S34, S35, S36).
- ADR-019 (Nominatim como source de bairros).
- C4 container ganha `apps/web → Nominatim` (subgraph "Externos"
  agora inclui IBGE e Nominatim explícitos).
- README raiz: card de cobertura menciona autocomplete de bairro via
  OSM.

Próximo agente é o **QI** (Sprint 37) — começo do ciclo regular
pós-correções/feature requests.

## Pedidos abertos para o ciclo regular (Sprint 37+)

Acumulados há vários ciclos — alguns rolando desde o S30:

### QI (Sprint 37)

- **Alert rule do Prometheus para DLQ size > 0** (destravado desde S32
  com `/metrics` funcionando).
- Validar `pnpm test:e2e` pós-S36 (38 specs).
- **Mock de IBGE + Nominatim via MSW** para testes determinísticos.
  Sem isso, testes que exercitam autocomplete são flaky.
- (Considerar) Adendo ao `CLAUDE.md` do DOC: smoke HTTP no
  fechamento de ciclos que tocam infra/endpoints — pendente desde
  o handoff S33-DOC.

### BE (Sprint 38)

- Publicar `vistoria.routed` (pendência mais antiga, ~4 ciclos).
- Detector de sobreposição na agenda.
- Reset de senha dedicado.
- **Relaxar `AgendaService.assertVistoriador`** em operações
  read-only (`list()`/`remove()` não deveriam exigir `providerId`).
  Resolve o bug-pai que motivou o workaround manual no S33.

### IN (Sprint 39)

- Dedup-by-eventId.
- Endpoint HTTP que use `InternoProvider.consultar` (opcional).

### FE (Sprint 40)

- Cookie httpOnly + refresh server-side.
- Testes unitários para Users e Cobertura.
- Confirm de delete em coberturas.
- **`AgendaPage`: expor mensagem do BE em 4xx** em vez de "Falha
  ao carregar slots" genérico.

## Validação

- 3 handoffs do ciclo 8 abreviado revistos contra changelogs e
  código. Sem contradições.
- ADR-019 linkado bidirecionalmente com `nominatim-integration.md`.
- C4 atualizado: 2 origens externas novas no diagrama Mermaid
  (`ibge`, `nom`) + 2 flechas (`web → ibge`, `web → nom`).

## Known issues que ficam de pé (cumulativo, 16 itens)

Igual ao S33 +1 do Nominatim:

1. BE ainda não publica `vistoria.routed`.
2. Refresh em `localStorage`.
3. DLX sem alarme em DLQ — Prometheus OK, alert rule pendente
   (Sprint 37).
4. Sem dedup-by-eventId.
5. Slot da agenda não detecta sobreposição.
6. Sem testes unitários Users/Cobertura no FE (Agenda agora tem).
7. Senha plain-text em POST/PATCH `/users`.
8. `event-flow.md` desatualizado.
9. Lint warning em `button.tsx`.
10. Cidade/bairro como strings livres no BE (`LOWER + unaccent`
    pendente para routing futuro).
11. IBGE pode estar fora do ar.
12. Lista de coberturas sem confirm de delete.
13. Test runner do `api-contracts` quebrado.
14. `InternoProvider.consultar()` sem endpoint HTTP no BE.
15. `assertVistoriador` exige `providerId` em qualquer operação
    (workaround manual no `vistoriador1` aplicado no S33).
16. **(Novo S36)** Cidades pequenas têm cobertura desigual no
    Nominatim — datalist vai vazia; UX preserva input livre.

## Nota de processo

**3º ciclo consecutivo abreviado** (S26-30 cheio → S31-33 abreviado
QI→BE→DOC → S34-36 abreviado QI→FE→DOC). O padrão se firmou: quando
um pedido se contém em poucos agentes, o QI declara no-op dos demais
no handoff de abertura e o ciclo roda com 2 ou 3 sprints.

Se aparecer um terceiro caso de abreviação, vale formalizar como
**ADR-020** ("ciclos abreviados QI→X→DOC").

## Próximo Sprint

**Sprint 37 — QI**: começo do ciclo regular, finalmente atacando
o backlog herdado.
