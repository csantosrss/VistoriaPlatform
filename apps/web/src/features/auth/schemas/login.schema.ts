import { LoginRequestSchema, type LoginRequest } from "@vistoria/api-contracts";

// Re-exporta o schema oficial (BE Sprint 07) para uso direto no RHF.
// FE Sprint 04 mantinha um shape com tenantSlug; BE entregou login sem tenant
// (o tenant vem implícito no usuário). Mantemos o re-export para evitar drift.
export const loginSchema = LoginRequestSchema;
export type LoginInput = LoginRequest;
