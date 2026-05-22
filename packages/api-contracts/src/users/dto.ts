import { z } from "zod";
import { RoleSchema } from "../auth/login.js";

/** Provider/canal ao qual o vistoriador pertence — espelha o `ProviderId`
 * do `packages/integrations`. Required quando `roles` inclui VISTORIADOR
 * (validado no service do BE). */
export const ProviderIdSchema = z.enum([
  "rede-vistorias",
  "conceitual",
  "interno",
]);
export type ProviderId = z.infer<typeof ProviderIdSchema>;

/**
 * Schemas Zod para gestão de usuários (Sprint 17 BE). Endpoints associados:
 *  - `POST   /api/v1/users`
 *  - `GET    /api/v1/users`
 *  - `GET    /api/v1/users/:id`
 *  - `PATCH  /api/v1/users/:id`
 *  - `DELETE /api/v1/users/:id`
 *
 * Todos exigem JWT com role `ADMIN` ou `GESTOR` e fazem tenant isolation
 * pelo `actor.tenantId` (caller). Senhas nunca cruzam o response.
 */

export const UserSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  email: z.string().email(),
  name: z.string().min(1),
  roles: z.array(RoleSchema),
  active: z.boolean(),
  /** ProviderId do vistoriador. Sprint 22 BE — obrigatório quando `roles`
   * inclui VISTORIADOR. Nullable para legacy users e users com outras roles. */
  providerId: ProviderIdSchema.nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type User = z.infer<typeof UserSchema>;

export const CreateUserRequestSchema = z
  .object({
    email: z.string().email(),
    name: z.string().min(1).max(120),
    password: z.string().min(8).max(72),
    roles: z.array(RoleSchema).min(1),
    /** Obrigatório quando `roles` inclui VISTORIADOR; ignorado caso contrário. */
    providerId: ProviderIdSchema.optional().nullable(),
    active: z.boolean().optional().default(true),
  })
  .refine(
    (input) => !input.roles.includes("VISTORIADOR") || !!input.providerId,
    {
      message: "`providerId` é obrigatório quando `roles` inclui VISTORIADOR.",
      path: ["providerId"],
    },
  );
export type CreateUserRequest = z.infer<typeof CreateUserRequestSchema>;

export const UpdateUserRequestSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  password: z.string().min(8).max(72).optional(),
  roles: z.array(RoleSchema).min(1).optional(),
  providerId: ProviderIdSchema.optional().nullable(),
  active: z.boolean().optional(),
});
export type UpdateUserRequest = z.infer<typeof UpdateUserRequestSchema>;

export const ListUsersQuerySchema = z.object({
  role: RoleSchema.optional(),
  active: z.coerce.boolean().optional(),
  providerId: ProviderIdSchema.optional(),
  q: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
});
export type ListUsersQuery = z.infer<typeof ListUsersQuerySchema>;

export const ListUsersResponseSchema = z.object({
  data: z.array(UserSchema),
  page: z.number().int().positive(),
  pageSize: z.number().int().positive(),
  total: z.number().int().nonnegative(),
});
export type ListUsersResponse = z.infer<typeof ListUsersResponseSchema>;
