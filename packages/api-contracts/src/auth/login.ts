import { z } from "zod";

/**
 * Schemas Zod compartilhados FE↔BE para o módulo de autenticação.
 *
 * Origem: pedido aberto desde o SPRINT-04-FE — `apps/web` consome esses tipos
 * em `features/auth` ao chamar `POST /api/v1/auth/login`.
 */

export const RoleSchema = z.enum([
  "ADMIN",
  "GESTOR",
  "VISTORIADOR",
  "CLIENTE",
  "PARCEIRO",
]);
export type Role = z.infer<typeof RoleSchema>;

export const AuthUserSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  email: z.string().email(),
  name: z.string().min(1),
  roles: z.array(RoleSchema),
});
export type AuthUser = z.infer<typeof AuthUserSchema>;

export const LoginRequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6).max(72),
});
export type LoginRequest = z.infer<typeof LoginRequestSchema>;

export const LoginResponseSchema = z.object({
  access: z.string().min(20),
  expiresIn: z.string(),
  refresh: z.string().min(20),
  refreshExpiresIn: z.string(),
  user: AuthUserSchema,
});
export type LoginResponse = z.infer<typeof LoginResponseSchema>;

export const MeResponseSchema = AuthUserSchema;
export type MeResponse = z.infer<typeof MeResponseSchema>;
