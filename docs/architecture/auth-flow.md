# Fluxo de Autenticação — JWT RS256

Decisão e setup em [ADR-004](../decisions/ADR-004-jwt-rs256.md).

## Sequência: login + chamada autenticada

```mermaid
sequenceDiagram
    participant Web as apps/web
    participant API as apps/api
    participant Auth as AuthService<br/>(BE Sprint 03+)
    participant DB as PostgreSQL
    participant JwtMod as JwtModule (RS256)

    Note over Web,API: Login (placeholder hoje)
    Web->>API: POST /api/v1/auth/login<br/>{ email, password, tenantSlug }
    API->>Auth: validate credentials
    Auth->>DB: SELECT user WHERE tenantId+email
    DB-->>Auth: user + passwordHash
    Auth->>Auth: bcrypt.compare(password, hash)
    Auth->>JwtMod: sign({ sub, tenantId, email, roles })
    JwtMod-->>Auth: accessToken (RS256)
    Auth-->>API: { accessToken, refreshToken, expiresIn }
    API-->>Web: 200 + tokens

    Note over Web,API: Chamada autenticada
    Web->>Web: localStorage.auth.access = accessToken
    Web->>API: GET /api/v1/vistorias<br/>Authorization: Bearer <token>
    API->>JwtMod: verify(token, publicKey)
    JwtMod-->>API: payload válido
    API->>API: JwtGuard popula req.user<br/>RolesGuard valida roles
    API-->>Web: 200 + dados (escopados por tenantId)
```

## Setup das chaves

```mermaid
flowchart TB
    Start[apps/api boot] --> Q1{NODE_ENV=production?}
    Q1 -- Sim --> Q2{JWT_PRIVATE_KEY<br/>e JWT_PUBLIC_KEY<br/>presentes?}
    Q2 -- Não --> Fail[Falha-rápida<br/>validateEnv lança]
    Q2 -- Sim --> UseEnv[Usa as chaves do env]
    Q1 -- Não --> Q3{Chaves<br/>presentes?}
    Q3 -- Sim --> UseEnv
    Q3 -- Não --> Gen[Gera RSA-2048 efêmero<br/>em memória<br/>+ logger.warn]
    UseEnv --> Ready[JwtModule pronto]
    Gen --> Ready
```

## Estrutura do payload

```typescript
interface JwtPayload {
  sub: string; // user id (UUID)
  tenantId: string; // tenant id (UUID)
  email: string;
  roles: Role[]; // ADMIN | GESTOR | VISTORIADOR | CLIENTE | PARCEIRO
  iat?: number;
  exp?: number;
  iss: string; // 'vistoria-platform'
  aud: string; // 'vistoria-api'
}
```

`iss` e `aud` são validados na verificação para evitar reuso de tokens entre sistemas.

## Guards

- `JwtGuard` (registrado como `APP_GUARD` global) — exige Bearer token, popula `req.user`. Respeita `@Public()` para opt-out.
- `RolesGuard` (idem global) — checa `@Roles(...)` na rota; se vazio, libera.
- `@CurrentUser()` decorator extrai o `AuthenticatedUser` do request.

## Pendências

- **Refresh tokens em Redis** com TTL e revogação por logout — BE Sprint 03+
- **Rotação de chaves** com `kid` no header e suporte a múltiplas chaves de verificação simultâneas — produção
- **`localStorage` no FE** é placeholder; mover para httpOnly cookie quando o BE liberar (CSRF mitigado pela própria estratégia de cookie + SameSite=strict)
- **MFA**: roadmap, possivelmente WebAuthn/passkeys
