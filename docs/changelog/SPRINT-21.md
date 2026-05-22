# Sprint 21 — Changelog

**Período**: 2026-05-21
**Agente solo**: QI
**Tema**: Preparação leve para o ciclo de cobertura geográfica + validação pós-ciclo 4.

## Itens entregues

- **`docs/architecture/ibge-integration.md`** — Documenta a integração com a API pública do IBGE (`/localidades`). Endpoints, cache (UFs em `localStorage`, municípios via Tanstack Query `staleTime: 24h`), fallback, alternativas descartadas (ViaCEP, hard-code), riscos de consistência (`Vistoria.enderecoCidade` livre vs cobertura via IBGE).
- **`e2e/users-agenda-ui.spec.ts`** — 2 cenários browser-based:
  1. Login pela UI → "Novo usuário" → criar vistoriador → "Abrir agenda" → cadastrar slot → toggle "Bloquear" inline.
  2. Cria + desativa user; filtro "apenas ativos" some o user; desmarca → reaparece.

Total Playwright: 28 testes (era 26).

## ADRs

Nenhum.

## Próximo sprint

**Sprint 22 — BE**: VistoriadorCobertura + codigoImovelExterno em Vistoria.
