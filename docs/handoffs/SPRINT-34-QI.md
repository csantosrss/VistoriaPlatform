---
agent: QI
sprint: "34"
date: 2026-05-27
---

# Handoff — Sprint 34 (QI) → Sprint 35 (FE)

## Resumo

Ciclo 8 começa atendendo uma **feature request** do usuário detectada
ao testar a cobertura no browser pela primeira vez: o campo "Bairro"
do `AddCoberturaForm` é input livre (IBGE não cobre bairros) — usuário
esperava autocomplete como na cidade.

**Decisão de fonte**: Nominatim (OpenStreetMap) via typeahead com
debounce. Documentação completa em
[`docs/architecture/nominatim-integration.md`](../architecture/nominatim-integration.md).

**Escopo abreviado**: BE e IN no-op declarados (Nominatim é HTTP
público chamado direto do FE, igual ao IBGE — não há trabalho no
backend). Ciclo roda como **QI34 → FE35 → DOC36**. Mesmo padrão
do ciclo corretivo S31-S33.

> **Nota**: os outros pedidos abertos do `SPRINT-33-DOC.md` (alert
> rule Prometheus, mock IBGE, `vistoria.routed`, `assertVistoriador`
> no list, cookie httpOnly, testes Users/Cobertura) ficam para um
> ciclo regular posterior. Esta sprint atende só o pedido novo do
> usuário.

## Entregas deste sprint (QI)

### 1. Documento da integração Nominatim

[`docs/architecture/nominatim-integration.md`](../architecture/nominatim-integration.md):

- Endpoint, params, headers (User-Agent obrigatório), rate-limit
  (1 req/seg).
- Padrão de query e filtros (`class=place` + `type ∈ {suburb,
neighbourhood, quarter, city_district, district}`).
- UX: debounce 350ms, cache 1h, mínimo 2 caracteres, fallback
  gracioso.
- Riscos + alternativas descartadas (Overpass, ViaCEP, Google
  Places, hard-code).
- Alinhamento com a integração IBGE existente.

Source-of-truth para o FE da Sprint 35 e para o ADR-019 do DOC
Sprint 36.

### 2. Critérios de aceitação para o FE (Sprint 35)

| Critério                                                      | Aceite                                                                               |
| ------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| Campo "Bairro" populado por datalist Nominatim                | `<input list="bairros-list">` com `<datalist>` que recebe options da query.          |
| Debounce 350ms antes de disparar Nominatim                    | Hook usa `useEffect` + `setTimeout` ou util. Sem typeahead instantâneo (rate-limit). |
| `enabled` só com `prefix.length >= 2`                         | Tanstack Query não dispara para 0/1 caractere.                                       |
| Cache Tanstack por `(uf, cidade, prefix)` com `staleTime: 1h` | Re-typing mesma string não re-fetch.                                                 |
| Fallback gracioso quando Nominatim falha                      | UI não bloqueia; user pode digitar e submeter livre. Mensagem opcional.              |
| User-Agent identificável no header                            | `User-Agent: vistoria-platform/0.1 (admin@auxiliadorapredial.com.br)`.               |
| Reset do bairro quando cidade muda                            | Igual ao reset que já existe (`setBairro("")` no `onChange` da cidade).              |

### 3. Sem spec E2E nova nesta sprint

Justificativa: Nominatim é **API externa pública** — depender dela
em CI quebra com network/rate-limit/instabilidade. Spec viraria flaky.

A validação acontece via:

- **Manual**: usuário rola `pnpm dev:all` e digita no campo bairro
  (cobertura recém criada).
- **Smoke spec** já existente (`users-cobertura-ui.spec.ts` do
  S26 QI): cobre o fluxo de cadastro de cobertura. O datalist é
  uma melhoria de UX que não afeta o caminho de criação (input
  segue funcionando livre).

Se em algum momento o user pedir cobertura E2E do typeahead,
mockar Nominatim via MSW (route handler que devolve fixture
`[{name: "Centro", address: {suburb: "Centro"}}, ...]`).

### 4. Total Playwright

**Sem mudança**: 38 testes em 11 arquivos (mesmo do S31).

## Para outros agentes

### BE (Sprint 35... espera, no-op) — **NO-OP DECLARADO**

Nominatim é chamado direto do FE. Não há proxy/cache no BE
(plano herdado do IBGE, registrado em `ibge-integration.md`).
Sprint 35 BE é apenas handoff formal — pulado, vai direto pra
FE Sprint 35 (renumerando para refletir o ciclo abreviado).

### IN (Sprint 35... espera, no-op) — **NO-OP DECLARADO**

Nominatim não é parceiro de vistoria. Não toca `packages/integrations`.
Pulado.

### FE (Sprint 35) — caminho de trabalho

```
apps/web/src/
  lib/
    nominatim.ts                   (novo) cliente HTTP + tipos + filtros
  features/cobertura/
    hooks/
      use-nominatim-bairros.ts     (novo) useQuery com debounce + enabled prefix>=2
    components/
      AddCoberturaForm.tsx         (M) campo bairro vira datalist dinâmico
```

Pontos de atenção:

- **Debounce**: implementar com `useEffect` interno no hook ou via
  `useDeferredValue` (React 18+). Não usar lodash — sem dep nova.
- **Cache**: Tanstack `staleTime: 1h`, `gcTime: 24h` para reaproveitar
  resultados próximos.
- **Network errors**: tratar como "sem sugestões" silenciosamente
  (não exibir error UI no campo bairro — fallback livre).
- **Acessibilidade**: manter `aria-label` no input; datalist herda
  semântica nativa.

### DOC (Sprint 36)

- **ADR-019** (novo): Nominatim como source-of-truth de bairros.
  Texto-base no `nominatim-integration.md`. Decisões: typeahead
  via Nominatim (vs Overpass, ViaCEP, Google Places, hard-code);
  sem proxy no BE; fallback gracioso.
- Atualizar `c4-container.md`: container `apps/web` ganha consumo
  de `https://nominatim.openstreetmap.org`.
- Atualizar README raiz: nota no painel admin que "Bairro" tem
  autocomplete via OSM.
- 3 changelogs (S34 QI, S35 FE, S36 DOC).

## Validação executada

| Comando                       | Resultado                                                                                                                                                                                               |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Stack `pnpm dev:all`          | Confirmado UP da iteração anterior (PID turbo `bzc5igenf`).                                                                                                                                             |
| `pnpm playwright test --list` | 38 testes em 11 arquivos (sem mudança).                                                                                                                                                                 |
| Validação API Nominatim       | Manual: `Invoke-WebRequest` em `nominatim.openstreetmap.org/search?q=centro,porto+alegre,rs,brazil&format=jsonv2&addressdetails=1&limit=5` retorna shape esperado (validado para o doc da arquitetura). |

## Próximo Sprint

**Sprint 35 — FE**: implementar `lib/nominatim.ts` + hook + datalist
no `AddCoberturaForm`. Sem dep nova.
