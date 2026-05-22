import { z } from "zod";

/**
 * Schemas Zod para a cobertura geográfica do vistoriador (Sprint 22 BE).
 *
 * Endpoints (sob `ADMIN`/`GESTOR`):
 *  - `GET    /api/v1/users/:id/cobertura`
 *  - `POST   /api/v1/users/:id/cobertura`
 *  - `DELETE /api/v1/users/:id/cobertura/:coberturaId`
 *
 * Hierarquia do match (BE valida redundância no `POST`):
 *  - `(uf, null, null)`         → cobre toda a UF.
 *  - `(uf, cidade, null)`       → cobre toda a cidade.
 *  - `(uf, cidade, bairro)`     → cobre só o bairro.
 *
 * Reject (409) quando a nova é coberta por (ou cobre) uma existente.
 */

export const VistoriadorCoberturaSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  vistoriadorId: z.string().uuid(),
  uf: z.string().length(2),
  cidade: z.string().nullable(),
  bairro: z.string().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type VistoriadorCobertura = z.infer<typeof VistoriadorCoberturaSchema>;

export const CreateCoberturaRequestSchema = z
  .object({
    uf: z.string().length(2),
    cidade: z.string().min(1).max(120).optional().nullable(),
    bairro: z.string().min(1).max(120).optional().nullable(),
  })
  .refine((input) => !(input.bairro && !input.cidade), {
    message: "`bairro` só pode ser informado quando `cidade` está presente.",
    path: ["bairro"],
  });
export type CreateCoberturaRequest = z.infer<
  typeof CreateCoberturaRequestSchema
>;

export const ListCoberturasResponseSchema = z.object({
  data: z.array(VistoriadorCoberturaSchema),
});
export type ListCoberturasResponse = z.infer<
  typeof ListCoberturasResponseSchema
>;
