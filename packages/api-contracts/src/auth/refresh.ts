import { z } from "zod";
import { AuthUserSchema } from "./login.js";

/**
 * Schemas Zod compartilhados FE↔BE para renovação de tokens.
 *
 * Endpoint correspondente: `POST /api/v1/auth/refresh`. Estratégia
 * stateless (sem persistência); ver `docs/decisions/ADR-014-refresh-token-stateless.md`.
 */
export const RefreshRequestSchema = z.object({
  refresh: z.string().min(20),
});
export type RefreshRequest = z.infer<typeof RefreshRequestSchema>;

export const RefreshResponseSchema = z.object({
  access: z.string().min(20),
  expiresIn: z.string(),
  refresh: z.string().min(20),
  refreshExpiresIn: z.string(),
  user: AuthUserSchema,
});
export type RefreshResponse = z.infer<typeof RefreshResponseSchema>;
