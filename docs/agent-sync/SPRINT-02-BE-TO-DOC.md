---
from: BE
to: DOC
sprint: "02"
date: 2026-04-26
topic: "Decisões arquiteturais não-triviais do bootstrap NestJS"
---

# Sync BE → DOC — Sprint 02

Olá DOC. Quatro decisões não-triviais foram tomadas durante o bootstrap do `apps/api`. Material bruto abaixo para você consolidar como ADR-003 a ADR-006.

---

## ADR-003: Prisma como ORM (vs TypeORM)

### Contexto

O backend NestJS precisa de uma camada de acesso ao Postgres com:

- Tipagem estática completa (compile-time safety nos modelos)
- Migrations versionadas e reproduzíveis
- Suporte a multi-tenant via filtros transversais
- Boa DX para queries dinâmicas (filtros opcionais, paginação)
- Comunidade ativa e documentação acessível

### Decisão

**Prisma 5.x.**

### Alternativas Consideradas

- **TypeORM**: padrão histórico no ecossistema NestJS, suporta entities como classes (familiar para desenvolvedores OOP), mas o ecosystem move-se mais lentamente, runtime decorators dificultam tree-shaking e migrations precisam de cuidado para sincronizar com mudanças de entidade.
- **Drizzle**: muito moderno, schema em TS puro, sem code-gen runtime; porém, ainda menos maduro que Prisma, ferramenta de migrations menos consolidada para Postgres com tipos complexos (Json, arrays de enums).
- **Knex / SQL puro**: máximo controle, zero abstração. Inviabiliza tipagem automática e exige boilerplate.

### Consequências

- **Positivas**: schema declarativo (`schema.prisma`), client gerado com tipos completos, `prisma migrate` é determinístico, suporte first-class a multi-tenant via `extends`, Prisma Studio para inspeção em dev.
- **Negativas**: o client é code-generated (build precisa rodar `prisma generate` antes). Queries muito complexas (CTEs, window functions) pedem `$queryRaw`.
- **Riscos**: lock-in moderado — migrar para outro ORM exigiria reescrever queries, mas o schema em si é portável.

### Autor

BE | Sprint S02

---

## ADR-004: JWT RS256 assimétrico (vs HS256 simétrico)

### Contexto

Tokens JWT são consumidos pelo backend (verificação) e podem futuramente ser:

- Validados por gateway/proxy externo sem acesso ao secret de assinatura
- Decodificados por integradores parceiros (read-only)
- Validados por funções edge / serverless

### Decisão

**RS256 (RSA assimétrico, 2048 bits).**

### Alternativas Consideradas

- **HS256**: mais simples, secret único para sign/verify. Mas se o secret vaza, qualquer parte pode forjar tokens. E não permite que terceiros validem tokens sem expor o secret.
- **EdDSA (Ed25519)**: mais rápido e com chaves menores que RSA, mas suporte em libs mais antigas é irregular. Adotaremos no futuro se justificar.

### Consequências

- **Positivas**: chave pública pode ser distribuída livremente. Em comprometimento parcial (servidor backend), só a chave pública vaza — não há risco imediato de forgery.
- **Negativas**: assinatura/verificação ~10x mais lenta que HS256 (irrelevante para nosso volume). Operações de gestão de chave (rotação) são mais complexas.
- **Riscos**: rotação de chave precisa ser planejada (mecanismo de `kid` no header e suporte a múltiplas chaves de verificação).
- **Placeholder**: em dev (NODE_ENV !== 'production'), o módulo gera um par RSA-2048 efêmero em memória se as env vars não forem providas, e loga um warning. Em produção, a falta das chaves derruba o boot.

### Autor

BE | Sprint S02

---

## ADR-005: Zod para validação de env vars (vs class-validator)

### Contexto

Precisamos validar e tipar as env vars na inicialização. Já temos `class-validator` no projeto (DTOs HTTP) — usá-lo para env seria consistente.

### Decisão

**Zod 3.x.**

### Alternativas Consideradas

- **class-validator + class-transformer**: a opção "padrão NestJS". Mas exige criar uma classe `EnvVars` com decorators, instanciar via `plainToInstance`, e o erro de validação não tem mensagens tão claras quanto Zod.
- **joi**: maduro mas API mais verbosa e tipos TS dependem de plugins.

### Consequências

- **Positivas**: schema declarativo conciso (`z.object({...})`), inferência automática para `Env` tipo, mensagens de erro com path. Coerção explícita (`z.coerce.number()`) lida bem com strings vindas de env.
- **Negativas**: introduz uma dep adicional (Zod). Coexiste com class-validator — dois paradigmas no projeto.
- **Riscos**: equipe precisa saber qual usar onde — convenção: **class-validator** para DTOs de request HTTP (integra com `ValidationPipe`), **Zod** para configuração e validações outras.

### Autor

BE | Sprint S02

---

## ADR-006: amqplib direto vs @nestjs/microservices para publisher RMQ

### Contexto

Precisamos publicar eventos no RabbitMQ a partir do backend. Há duas escolas no ecossistema NestJS.

### Decisão

**amqplib 0.10.x** com um `RmqPublisher` próprio em `infrastructure/messaging/`.

### Alternativas Consideradas

- **@nestjs/microservices `ClientProxy` com Transport.RMQ**: integra-se com o framework, expõe `ClientProxy.emit()` e `ClientProxy.send()`, abstrai conexão. Porém, o foco é RPC (req/reply); usar para event-driven com topic exchanges custosamente requer overrides.
- **@golevelup/nestjs-rabbitmq**: lib comunitária poderosa com decorators (`@RabbitSubscribe`), exchanges declarativos e plugin-friendly. Excelente alternativa a considerar quando os subscribers (IN) entrarem.

### Consequências

- **Positivas**: controle total sobre exchange (topic durable), routingKey, persistence, headers. Sem mágica do framework. Curva de aprendizado mínima.
- **Negativas**: cada novo padrão (RPC, work queues) exigirá código próprio. Reconexão automática precisa ser implementada antes de produção.
- **Riscos**: TODO para Sprint 03+: implementar reconexão exponencial, dead-letter queue, observabilidade (métricas Prometheus de publish success/failure).

### Autor

BE | Sprint S02

---

## Solicitação ao DOC

1. Criar `docs/decisions/ADR-003-prisma-vs-typeorm.md`, `ADR-004-jwt-rs256.md`, `ADR-005-zod-vs-class-validator.md`, `ADR-006-amqplib-vs-nestjs-microservices.md` usando `ADR-TEMPLATE.md`
2. Linkar todos no `docs/changelog/SPRINT-02.md` ao consolidar o sprint
3. Sugestão de diagrama Mermaid: `docs/architecture/auth-flow.md` mostrando o fluxo de assinatura/verificação RS256 (com `kid` placeholder para futura rotação)
4. Sugestão de diagrama: `docs/architecture/saga-vistoria.md` (esqueleto da SAGA com 9 estados; código real virá no Sprint 03)
