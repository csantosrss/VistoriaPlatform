---
agent: DOC
sprint: "05"
date: 2026-05-19
---

# Handoff — Sprint 05 (DOC) → Sprint 06 (QI)

## Resumo

DOC consolidou a documentação do primeiro ciclo (QI → BE → IN → FE), fechou os 3 diagramas que faltavam no checklist de arquitetura (C4 Context, C4 Container, ERD) e atualizou o `README.md` raiz para refletir o stack como ele roda de fato (`pnpm dev:all`, Postgres em 5433, URLs do Swagger/RabbitMQ/MailHog/Prisma Studio). Nenhuma alteração de código de negócio.

O próximo agente é o **QI**, que reinicia o loop com validação E2E do que existe hoje e endurecimento do CI.

## Entregas

- 3 diagramas Mermaid novos em `docs/architecture/`:
  - `c4-context.md`
  - `c4-container.md`
  - `erd.md`
- `docs/architecture/README.md`: checklist convertido em "Diagramas Vivos", todos marcados.
- `README.md` raiz: bloco "Subir o stack local" + tabela de URLs + diagramas linkados.
- `docs/changelog/SPRINT-05.md`: changelog DOC.
- 4 handoffs anteriores (`SPRINT-01-QI`, `SPRINT-02-BE`, `SPRINT-03-IN`, `SPRINT-04-FE`) validados — sem órfãos ou contradição.

## Pendente Para Outros Agentes

### QI (Sprint 06 — próximo)

1. **Validar E2E do `pnpm dev:all`** contra o stack docker compose: o comando deve subir tudo do zero (sem `.env`, sem volumes, sem dist) e levar API + Web a respondendo. Inclui:
   - `apps/api/.env` precisa existir; documentar a cópia ou automatizar (`postinstall`?).
   - Migration inicial roda; idempotência confirmada num segundo `dev:all`.
2. **CI**: adicionar `pnpm --filter @vistoria/web build` ao pipeline (deve entrar via `turbo run build`, mas confirmar).
3. **Playwright E2E**: smoke test contra `/v1/health` rodando o stack via docker compose no CI.
4. **`VITE_API_BASE_URL`**: provisionar no deploy de produção (rota relativa em dev via proxy do Vite, absoluta em prod).
5. **Decidir** sobre o aviso `MODULE_TYPELESS_PACKAGE_JSON` em `commitlint.config.js` (custo: avaliar impacto de `"type": "module"` na raiz; benefício: silenciar warning a cada commit).
6. **Vigiar** o padrão `@Public()` em controllers — qualquer rota não-autenticada precisa do decorator (caso contrário o `JwtGuard` global retorna 401, como aconteceu inicialmente com Health).

### BE (Sprint 07)

Já listado no handoff do FE (`SPRINT-04-FE.md`); replicado aqui para fechar o loop de consolidação:

1. Endpoints de auth real: `POST /api/v1/auth/login`, `/refresh`, `GET /me` + schemas em `@vistoria/api-contracts/auth`.
2. CRUD de Vistorias: `GET /api/v1/vistorias` (paginação + filtros status/período/parceiro), `GET /:id`, `POST /`, `POST /:id/cancelar`.
3. Endpoint de audit: `GET /api/v1/audit-logs?resourceType=Webhook&provider=...` para alimentar a tela "Webhooks recebidos" do FE.
4. Novas entidades de domínio (Vistoria, VistoriaTransicao, Imovel, Comodo, LaudoItem, ProviderRouting) — cada uma com migration própria, índice `(tenantId, ...)` e ADR se a decisão for não-trivial.

### IN (Sprint 08)

- Implementar webhook handlers de verdade nos providers `RedeVistorias` e `Conceitual` quando os endpoints do BE estiverem disponíveis (atualmente os providers existem como skeleton).
- Salesforce LWC + Apex: continua pendente do plano original; faz sentido aguardar BE estabilizar os endpoints REST.

### FE (Sprint 09)

Sequência já listada no `SPRINT-04-FE.md`:

1. Listagem de Vistorias (filtros + infinite scroll)
2. Detalhe de Vistoria (timeline da SAGA, fotos, laudo)
3. Solicitação de Vistoria (form multi-step mobile-first)
4. Webhooks recebidos
5. Recharts no dashboard
6. Login real + refresh + deep-link
7. Theme toggle
8. i18n (se houver clientes além de pt-BR)

## Known Issues (DOC apenas registra; correção é decisão do QI/BE)

1. **`@Public()` aplicado tardiamente** em `HealthController` (já corrigido por commit `9001ca5`, fora do ciclo DOC). Apontar como item de checklist no template de novo controller.
2. **Boot do `pnpm dev:all`** exigiu vários ajustes fora do escopo de DOC. Todos commitados (`a20ca24`, `4fb7a7c`, `ecc4208`, `8cc1c80`, `7cfc5cf`). Vale uma validação E2E do QI para confirmar que ninguém pisa nessas pedras de novo num clone limpo.
3. **`MODULE_TYPELESS_PACKAGE_JSON`** colateral de Node ao ler `commitlint.config.js`. Não bloqueia commits. QI decide.
4. **Sprint 05 ficou fora da janela original** (planejada para 2026-04-27 segundo o índice do changelog, foi executada em 2026-05-18/19). Sem impacto técnico — apenas registro temporal.

## Decisões Que Viram ADR

Nenhuma decisão arquitetural nova nesta sprint. O agente DOC apenas documenta o que outros agentes decidiram. Os 12 ADRs existentes cobrem o ciclo inteiro.

## Próximo Sprint

**Sprint 06 — QI**: validação E2E + endurecimento de CI conforme detalhado acima.
