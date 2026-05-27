# ADR-016: `/metrics` Prometheus exposto sem auth (network policy)

## Status

Aceita

## Contexto

A Sprint 27 BE entregou `GET /metrics` (formato Prometheus text) na
mesma porta do `apps/api`, fora do prefix `/api`. O scraper Prometheus
no docker-compose (Sprint 26 QI) faz pull a cada 15s contra
`host.docker.internal:3000/metrics`.

A questão é: o endpoint deve exigir autenticação? Métricas Prometheus
costumam expor cardinalidade alta (rotas, status codes, latências por
endpoint). Um atacante com acesso ao endpoint consegue inferir
topologia, volume de tráfego, picos de erro — não exfiltra PII, mas
ajuda em reconhecimento.

## Decisão

`/metrics` é **`@Public()` (sem JWT)** em dev. Em produção, o controle
fica na **borda da rede**:

- O endpoint não é exposto no ingress público; só `apps-api` interno
  (mesma rede do scraper) consegue alcançar.
- Reverse proxy / API gateway aplica IP allowlist quando o scraper
  vive em outra subnet (caso de Kubernetes com NetworkPolicy ou
  segurança de cluster gerenciado).

`@ApiExcludeController()` no controller mantém o endpoint fora do
Swagger público — descobribilidade reduzida.

## Alternativas Consideradas

- **Basic-auth dedicado para o scraper** — robusto, mas adiciona
  cred-management (mais um secret a rotacionar). O scraper precisa
  conhecer a senha; vazamento da config do Prometheus expõe a senha.
  Desproporcional dado que o BE não passa PII pelas métricas.
- **mTLS no endpoint** — solução correta em ambientes com service
  mesh (Istio, Linkerd). Para o estágio atual do projeto (Docker
  Compose dev → primeiro deploy gerenciado), overkill. Reabrir se
  formos para service mesh.
- **Token de bearer estático no header** — meio termo entre basic-auth
  e nada. Adiciona pouco vs `@Public()` quando o atacante já está na
  rede; e exige rotação manual.
- **Não expor `/metrics` e fazer push do BE para um Pushgateway** —
  inverte o modelo do Prometheus, perde a "pull-based" simplicity, e
  exige mais infra.

## Consequências

### Positivas

- Zero configuração de auth no scraper — `prometheus.yml` apenas
  aponta o target.
- Padrão de mercado (a maioria das libs `prom-client` para Node/Go
  expõe `/metrics` `@Public`).
- Decisão pode evoluir para basic-auth ou mTLS sem mudar o contrato
  do endpoint — só adicionar middleware.

### Negativas / Riscos

- Atacante com acesso à rede interna consegue inferir topologia.
  Mitigado por **não expor o endpoint no ingress público**.
- Cardinalidade alta nas labels (route + method + status) pode
  permitir inferência fina de tráfego. Aceitável vs custo de auth.
- Se a rede interna for promíscua (cenário de SaaS multi-tenant ou
  pentest dirigido), reabrir esta ADR.

### Pendências

- Ao subir para um ambiente gerenciado, **registrar no runbook** a
  expectativa de NetworkPolicy / IP allowlist.
- Se aparecer endpoint que retorne PII via métricas (improvável, mas
  possível com labels de cliente), reabrir ADR.

## Agente Autor

DOC (consolida decisão tática do BE Sprint 27)

## Data

2026-05-26

## Sprint

S30

## Adendo Sprint 32 BE (path correto)

Na primeira execução do `pnpm dev:all` pós-S30, detectou-se que o
endpoint estava em `/v1/metrics` em vez de `/metrics`. O
`@Controller({ path: "metrics", version: undefined })` não desligava
o `defaultVersion: "1"` global do `main.ts` — apenas
**`VERSION_NEUTRAL`** o faz. Correção entregue em S32 BE; path agora é
`/metrics` puro. Esta ADR continua válida — a decisão arquitetural
(sem auth, via network policy) não muda.

## Referências

- Implementação: [`apps/api/src/metrics/`](../../apps/api/src/metrics/)
- Scrape config: [`infra/prometheus/prometheus.yml`](../../infra/prometheus/prometheus.yml)
- Handoff que originou: [SPRINT-27-BE.md](../handoffs/SPRINT-27-BE.md)
- Correção de path: [SPRINT-32-BE.md](../handoffs/SPRINT-32-BE.md)
